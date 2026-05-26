const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');

const APP_URL = process.env.QA_APP_URL || 'http://localhost:8081';
const DEBUG_PORT = Number(process.env.QA_CHROME_PORT || 9380);
const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].filter(Boolean);

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
          if (!target) return { ok: false, visible: (document.body.innerText || '').slice(0, 600) };
          target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
          return { ok: true };
        })()
      `);
      if (!result?.ok) throw new Error(`Element introuvable: ${needle}\n${result?.visible || ''}`);
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
        const text = await evaluate('(document.body.innerText || document.body.textContent || "").slice(0, 900)');
        throw new Error(`Texte attendu absent: ${needle}\n${text}\n${browser.errors.join('\n')}`);
      }
    };

    await browser.send('Runtime.enable');
    await browser.send('Log.enable');
    await browser.send('Page.enable');
    await browser.send('Page.navigate', { url: APP_URL });
    await wait(7000);

    await expectText('Boutique Aminata');
    await clickByText('Profil');
    await wait(1500);
    await expectText('Moyens de paiement');
    await expectText('Actifs');
    await expectText('3/3');
    await expectText('Orange Money');

    await clickByText('Desactiver Orange Money');
    await wait(1000);
    await expectText('2/3');
    await expectText('Activer Orange Money');

    await clickByText('Activer Orange Money');
    await wait(1000);
    await expectText('3/3');
    await expectText('Desactiver Orange Money');

    if (browser.errors.length) {
      throw new Error(`Erreurs console detectees:\n${browser.errors.join('\n')}`);
    }

    console.log('QA profile OK: profil marchand -> toggle moyen de paiement');
    browser.ws.close();
  } finally {
    chrome.kill();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
