// Sign-in screen of the app. Uses the same accounts and session as the console (../auth.js), so signing in once covers both.
import { h, useState, useEffect, useRef, ic, haptic, cx } from './kit.js';
import { signIn, waitSeconds } from '../auth.js';

export function Login({ onSignedIn }) {
  const last = (() => { try { return localStorage.getItem('tnops:last-user') || ''; } catch (e) { return ''; } })();
  const [user, setUser] = useState(last), [pass, setPass] = useState(''), [keep, setKeep] = useState(true), [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false), [err, setErr] = useState(''), [wait, setWait] = useState(waitSeconds());
  const uRef = useRef(null), pRef = useRef(null);
  useEffect(() => { (last ? pRef : uRef).current && (last ? pRef : uRef).current.focus({ preventScroll: true }); }, []);
  useEffect(() => { if (!wait) return; const t = setTimeout(() => setWait(waitSeconds()), 1000); return () => clearTimeout(t); }, [wait]);
  // the theme follows the phone until the app's own setting takes over after sign-in
  useEffect(() => { let t = 'system'; try { t = (JSON.parse(localStorage.getItem('tnops:app')) || {}).theme || 'system'; } catch (e) {}
    if (t === 'system') t = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; document.documentElement.dataset.theme = t; }, []);
  const submit = async e => {
    e.preventDefault(); if (busy || wait) return; setErr(''); setBusy(true);
    try { const s = await signIn(user, pass, keep); try { localStorage.setItem('tnops:last-user', s.user); } catch (x) {} haptic(10); onSignedIn(s); }
    catch (x) { haptic([12, 60, 12]); setErr(x.message); setPass(''); setBusy(false); setWait(waitSeconds()); if (pRef.current) pRef.current.focus(); }
  };
  return h('div', { className: 'login' },
    h('form', { className: 'login-in', onSubmit: submit, noValidate: true },
      h('div', { className: 'login-head' }, h('img', { src: 'icons/icon-192.png', alt: '' }), h('h1', null, 'Terminal Network'), h('p', null, 'Sign in with the username and password your administrator gave you.')),
      err ? h('div', { className: 'login-err', role: 'alert' }, ic('warn', 18, { w: 2.2 }), h('span', null, err)) : null,
      h('div', { className: 'grp login-grp' },
        h('label', { className: 'login-row' }, h('span', null, 'Username'), h('input', { ref: uRef, type: 'text', value: user, onChange: x => setUser(x.target.value), autoComplete: 'username', autoCapitalize: 'none', autoCorrect: 'off', spellCheck: false, enterKeyHint: 'next', placeholder: 'e.g. r.hakim', 'aria-label': 'Username' })),
        h('label', { className: 'login-row' }, h('span', null, 'Password'), h('input', { ref: pRef, type: show ? 'text' : 'password', value: pass, onChange: x => setPass(x.target.value), autoComplete: 'current-password', enterKeyHint: 'go', placeholder: 'Required', 'aria-label': 'Password' }),
          h('button', { type: 'button', className: 'login-eye', onClick: () => setShow(!show), 'aria-label': show ? 'Hide password' : 'Show password', 'aria-pressed': show ? 'true' : 'false' }, ic('eye', 20, { w: 2 }))),
        h('button', { type: 'button', className: 'login-row login-keep', role: 'switch', 'aria-checked': keep ? 'true' : 'false', onClick: () => { haptic(4); setKeep(!keep); } },
          h('span', null, 'Keep me signed in', h('small', null, keep ? 'For 30 days on this phone' : 'For 12 hours')), h('span', { className: 'switch', 'aria-hidden': true, 'aria-checked': keep ? 'true' : 'false' }, h('i')))),
      h('button', { type: 'submit', className: cx('btn primary login-go', busy && 'busy'), disabled: busy || !!wait }, busy ? h('span', { className: 'spin login-spin', 'aria-hidden': true }) : null, wait ? `Try again in ${wait} s` : busy ? 'Signing in…' : 'Sign in'),
      h('p', { className: 'login-foot' }, 'Forgot your password? Ask your configuration admin.'),
      h('a', { className: 'login-link', href: '../Terminal%20Network.dc.html?console' }, 'Open the desktop console')));
}
