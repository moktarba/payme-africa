/**
 * offlineQueue.js
 * File d'attente locale pour les transactions créées hors connexion.
 * Utilise localStorage (web) — compatible avec le build expo export.
 *
 * Seules les transactions CASH sont admissibles en offline :
 * les paiements mobiles (Wave, Orange Money) nécessitent le réseau.
 */

const QUEUE_KEY = 'payme_offline_queue';

function readQueue() {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeQueue(queue) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // localStorage plein — on ignore
  }
}

/**
 * Ajoute une transaction en file d'attente.
 * @param {Object} payload — même corps que transactionApi.initiate()
 * @param {string} merchantId
 * @returns {string} id local de la transaction en attente
 */
export function enqueue(payload, merchantId) {
  const queue = readQueue();
  const id = `offline_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  queue.push({ id, payload, merchantId, timestamp: new Date().toISOString() });
  writeQueue(queue);
  return id;
}

/**
 * Renvoie toutes les transactions en attente.
 */
export function getQueue() {
  return readQueue();
}

/**
 * Retire un item de la file d'attente (après sync réussie ou abandon).
 */
export function dequeue(id) {
  const queue = readQueue().filter(item => item.id !== id);
  writeQueue(queue);
}

/**
 * Vide toute la file d'attente.
 */
export function clearQueue() {
  localStorage.removeItem(QUEUE_KEY);
}

/**
 * Tente de synchroniser toutes les transactions en attente.
 * Appelle `syncFn(payload)` pour chaque item.
 * @param {Function} syncFn - async (payload) => résultat
 * @returns {{ synced: number, failed: number }}
 */
export async function syncAll(syncFn) {
  const queue = getQueue();
  if (queue.length === 0) return { synced: 0, failed: 0 };

  let synced = 0;
  let failed = 0;

  for (const item of queue) {
    try {
      await syncFn(item.payload);
      dequeue(item.id);
      synced++;
    } catch {
      failed++;
    }
  }
  return { synced, failed };
}
