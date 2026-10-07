// Accounts that can sign in to the console and the app. Passwords are never stored: each entry keeps a random salt and a
// PBKDF2-SHA-256 hash (600,000 rounds). To add someone or change a password, open tools/password.html, fill in the form and
// paste the line it makes here (replace the old line for a password change). Removing a line signs that person out everywhere.
// role: supervisor · operator · quality · admin · exec · viewer (what they may do; see README "Sign-in").
export const ITER = 600000;
export const ACCOUNTS = [
  { user: 'r.hakim', name: 'R. Hakim', role: 'supervisor', salt: '0b9a96b49de819c95e10e75666dafb02', hash: 'fdb587ce24479fb276f616eb0a0e23366f63f4287dd2e0a3879e89eb11ba8ca1' },
  { user: 'a.nugroho', name: 'A. Nugroho', role: 'operator', salt: '8dd1a204ad6715c10e37f8ca9a66e006', hash: '65004012195eccd6aad9905b1dbae0ebf77aed580ec6fc5e2bd62929c50e1e8f' },
  { user: 's.wulandari', name: 'S. Wulandari', role: 'quality', salt: 'ecab3461231dca1d724777dec7b8d8e7', hash: '04209f98b18c22403a748b077afcba8893f3ff03f550e70a14d1036428ed8c78' },
  { user: 't.prasetyo', name: 'T. Prasetyo', role: 'admin', salt: '18c55f9b84279279c73cd0300c6a8b0d', hash: '0968b7cad8bd9bdb7be9b4dd064de376f8e3c6b0ac4c7c872c2970b254e4c16e' },
  { user: 'headoffice', name: 'Head office', role: 'viewer', salt: '8feaa4da3ea26b89a72af8f20e3a4521', hash: '31a96259ac898476d81b109cd591a79cdce40ed7d4f3afd05957498d533bffcf' },
  { user: 'stanleycahyono', name: 'Stanley Cahyono', role: 'operator', salt: '82c4174b58fb9c73fe20590c415a9ce3', hash: 'aa617c01955e81fe48609519e5c6bcc2653d5b005f121ea407d89ab8e2c63d97' },
  { user: 'management', name: 'Management', role: 'exec', salt: 'ed1b97c7b05132990bca1155fe21969f', hash: '628fee85b1cdf00fd209e0408e0796ac10da723deac90886cc9a0ba9cdd48e69' },
];
