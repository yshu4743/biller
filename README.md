# Biller - Billing Software for Indian Wholesale/Retail Shops

A GST-compliant billing & inventory management system built like Vyapaar, for Indian shops.

## Tech Stack
- **Backend**: Node.js, Express, MongoDB (Atlas), Mongoose, JWT
- **Frontend**: React, Vite, Tailwind CSS, Recharts

## Features
- **Login (Admin/Salesman/Driver)**: Role-based JWT auth. Admin can create salesman & driver accounts.
- **Company Page**: Name, GSTIN, contact, address, logo, bank/UPI details, invoice prefix & note.
- **Items Page**: Name, keyword, HSN, SKU, barcode, units, purchase/sale/MRP/wholesale price, GST rate (included or added), stock, low-stock alerts, batch & expiry.
- **Parties**: Customers/shops/suppliers with GSTIN, contact, state (for GST), credit limit, opening balance.
- **Billing**: Select company + party → search & add items with quantity → item & bill discounts → auto GST (CGST/SGST for same state, IGST for inter-state) → payment modes (cash/UPI/card/bank/cheque/credit) → auto stock deduction → GST-invoice print.
- **Invoice Print**: A4 GST-compliant TAX INVOICE with company header, GST breakdown, amount in words, payment mode, bank details & signature. Bill numbers auto-generated like `INV-2627-0001` (financial year based).
- **Dashboard**: Today's sales, bills, collection, expense, outstanding dues, 7-day sales trend, low-stock alerts, top-selling items, GST slab distribution.
- **Expenses**: Categorized expense tracking.
- **Purchases**: Record supplier purchases — stock increases automatically.
- **Payments & Dues**: Record money received/paid, party-wise outstanding, partial bill payments.
- **Reports**: Sales report, GST summary, stock report, profit & loss, party statement, day book.

## Setup

### 1. Backend
```bash
cd backend
npm install
# edit .env — Mongo Atlas URI is already configured
npm start        # runs on http://localhost:5000
```
First run auto-creates the default admin:
```
admin@biller.com / admin123
```
**Change this password immediately** via Settings → Change Password.

### 2. Frontend
```bash
cd frontend
npm install
npm run dev     # runs on http://localhost:5173
```
The frontend proxies `/api` to `localhost:5000`, so no extra config needed.

## Quick Start
1. Login as admin.
2. **Company** → add your company (name, GSTIN, state — required for GST).
3. **Items & Stock** → add your products.
4. **Parties** → add your customers/shops.
5. **New Bill** → select party, add items, choose payment → Save Bill & Print.

## Default Credentials & Security
- Default admin: `admin@biller.com` / `admin123` (change it!)
- DB credentials live in `backend/.env`. Keep `.env` out of version control (gitignored).
- Since the Atlas connection string and JWT secret are in `.env`, **rotate your Atlas password** if this file ever leaks.

## Dev Scripts
- `backend/test-e2e.js` — full end-to-end API test against the live DB.
- `backend/cleanup-test.js` — removes all test/sample data (keeps admin).

## Roadmap (next steps)
Quotations & delivery challans (convertible to sale), credit/debit notes, barcode generation & scanning, GSTR-1/3B export, E-way bill, multi-store & stock transfers, backup/restore UI, audit logs, WhatsApp/email invoice share.