// Sign-in shared by the console and the app. A session is kept in this browser until it expires or the person signs out.
// The check runs in the browser: it keeps people out of the screens, not out of the files (see README "Sign-in").
import { ACCOUNTS, ITER } from './accounts.js';
const KEY = 'tnops:session', FAILS = 'tnops:signin-fails', HOUR = 3600000;
export const ROLE_LABEL = { supervisor: 'Shift supervisor', operator: 'Terminal operator', quality: 'Quality officer', admin: 'Configuration admin', viewer: 'Viewer · read only' };
const read = k => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
const write = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
const norm = u => String(u || '').trim().toLowerCase();
const hex = buf => Array.from(new Uint8Array(buf), b => b.toString(16).padStart(2, '0')).join('');
const unhex = s => new Uint8Array((s.match(/../g) || []).map(x => parseInt(x, 16)));

// the signed-in person, or null
export function session() {
  const s = read(KEY); if (!s || !s.user || !(s.exp > Date.now())) return null;
  const a = ACCOUNTS.find(x => x.user === s.user); if (!a) return null;
  return { user: a.user, name: a.name, role: a.role, roleLabel: ROLE_LABEL[a.role] || a.role, exp: s.exp, keep: !!s.keep };
}
export async function hash(password, saltHex, iter = ITER) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: unhex(saltHex), iterations: iter }, key, 256));
}
// seconds to wait before the next try (after five wrong passwords in a row)
export function waitSeconds() { const f = read(FAILS); return f && f.until > Date.now() ? Math.ceil((f.until - Date.now()) / 1000) : 0; }
// resolves to the session, or throws an Error whose message is shown to the person
export async function signIn(user, password, keep) {
  const w = waitSeconds(); if (w) throw new Error(`Too many attempts. Try again in ${w} s.`);
  if (!norm(user) || !password) throw new Error('Enter your username and password.');
  if (!(window.crypto && crypto.subtle)) throw new Error('Sign-in needs a secure (https) connection.');
  const a = ACCOUNTS.find(x => x.user === norm(user));
  const h = await hash(password, a ? a.salt : '00000000000000000000000000000000'); // same work for unknown names
  if (!a || h !== a.hash) {
    const f = read(FAILS) || { n: 0 }, n = f.until && f.until <= Date.now() ? 1 : f.n + 1;
    write(FAILS, n >= 5 ? { n: 0, until: Date.now() + 30000 } : { n });
    throw new Error(n >= 5 ? 'Too many attempts. Try again in 30 s.' : 'Username or password is not right.');
  }
  write(FAILS, null);
  write(KEY, { user: a.user, exp: Date.now() + (keep ? 30 * 24 : 12) * HOUR, keep: !!keep });
  return session();
}
export function signOut() { write(KEY, null); }
// where a page that needs sign-in sends people: the console's sign-in page, coming back here afterwards
export function loginUrl(base = '') { return `${base}login.html?next=${encodeURIComponent(location.pathname.split('/').pop() + location.search + location.hash)}`; }
