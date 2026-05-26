const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');

const APP_URL = process.env.QA_APP_URL || 'http://localhost:8081';
const DEBUG_PORT = Number(process.env.QA_CHROME_PORT || 9361);
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
    if (message.method === 'Runtime.consoleAPICalled' && /error|warning/i.test(message.params.type)) {
      errors.push(message.params.args.map((arg) => arg.description || arg.value || arg.type).join(' '));
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

async function main() {
  const chromePath = CHROME_CANDIDATES.find((candidate) => candidate && fs.existsSync(candidate));
  if (!chromePath) throw new Error('Chrome ou Edge est introuvable.');

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
    const tabs = await getJson('/json/list');
    const tab = tabs.find((item) => item.type === 'page');
    const browser = connect(tab);
    await browser.opened;

    const evaluate = async (expression) => {
      const result = await browser.send('Runtime.evaluate', { expression, returnByValue: true });
      return result.result?.result?.value;
    };

    const clickByTestId = async (testId) => {
      const result = await evaluate(`
        (() => {
          const target = document.querySelector('[data-testid="${testId}"]');
          if (!target) return { ok: false, visible: document.body.innerText.slice(0, 700) };
          target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
          return { ok: true };
        })()
      `);
      if (!result?.ok) throw new Error(`Element introuvable: ${testId}\n${result?.visible || ''}`);
    };

    const clickKeysFast = async (testIds) => {
      const result = await evaluate(`
        (() => {
          const ids = ${JSON.stringify(testIds)};
          const missing = [];
          ids.forEach((testId) => {
            const target = document.querySelector('[data-testid="' + testId + '"]');
            if (!target) {
              missing.push(testId);
              return;
            }
            target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
          });
          return { ok: missing.length === 0, missing, visible: document.body.innerText.slice(0, 700) };
        })()
      `);
      if (!result?.ok) throw new Error(`Touches introuvables: ${(result?.missing || []).join(', ')}\n${result?.visible || ''}`);
    };

    const clickByText = async (needle) => {
      const result = await evaluate(`
        (() => {
          const wanted = ${JSON.stringify(needle)};
          const candidates = [...document.querySelectorAll('*')]
            .map((element) => ({ element, text: (element.innerText || element.textContent || '').trim(), rect: element.getBoundingClientRect() }))
            .filter(({ text, rect }) => text === wanted && rect.width > 0 && rect.height > 0)
            .sort((a, b) => (a.rect.width * a.rect.height) - (b.rect.width * b.rect.height));
          const target = candidates[0]?.element;
          if (!target) return { ok: false, visible: document.body.innerText.slice(0, 700) };
          const clickable = target.closest('[role="button"]') || target.parentElement || target;
          clickable.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
          return { ok: true };
        })()
      `);
      if (!result?.ok) throw new Error(`Element introuvable: ${needle}\n${result?.visible || ''}`);
    };

    const expectText = async (needle) => {
      const ok = await evaluate(`document.body.innerText.includes(${JSON.stringify(needle)})`);
      if (!ok) {
        const text = await evaluate('document.body.innerText.slice(0, 900)');
        const consoleErrors = browser.errors.length ? `\n\nErreurs console:\n${browser.errors.join('\n')}` : '';
        throw new Error(`Texte attendu absent: ${needle}\n${text}${consoleErrors}`);
      }
    };

    const expectTestIdCompactText = async (testId, needle) => {
      const ok = await evaluate(`
        (() => {
          const target = document.querySelector('[data-testid="${testId}"]');
          if (!target) return false;
          return (target.innerText || target.textContent || '').replace(/[\\s\\u00a0\\u202f]/g, '').includes(${JSON.stringify(needle.replace(/\s/g, ''))});
        })()
      `);
      if (!ok) {
        const text = await evaluate('document.body.innerText.slice(0, 900)');
        const consoleErrors = browser.errors.length ? `\n\nErreurs console:\n${browser.errors.join('\n')}` : '';
        throw new Error(`Texte attendu absent dans ${testId}: ${needle}\n${text}${consoleErrors}`);
      }
    };

    const expectKeypadAmount = async (needle) => {
      await wait(350);
      await expectTestIdCompactText('amount-display-value', needle);
    };

    await browser.send('Runtime.enable');
    await browser.send('Log.enable');
    await browser.send('Page.enable');
    await browser.send('Page.navigate', { url: APP_URL });
    await wait(6000);

    await clickByText('Encaisser');
    await wait(1200);
    await expectText('Facture a encaisser');

    await clickKeysFast(['keypad-key-1', 'keypad-key-2', 'keypad-key-3']);
    await expectKeypadAmount('123 FCFA');
    await clickByTestId('keypad-key-backspace');
    await expectKeypadAmount('12 FCFA');
    await clickByTestId('keypad-key-000');
    await expectKeypadAmount('12 000 FCFA');
    await clickByTestId('keypad-key-clear');
    await expectKeypadAmount('0 FCFA');
    await clickByTestId('keypad-key-000');
    await expectKeypadAmount('0 FCFA');

    await clickKeysFast(['keypad-key-9', 'keypad-key-9', 'keypad-key-9', 'keypad-key-9', 'keypad-key-9', 'keypad-key-9', 'keypad-key-9', 'keypad-key-9']);
    await expectKeypadAmount('9 999 999 FCFA');
    await clickByTestId('keypad-key-9');
    await expectKeypadAmount('9 999 999 FCFA');
    await clickByTestId('keypad-key-clear');

    await clickByTestId('keypad-key-1');
    await wait(250);
    await clickByTestId('keypad-key-plus');
    await wait(250);
    await clickByTestId('keypad-key-5');
    await wait(250);
    await expectKeypadAmount('6 FCFA');
    await expectText('Montants libres');

    if (browser.errors.length) {
      throw new Error(`Erreurs console detectees:\n${browser.errors.join('\n')}`);
    }

    console.log('QA keypad OK: clics rapides, retour, 000, limite max, addition libre et ecran non blanc');
    browser.ws.close();
  } finally {
    chrome.kill();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
