// Entry: load the live data module, mount the app, register the offline cache.
import { h, bindData } from './kit.js';
const msg = t => { const el = document.getElementById('launch-msg'); if (el) el.textContent = t; };
import('../data.js').then(async D => {
  bindData(D);
  const { App } = await import('./shell.js');
  ReactDOM.createRoot(document.getElementById('root')).render(h(App, { D }));
}).catch(e => { console.error(e); msg('The app could not start. Check your connection and reopen it.'); });
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
