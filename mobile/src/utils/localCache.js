import { storage } from './storage';

const CACHE_PREFIX = 'cache:';

export async function setCachedValue(key, value) {
  await storage.set(`${CACHE_PREFIX}${key}`, JSON.stringify({
    value,
    cachedAt: new Date().toISOString(),
  }));
}

export async function getCachedValue(key) {
  const raw = await storage.get(`${CACHE_PREFIX}${key}`);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.value === undefined) return null;
    return parsed;
  } catch (_) {
    return null;
  }
}

export function formatCacheAge(cachedAt) {
  if (!cachedAt) return 'donnees non rafraichies';
  const diffMinutes = Math.max(0, Math.round((Date.now() - new Date(cachedAt).getTime()) / 60000));
  if (diffMinutes < 1) return 'donnees recentes non rafraichies';
  if (diffMinutes === 1) return 'donnees d il y a 1 min';
  if (diffMinutes < 60) return `donnees d il y a ${diffMinutes} min`;
  const diffHours = Math.round(diffMinutes / 60);
  return diffHours === 1 ? 'donnees d il y a 1 h' : `donnees d il y a ${diffHours} h`;
}
