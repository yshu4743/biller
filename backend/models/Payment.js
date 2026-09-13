import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    party: { type: mongoose.Schema.Types.ObjectId, ref: 'Party', required: true },
    type: { type: String, enum: ['received', 'paid'], required: true },
    amount: { type: Number, required: true },
    mode: { type: String, enum: ['cash', 'upi', 'card', 'bank', 'cheque'], default: 'cash' },
    date: { type: Date, default: Date.now },
    invoice: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
    purchase: { type: mongoose.Schema.Types.ObjectId, ref: 'Purchase' },
    reference: { type: String, default: '' },
    note: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
  },
  { timestamps: true }
);

const Payment = mongoose.model('Payment', paymentSchema);
export default Payment;