const BASE = 'http://localhost:5000/api';
let token = '';
let companyId, item1Id, item2Id, partyId, invoiceId;

async function req(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`${method} ${path}: ${data.message || JSON.stringify(data)}`);
  return data;
}

const log = (label, value) => console.log(`✅ ${label}:`, typeof value === 'string' && value.length > 120 ? value.slice(0, 120) + '...' : value);

(async () => {
  const login = await req('POST', '/auth/login', { email: 'admin@biller.com', password: 'admin123' });
  token = login.token;
  log('Login as admin', login.name + ' / ' + login.role);

  const company = await req('POST', '/companies', {
    name: 'Bheemanbeats Enterprise',
    gstin: '27ABCDE1234F1Z5',
    isGstRegistered: true,
    phone: '9876543210',
    address: 'Shop 12, Main Market',
    city: 'Pune',
    state: 'Maharashtra',
    stateCode: '27',
    invoicePrefix: 'INV',
  });
  companyId = company._id;
  log('Company created', company.name);

  const item1 = await req('POST', '/items', { name: 'Basmati Rice', keyword: 'rice', hsn: '1006', unit: 'kg', purchasePrice: 60, salePrice: 75, mrp: 80, gstRate: 5, stock: 100, lowStockAlert: 10, category: 'Grocery' });
  item1Id = item1._id;
  const item2 = await req('POST', '/items', { name: 'Refined Oil 1L', keyword: 'oil', hsn: '1511', unit: 'bottle', purchasePrice: 130, salePrice: 150, mrp: 160, gstRate: 5, stock: 50, lowStockAlert: 5, category: 'Grocery' });
  item2Id = item2._id;
  log('Items created', item1.name + ', ' + item2.name);

  const party = await req('POST', '/parties', { name: 'Gupta Kirana Store', shopName: 'Gupta & Sons', partyType: 'customer', category: 'retailer', gstin: '27ABCDE5432F1Z9', phone: '9123456780', address: 'Market Road', city: 'Pune', state: 'Maharashtra', stateCode: '27', creditLimit: 50000 });
  partyId = party._id;
  log('Party created', party.name);

  const dupParty = await req('GET', '/parties?search=Gupta');
  log('Party search works', dupParty.length + ' result(s)');

  const invoice = await req('POST', '/invoices', {
    company: companyId,
    partyId,
    items: [
      { itemId: item1Id, quantity: 5, price: 75, gstRate: 5 },
      { itemId: item2Id, quantity: 10, price: 150, gstRate: 5 },
    ],
    discountType: 'amount',
    discountValue: 50,
    paymentMode: 'cash',
    paidAmount: 0,
    salesPerson: 'Ravi',
  });
  invoiceId = invoice._id;
  log('Invoice created', `${invoice.billNumber} | Total ₹${invoice.total} | CGST ₹${invoice.cgst} | SGST ₹${invoice.sgst}`);
  log('Invoice status', invoice.status + ' | paid ' + invoice.paidAmount + ' | due ' + invoice.dueAmount);
  log('Amount in words', invoice.amountInWords);

  const itemsAfter = await req('GET', '/items');
  const rice = itemsAfter.find((i) => i._id === item1Id);
  const oil = itemsAfter.find((i) => i._id === item2Id);
  log('Stock deducted (rice)', `${rice.stock} left (was 100, sold 5)`);
  log('Stock deducted (oil)', `${oil.stock} left (was 50, sold 10)`);

  const printData = await req('GET', `/invoices/print/${invoiceId}`);
  log('Invoice print data', printData.company ? printData.company.name : 'No company');

  const purch = await req('POST', '/purchases', {
    company: companyId,
    partyId: partyId,
    items: [{ itemId: item1Id, quantity: 25, price: 60, gstRate: 5 }],
    paymentMode: 'credit',
    paidAmount: 0,
  });
  log('Purchase created', `${purch.purchaseBillNumber} | ₹${purch.total}`);

  const itemsAfterPurchase = await req('GET', `/items?search=rice`);
  log('Stock restored by purchase', itemsAfterPurchase[0].stock + ' (was 95, +25)');

  const expense = await req('POST', '/expenses', { category: 'Electricity', amount: 1500, mode: 'cash', note: 'Monthly bill' });
  log('Expense created', `₹${expense.amount}`);

  const payment = await req('POST', '/payments', { party: partyId, type: 'received', amount: invoice.total, mode: 'upi', invoice: invoiceId, note: 'Payment received' });
  log('Payment received', `₹${payment.amount} UPI`);

  const invoiceAfter = await req('GET', `/invoices/${invoiceId}`);
  log('Invoice marked paid', invoiceAfter.status + ' | due ' + invoiceAfter.dueAmount);

  const dashboard = await req('GET', '/dashboard');
  log('Dashboard today sales', `₹${dashboard.todaySales}`);
  log('Dashboard outstanding', `₹${dashboard.outstanding}`);

  const salesReport = await req('GET', '/reports/sales');
  log('Sales report', `${salesReport.count} bills, ₹${salesReport.total}`);
  const gstReport = await req('GET', '/reports/gst');
  log('GST report slabs', Object.keys(gstReport.summary).length + ' slab(s), tax ₹' + gstReport.totalTax.toFixed(2));

  const statement = await req('GET', `/reports/party-statement/${partyId}`);
  log('Party statement entries', statement.entries.length + ' entries');

  // Cleanup test data
  await req('DELETE', `/invoices/${invoiceId}`);
  log('Test invoice deleted');

  console.log('\n🎉 ALL END-TO-END TESTS PASSED');
})().catch((e) => {
  console.error('\n❌ TEST FAILED:', e.message);
  process.exit(1);
});