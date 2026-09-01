import app from '../src/app.js';

const PORT = 3100;
const BASE = `http://localhost:${PORT}/api`;

let passed = 0;
let failed = 0;

function check(name, cond, extra = '') {
  if (cond) {
    passed++;
    console.log(`PASS: ${name}${extra ? ' — ' + extra : ''}`);
  } else {
    failed++;
    console.log(`FAIL: ${name}${extra ? ' — ' + extra : ''}`);
  }
}

async function api(method, path, { token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch {}
  return { status: res.status, json };
}

const server = app.listen(PORT, async () => {
  console.log('=== API E2E Test ===');
  try {
    // 1. login admin
    const login = await api('POST', '/auth/login', { body: { username: 'admin', password: 'admin123' } });
    check('login admin returns 200', login.status === 200, `status=${login.status}`);
    check('login returns token', !!login.json?.token);
    const token = login.json.token;

    // /me
    const me = await api('GET', '/auth/me', { token });
    check('GET /auth/me returns admin', me.status === 200 && me.json?.user?.username === 'admin', `status=${me.status}`);

    // 2. create product
    const sku = `TEST${Date.now()}`;
    const created = await api('POST', '/products', { token, body: { sku, name: 'Produk Test', category: 'Test', buy_price: 1000, sell_price: 2000, stock: 0 } });
    check('create product returns 201', created.status === 201, `status=${created.status}`);
    const productId = created.json?.id;
    check('product has id', !!productId);

    // duplicate sku rejected
    const dup = await api('POST', '/products', { token, body: { sku, name: 'Dup' } });
    check('duplicate SKU rejected (409)', dup.status === 409, `status=${dup.status}`);

    // 3. add stock via /moves
    const mv = await api('POST', '/stock/moves', { token, body: { product_id: productId, qty: 50, reason: 'restock' } });
    check('stock move +50 returns 201', mv.status === 201, `status=${mv.status}`);
    const afterMove = await api('GET', `/products/${productId}`, { token });
    check('stock now 50', afterMove.json?.stock === 50, `stock=${afterMove.json?.stock}`);

    // 4. sell 10 units
    const sale = await api('POST', '/sales', { token, body: { items: [{ product_id: productId, qty: 10 }], discount: 0, note: 'test sale' } });
    check('create sale returns 201', sale.status === 201, `status=${sale.status}`);
    const expectedTotal = Math.round(2000 * 10 * 1.10 * 100) / 100; // subtotal 20000, tax 2000
    check('sale total correct (10% tax)', sale.json?.total === expectedTotal, `total=${sale.json?.total} expected=${expectedTotal}`);

    const afterSale = await api('GET', `/products/${productId}`, { token });
    check('stock reduced to 40', afterSale.json?.stock === 40, `stock=${afterSale.json?.stock}`);

    // insufficient stock rejected
    const over = await api('POST', '/sales', { token, body: { items: [{ product_id: productId, qty: 999 }] } });
    check('oversell rejected (400)', over.status === 400, `status=${over.status}`);

    // GET sale by id with items
    const saleDetail = await api('GET', `/sales/${sale.json.id}`, { token });
    check('GET sale/:id has 1 item', saleDetail.json?.items?.length === 1, `items=${saleDetail.json?.items?.length}`);

    // 5. create PO
    const po = await api('POST', '/purchase-orders', { token, body: { supplier_id: 1, items: [{ product_id: productId, qty: 100, unit_price: 1000 }] } });
    check('create PO returns 201 (status pending)', po.status === 201 && po.json?.status === 'pending', `status=${po.status} poStatus=${po.json?.status}`);
    check('PO total correct', po.json?.total === 1000 * 100, `total=${po.json?.total}`);

    // 6. receive PO
    const recv = await api('POST', `/purchase-orders/${po.json.id}/receive`, { token });
    check('receive PO returns status received', recv.status === 200 && recv.json?.status === 'received', `status=${recv.status} poStatus=${recv.json?.status}`);
    const afterRecv = await api('GET', `/products/${productId}`, { token });
    check('stock up to 140 after receive', afterRecv.json?.stock === 140, `stock=${afterRecv.json?.stock}`);

    // 7. GET restock
    const restock = await api('GET', '/reports/restock', { token });
    check('GET /reports/restock returns data array', restock.status === 200 && Array.isArray(restock.json?.data), `status=${restock.status}`);
    const myRec = restock.json?.data?.find((r) => r.product_id === productId);
    check('restock rec for test product', !!myRec, `found=${!!myRec}`);

    // dashboard
    const dash = await api('GET', '/reports/dashboard', { token });
    check('GET /reports/dashboard returns totals', dash.status === 200, `status=${dash.status}`);

    // unauthorized
    const noAuth = await api('GET', '/products');
    check('protected route rejects no token (401)', noAuth.status === 401, `status=${noAuth.status}`);
  } catch (e) {
    failed++;
    console.log('FAIL: unexpected error', e.message);
  } finally {
    console.log(`=== RESULT: ${passed} passed, ${failed} failed ===`);
    server.close();
    process.exit(failed > 0 ? 1 : 0);
  }
});
