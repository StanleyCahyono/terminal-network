// Entry: load the live data module, mount the app, register the offline cache.
import { h, bindData, useState } from './kit.js';
const msg = t => { const el = document.getElementById('launch-msg'); if (el) el.textContent = t; };
import('../data.js').then(async D => {
  bindData(D);
  const [{ App }, A, { Login }] = await Promise.all([import('./shell.js'), import('../auth.js'), import('./login.js')]);
  // the sign-in screen until there is a session, then the app as that person (role and name come from the account)
  function Root() {
    const [ses, setSes] = useState(A.session);
    return ses ? h(App, { key: ses.user, D, ses, onSignOut: () => { A.signOut(); setSes(null); } }) : h(Login, { onSignedIn: setSes });
  }
  ReactDOM.createRoot(document.getElementById('root')).render(h(Root));
}).catch(e => { console.error(e); msg('The app could not start. Check your connection and reopen it.'); });
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
