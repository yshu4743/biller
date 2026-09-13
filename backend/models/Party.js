import mongoose from 'mongoose';

const partySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    shopName: { type: String, default: '' },
    partyType: { type: String, enum: ['customer', 'supplier', 'both'], default: 'customer' },
    category: { type: String, enum: ['retailer', 'wholesaler', 'distributor', 'other'], default: 'retailer' },
    gstin: { type: String, default: '' },
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
    address: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    stateCode: { type: String, default: '' },
    pincode: { type: String, default: '' },
    openingBalance: { type: Number, default: 0 },
    balanceType: { type: String, enum: ['debit', 'credit'], default: 'debit' },
    creditLimit: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
  },
  { timestamps: true }
);

partySchema.index({ name: 'text', shopName: 'text', gstin: 'text', phone: 'text' });

const Party = mongoose.model('Party', partySchema);
export default Party;