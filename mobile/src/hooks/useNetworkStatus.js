/**
 * useNetworkStatus.js
 * Hook React pour surveiller l'état réseau via l'API Web native.
 * Compatible avec le build expo export → web.
 */

import { useState, useEffect } from 'react';

/**
 * Retourne { isOnline: boolean }
 * Se met à jour automatiquement quand le réseau change.
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline  = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    if (typeof window !== 'undefined') {
      window.addEventListener('online',  handleOnline);
      window.addEventListener('offline', handleOffline);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('online',  handleOnline);
        window.removeEventListener('offline', handleOffline);
      }
    };
  }, []);

  return { isOnline };
}
