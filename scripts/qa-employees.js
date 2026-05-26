const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');

const APP_URL = process.env.QA_APP_URL || 'http://localhost:8081';
const DEBUG_PORT = Number(process.env.QA_CHROME_PORT || 9400);
const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].filter(Boolean);
const NEW_EMPLOYEE_NAME = `Awa Ndiaye ${Date.now().toString().slice(-4)}`;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getText(path) {
  return new Promise((resolve, reject) => {
    http.get({ host: '127.0.0.1', port: DEBUG_PORT, path }, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => resolve(body));
    }).on('error', reject);
  });
}

async function getJson(path) {
  return JSON.parse(await getText(path));
}

async function waitForChrome() {
  for (let i = 0; i < 40; i += 1) {
    try {
      await getJson('/json/version');
      return;
    } catch (_) {
      await wait(250);
    }
  }
  throw new Error('Chrome headless ne repond pas.');
}

function connect(tab) {
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  let id = 0;
  const pending = new Map();
  const errors = [];

  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      pending.get(message.id)(message);
      pending.delete(message.id);
    }
    if (message.method === 'Runtime.exceptionThrown') {
      errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
    }
    if (message.method === 'Log.entryAdded' && /error/i.test(message.params.entry.level)) {
      errors.push(message.params.entry.text);
    }
  };

  const opened = new Promise((resolve) => { ws.onopen = resolve; });
  const send = (method, params = {}) => new Promise((resolve) => {
    const nextId = ++id;
    pending.set(nextId, resolve);
    ws.send(JSON.stringify({ id: nextId, method, params }));
  });

  return { ws, opened, send, errors };
}

async function assertAppAvailable() {
  await new Promise((resolve, reject) => {
    http.get(APP_URL, (res) => {
      res.resume();
      if (res.statusCode >= 200 && res.statusCode < 400) resolve();
      else reject(new Error(`App indisponible: HTTP ${res.statusCode}`));
    }).on('error', () => reject(new Error(`App indisponible: ${APP_URL}. Lancez npm run ui:demo.`)));
  });
}

async function main() {
  const chromePath = CHROME_CANDIDATES.find((candidate) => fs.existsSync(candidate));
  if (!chromePath) throw new Error('Chrome ou Edge est introuvable. Definissez CHROME_PATH pour lancer la QA.');

  await assertAppAvailable();
  const chrome = spawn(chromePath, [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--disable-extensions',
    `--remote-debugging-port=${DEBUG_PORT}`,
    'about:blank',
  ], { stdio: 'ignore' });

  try {
    await waitForChrome();
    const tab = (await getJson('/json/list')).find((item) => item.type === 'page');
    const browser = connect(tab);
    await browser.opened;

    const evaluate = async (expression) => {
      const result = await browser.send('Runtime.evaluate', { expression, returnByValue: true });
      return result.result?.result?.value;
    };

    const clickByText = async (needle) => {
      const result = await evaluate(`
        (() => {
          const normalize = (value) => String(value || '')
            .normalize('NFKD')
            .replace(/[\\u0300-\\u036f]/g, '')
            .replace(/[^a-zA-Z0-9]+/g, ' ')
            .trim()
            .toLowerCase();
          const wanted = normalize(${JSON.stringify(needle)});
          const candidates = [...document.querySelectorAll('*')]
            .map((element) => {
              const text = normalize(element.innerText || element.textContent);
              const rect = element.getBoundingClientRect();
              return { element, text, area: rect.width * rect.height, top: rect.top };
            })
            .filter(({ text, area }) => area > 0 && area < 250000 && (text === wanted || text.includes(wanted)))
            .sort((a, b) => {
              const exact = Number(b.text === wanted) - Number(a.text === wanted);
              if (exact) return exact;
              return a.top - b.top || a.area - b.area;
            });
          const target = candidates[0]?.element;
          if (!target) return { ok: false, visible: (document.body.innerText || '').slice(0, 800) };
          target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
          return { ok: true };
        })()
      `);
      if (!result?.ok) throw new Error(`Element introuvable: ${needle}\n${result?.visible || ''}`);
    };

    const clickByTextMouse = async (needle) => {
      const rect = await evaluate(`
        (() => {
          const normalize = (value) => String(value || '')
            .normalize('NFKD')
            .replace(/[\\u0300-\\u036f]/g, '')
            .replace(/[^a-zA-Z0-9]+/g, ' ')
            .trim()
            .toLowerCase();
          const wanted = normalize(${JSON.stringify(needle)});
          const candidates = [...document.querySelectorAll('*')]
            .map((element) => {
              const text = normalize(element.innerText || element.textContent);
              const rect = element.getBoundingClientRect();
              return { element, text, area: rect.width * rect.height, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
            })
            .filter(({ text, area }) => area > 0 && area < 250000 && (text === wanted || text.includes(wanted)))
            .sort((a, b) => {
              const exact = Number(b.text === wanted) - Number(a.text === wanted);
              if (exact) return exact;
              return a.area - b.area;
            });
          const target = candidates[0];
          if (!target) return null;
          target.element.scrollIntoView({ block: 'center', inline: 'center' });
          let clickable = target.element;
          for (let i = 0; i < 6; i += 1) {
            if (!clickable.parentElement) break;
            if (clickable.getAttribute('role') === 'button' || clickable.tabIndex >= 0) break;
            clickable = clickable.parentElement;
          }
          clickable.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
          const rect = clickable.getBoundingClientRect();
          return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        })()
      `);
      if (!rect) throw new Error(`Element introuvable: ${needle}`);
      await browser.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: rect.x, y: rect.y });
      await browser.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: rect.x, y: rect.y, button: 'left', clickCount: 1 });
      await browser.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: rect.x, y: rect.y, button: 'left', clickCount: 1 });
    };

    const fillByPlaceholder = async (placeholder, value) => {
      const result = await evaluate(`
        (() => {
          const wanted = ${JSON.stringify(placeholder)};
          const value = ${JSON.stringify(value)};
          const input = [...document.querySelectorAll('input, textarea')]
            .find((element) => String(element.getAttribute('placeholder') || '').includes(wanted));
          if (!input) return { ok: false, visible: (document.body.innerText || document.body.textContent || '').slice(0, 800) };
          const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), 'value')?.set;
          if (setter) setter.call(input, value);
          else input.value = value;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
          return { ok: true };
        })()
      `);
      if (!result?.ok) throw new Error(`Champ introuvable: ${placeholder}\n${result?.visible || ''}`);
    };

    const expectText = async (needle) => {
      const ok = await evaluate(`
        (() => {
          const normalize = (value) => String(value || '')
            .normalize('NFKD')
            .replace(/[\\u0300-\\u036f]/g, '')
            .replace(/[^a-zA-Z0-9]+/g, ' ')
            .trim()
            .toLowerCase();
          return normalize(document.body.innerText || document.body.textContent).includes(normalize(${JSON.stringify(needle)}));
        })()
      `);
      if (!ok) {
        const text = await evaluate('(document.body.innerText || document.body.textContent || "").slice(0, 1000)');
        throw new Error(`Texte attendu absent: ${needle}\n${text}\n${browser.errors.join('\n')}`);
      }
    };

    const expectNoText = async (needle) => {
      const ok = await evaluate(`
        (() => {
          const normalize = (value) => String(value || '')
            .normalize('NFKD')
            .replace(/[\\u0300-\\u036f]/g, '')
            .replace(/[^a-zA-Z0-9]+/g, ' ')
            .trim()
            .toLowerCase();
          return !normalize(document.body.innerText || document.body.textContent).includes(normalize(${JSON.stringify(needle)}));
        })()
      `);
      if (!ok) throw new Error(`Texte inattendu present: ${needle}`);
    };

    const clickActionNearText = async (anchor, action) => {
      const result = await evaluate(`
        (() => {
          const normalize = (value) => String(value || '')
            .normalize('NFKD')
            .replace(/[\\u0300-\\u036f]/g, '')
            .replace(/[^a-zA-Z0-9]+/g, ' ')
            .trim()
            .toLowerCase();
          const anchorText = normalize(${JSON.stringify(anchor)});
          const actionText = normalize(${JSON.stringify(action)});
          const anchorEl = [...document.querySelectorAll('*')]
            .filter((element) => normalize(element.innerText || element.textContent).includes(anchorText))
            .sort((a, b) => (a.getBoundingClientRect().height * a.getBoundingClientRect().width) - (b.getBoundingClientRect().height * b.getBoundingClientRect().width))[0];
          if (!anchorEl) return { ok: false, reason: 'anchor' };
          let scope = anchorEl;
          for (let i = 0; i < 6; i += 1) {
            const candidates = [...scope.querySelectorAll('*')]
              .filter((element) => normalize(element.innerText || element.textContent) === actionText)
              .sort((a, b) => {
                const ar = a.getBoundingClientRect();
                const br = b.getBoundingClientRect();
                return (ar.width * ar.height) - (br.width * br.height);
              });
            if (candidates[0]) {
              candidates[0].dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
              return { ok: true };
            }
            if (!scope.parentElement) break;
            scope = scope.parentElement;
          }
          return { ok: false, reason: 'action', visible: (document.body.innerText || '').slice(0, 1000) };
        })()
      `);
      if (!result?.ok) throw new Error(`Action introuvable: ${action} pres de ${anchor}\n${result?.visible || result?.reason || ''}`);
    };

    const clickButtonByText = async (needle) => {
      const result = await evaluate(`
        (() => {
          const normalize = (value) => String(value || '')
            .normalize('NFKD')
            .replace(/[\\u0300-\\u036f]/g, '')
            .replace(/[^a-zA-Z0-9]+/g, ' ')
            .trim()
            .toLowerCase();
          const wanted = normalize(${JSON.stringify(needle)});
          const button = [...document.querySelectorAll('button')]
            .find((element) => normalize(element.innerText || element.textContent).includes(wanted));
          if (!button) return { ok: false, visible: (document.body.innerText || '').slice(0, 1000) };
          button.scrollIntoView({ block: 'center', inline: 'center' });
          button.click();
          return { ok: true };
        })()
      `);
      if (!result?.ok) throw new Error(`Bouton introuvable: ${needle}\n${result?.visible || ''}`);
    };

    await browser.send('Runtime.enable');
    await browser.send('Log.enable');
    await browser.send('Page.enable');
    await browser.send('Page.navigate', { url: APP_URL });
    await wait(7000);

    await clickByText('Profil');
    await wait(1200);
    await expectText('Gerer les employes');
    await clickByText('Ouvrir');
    await wait(1500);
    await expectText('Equipe');
    await expectText('Fatou Sow');
    await expectText('Ibrahima Diallo');

    await clickByText('Ajouter');
    await wait(800);
    await fillByPlaceholder('Fatou Sow', NEW_EMPLOYEE_NAME);
    await fillByPlaceholder('+221', '+221770000003');
    await fillByPlaceholder('1234', '2468');
    await fillByPlaceholder('50000', '60000');
    await clickByText('Creer employe');
    await wait(1200);
    await expectText(NEW_EMPLOYEE_NAME);
    await expectText('3');

    await clickByText('PIN');
    await wait(800);
    await fillByPlaceholder('1234', '1357');
    await clickByText('Definir le PIN');
    await wait(1000);
    await expectText('PIN defini');

    if (browser.errors.length) {
      throw new Error(`Erreurs console detectees:\n${browser.errors.join('\n')}`);
    }

    console.log('QA employees OK: acces profil -> creation employe -> PIN');
    browser.ws.close();
  } finally {
    chrome.kill();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
