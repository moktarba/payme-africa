const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.resolve('mobile/src/services/api.js'), 'utf8');

const requiredSnippets = [
  'HTTP_ERROR_MESSAGES',
  'API_CODE_MESSAGES',
  'getUserMessage',
  'Connexion trop lente. Verifiez le reseau puis reessayez.',
  'Connexion impossible. Verifiez internet puis reessayez.',
  'Votre session a expire. Reconnectez-vous.',
  'Cette transaction ne peut pas etre modifiee dans son etat actuel.',
  'Cette transaction est deja confirmee et ne peut plus etre annulee.',
  'error.userMessage = getUserMessage(error)',
];

const missing = requiredSnippets.filter((snippet) => !source.includes(snippet));

if (missing.length) {
  console.error(`Messages erreur terrain incomplets. Manquants: ${missing.join(', ')}`);
  process.exit(1);
}

console.log('QA api errors OK: messages reseau, session, transaction et rate limit centralises');
