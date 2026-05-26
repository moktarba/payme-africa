const fs = require('fs');
const path = require('path');

const files = {
  queue: fs.readFileSync(path.resolve('mobile/src/utils/offlineQueue.js'), 'utf8'),
  checkout: fs.readFileSync(path.resolve('mobile/src/screens/main/EncaissementScreen.js'), 'utf8'),
  home: fs.readFileSync(path.resolve('mobile/src/screens/main/HomeScreen.js'), 'utf8'),
  history: fs.readFileSync(path.resolve('mobile/src/screens/main/HistoryScreen.js'), 'utf8'),
  cache: fs.readFileSync(path.resolve('mobile/src/utils/localCache.js'), 'utf8'),
};

const checks = [
  [files.queue, 'OFFLINE_QUEUE_KEY'],
  [files.queue, 'enqueueOfflineCashTransaction'],
  [files.queue, 'markOfflineCashSynced'],
  [files.queue, 'markOfflineCashFailed'],
  [files.queue, 'removeOfflineCashTransaction'],
  [files.checkout, "selectedProvider === 'cash' && err.errorCode === 'ERREUR_RESEAU'"],
  [files.checkout, 'Vente gardee en local'],
  [files.home, 'getOfflineCashQueue'],
  [files.home, 'syncOfflineCash'],
  [files.home, 'A synchroniser'],
  [files.home, 'offlineQueue.slice(0, 3).map'],
  [files.home, 'offlineFailedCount'],
  [files.home, 'lastError'],
  [files.home, 'removeOfflineCash'],
  [files.home, 'onLongPress={() => removeOfflineCash(item)}'],
  [files.home, 'clientReference: item.clientReference'],
  [files.cache, 'setCachedValue'],
  [files.cache, 'getCachedValue'],
  [files.cache, 'formatCacheAge'],
  [files.home, "setCachedValue('homeSnapshot'"],
  [files.home, "getCachedValue('homeSnapshot'"],
  [files.history, "setCachedValue('historySnapshot'"],
  [files.history, "getCachedValue('historySnapshot'"],
  [files.history, 'cacheBanner'],
];

const missing = checks
  .filter(([source, snippet]) => !source.includes(snippet))
  .map(([, snippet]) => snippet);

if (missing.length) {
  console.error(`Offline basique incomplet. Manquants: ${missing.join(', ')}`);
  process.exit(1);
}

console.log('QA offline OK: queue cash locale, clientReference persistante et sync accueil cablees');
