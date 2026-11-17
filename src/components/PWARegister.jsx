import { useEffect } from 'react';

export default function PWARegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.register('/service-worker.js').catch(() => {
      // The website remains fully usable if offline support is unavailable.
    });
  }, []);

  return null;
}
