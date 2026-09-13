import mongoose from 'mongoose';

const billCounterSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  prefix: { type: String, required: true },
  year: { type: String, required: true },
  sequence: { type: Number, default: 0 },
});

billCounterSchema.index({ company: 1, prefix: 1, year: 1 }, { unique: true });

const BillCounter = mongoose.model('BillCounter', billCounterSchema);
export default BillCounter;