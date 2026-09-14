import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

import connectDB from './config/db.js';
import User from './models/User.js';

import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import companyRoutes from './routes/companyRoutes.js';
import itemRoutes from './routes/itemRoutes.js';
import partyRoutes from './routes/partyRoutes.js';
import invoiceRoutes from './routes/invoiceRoutes.js';
import expenseRoutes from './routes/expenseRoutes.js';
import purchaseRoutes from './routes/purchaseRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import godownRoutes from './routes/godownRoutes.js';
import gstRoutes from './routes/gstRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import backupRoutes from './routes/backupRoutes.js';
import auditRoutes from './routes/auditRoutes.js';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get('/', (req, res) => res.json({ app: 'Biller API', status: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/parties', partyRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/godowns', godownRoutes);
app.use('/api/gst', gstRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/audit', auditRoutes);

const distPath = path.join(__dirname, '..', 'frontend', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get(/^\/(?!api\/)(?!.*\.\w+$).*/, (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
  console.log('Serving frontend from', distPath);
}

const seedAdmin = async () => {
  const email = (process.env.ADMIN_EMAIL || 'admin@biller.com').toLowerCase();
  const adminExists = await User.findOne({ $or: [{ email }, { role: 'admin' }] });
  if (!adminExists) {
    const password = process.env.ADMIN_PASSWORD || 'admin123';
    const hashed = await bcrypt.hash(password, 10);
    await User.create({
      name: 'Administrator',
      email,
      password: hashed,
      phone: '',
      role: 'admin',
    });
    console.log(`Default admin created: ${email}${process.env.ADMIN_PASSWORD ? ' (password from env)' : ' / admin123'}`);
  }
};

const PORT = process.env.PORT || 5000;
connectDB().then(async () => {
  await seedAdmin();
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});