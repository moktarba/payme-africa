const http = require('http');
const { spawn } = require('child_process');

const APP_URL = process.env.QA_APP_URL || 'http://localhost:8081';
const DEBUG_PORT = Number(process.env.QA_CHROME_PORT || 9360);
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
  const fs = require('fs');
  const chromePath = CHROME_CANDIDATES.find((candidate) => fs.existsSync(candidate));
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
            .filter(({ text, area }) => area > 0 && area < 250000 && text === wanted)
            .sort((a, b) => a.top - b.top || a.area - b.area);
          const target = candidates[0]?.element;
          if (!target) return false;
          target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
          return true;
        })()
      `);
      if (!result) throw new Error(`Element introuvable: ${needle}`);
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
          return normalize(document.body.innerText).includes(normalize(${JSON.stringify(needle)}));
        })()
      `);
      if (!ok) throw new Error(`Texte attendu absent: ${needle}`);
    };

    await browser.send('Runtime.enable');
    await browser.send('Page.enable');
    await browser.send('Page.navigate', { url: APP_URL });
    await wait(7000);

    await clickByText('Historique');
    await wait(1500);
    await clickByText('Confirmé');
    await wait(800);
    await expectText('Confirmé');
    await clickByText('En attente');
    await wait(800);
    await expectText('En attente');
    await clickByText('Annulé');
    await wait(800);
    await expectText('Annulé');

    if (browser.errors.length) throw new Error(browser.errors.join('\n'));
    console.log('QA history OK: filtres Confirmé / En attente / Annulé');
    browser.ws.close();
  } finally {
    chrome.kill();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
