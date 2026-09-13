import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema(
  {
    expenseDate: { type: Date, default: Date.now },
    category: { type: String, default: 'General' },
    amount: { type: Number, required: true },
    mode: { type: String, enum: ['cash', 'upi', 'card', 'bank', 'cheque'], default: 'cash' },
    note: { type: String, default: '' },
    party: { type: mongoose.Schema.Types.ObjectId, ref: 'Party' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
  },
  { timestamps: true }
);

const Expense = mongoose.model('Expense', expenseSchema);
export default Expense;