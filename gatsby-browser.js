/**
 * Implement Gatsby's Browser APIs in this file.
 *
 * See: https://www.gatsbyjs.org/docs/browser-apis/
 */

exports.onClientEntry = () => {
  if (process.env.NODE_ENV !== 'development' || typeof window === 'undefined') {
    return;
  }

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      registrations.forEach(registration => {
        registration.unregister();
      });
    });
  }

  if ('caches' in window) {
    window.caches.keys().then(cacheNames => {
      cacheNames.forEach(cacheName => {
        window.caches.delete(cacheName);
      });
    });
  }
};
