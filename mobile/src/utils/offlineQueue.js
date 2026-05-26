import { storage } from './storage';

const OFFLINE_QUEUE_KEY = 'offlineCashQueue';

async function readQueue() {
  const raw = await storage.get(OFFLINE_QUEUE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

async function writeQueue(queue) {
  await storage.set(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
}

export async function getOfflineCashQueue() {
  return readQueue();
}

export async function enqueueOfflineCashTransaction(payload) {
  const queue = await readQueue();
  const existing = queue.find((item) => item.clientReference === payload.clientReference);
  if (existing) return existing;

  const queued = {
    id: `offline-${payload.clientReference}`,
    status: 'queued',
    createdAt: new Date().toISOString(),
    attempts: 0,
    lastError: null,
    ...payload,
    paymentProvider: 'cash',
  };

  await writeQueue([queued, ...queue]);
  return queued;
}

export async function markOfflineCashSynced(clientReference) {
  const queue = await readQueue();
  await writeQueue(queue.filter((item) => item.clientReference !== clientReference));
}

export async function removeOfflineCashTransaction(clientReference) {
  const queue = await readQueue();
  await writeQueue(queue.filter((item) => item.clientReference !== clientReference));
}

export async function markOfflineCashFailed(clientReference, message) {
  const queue = await readQueue();
  await writeQueue(queue.map((item) => (
    item.clientReference === clientReference
      ? {
          ...item,
          attempts: Number(item.attempts || 0) + 1,
          lastError: message || 'Synchronisation impossible pour le moment.',
        }
      : item
  )));
}
