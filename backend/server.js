import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

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
import dashboardRoutes from './routes/dashboardRoutes.js';
import reportRoutes from './routes/reportRoutes.js';

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
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);

const seedAdmin = async () => {
  const count = await User.countDocuments();
  if (count === 0) {
    const email = (process.env.ADMIN_EMAIL || 'admin@biller.com').toLowerCase();
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