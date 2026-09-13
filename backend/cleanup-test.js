const BASE = 'http://localhost:5000/api';
let token = '';
async function req(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}
(async () => {
  let l = await req('POST', '/auth/login', { email: 'admin@biller.com', password: 'admin123' });
  token = l.token;
  const [companies, items, parties, purchases, expenses, payments, invoices] = await Promise.all([
    req('GET', '/companies'), req('GET', '/items'), req('GET', '/parties'),
    req('GET', '/purchases'), req('GET', '/expenses'), req('GET', '/payments'), req('GET', '/invoices'),
  ]);
  for (const i of invoices.invoices || []) await req('DELETE', `/invoices/${i._id}`);
  for (const p of purchases) await req('DELETE', `/purchases/${p._id}`);
  for (const e of expenses) await req('DELETE', `/expenses/${e._id}`);
  for (const p of payments) await req('DELETE', `/payments/${p._id}`);
  for (const p of parties) await req('DELETE', `/parties/${p._id}`);
  for (const i of items) await req('DELETE', `/items/${i._id}`);
  for (const c of companies) await req('DELETE', `/companies/${c._id}`);
  console.log('✅ Test data cleaned. (admin user kept)');
})().catch((e) => { console.error('cleanup error', e.message); process.exit(1); });