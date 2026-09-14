import mongoose from 'mongoose';

const purchaseItemSchema = new mongoose.Schema(
  {
    item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
    name: { type: String },
    hsn: { type: String, default: '' },
    unit: { type: String, default: 'pcs' },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    gstRate: { type: Number, default: 0 },
    amount: { type: Number, required: true },
  },
  { _id: false }
);

const purchaseSchema = new mongoose.Schema(
  {
    purchaseBillNumber: { type: String, required: true },
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
    party: { type: mongoose.Schema.Types.ObjectId, ref: 'Party' },
    partySnapshot: { name: String, gstin: String, phone: String, address: String },
    items: [purchaseItemSchema],
    subtotal: { type: Number, default: 0 },
    discountType: { type: String, enum: ['percent', 'amount'], default: 'amount' },
    discountValue: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    taxable: { type: Number, default: 0 },
    totalGst: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    paymentMode: { type: String, enum: ['cash', 'upi', 'card', 'bank', 'cheque', 'credit'], default: 'credit' },
    paidAmount: { type: Number, default: 0 },
    status: { type: String, enum: ['paid', 'unpaid', 'partial'], default: 'unpaid' },
    dueAmount: { type: Number, default: 0 },
    notes: { type: String, default: '' },
    type: { type: String, enum: ['purchase', 'purchase_return'], default: 'purchase' },
    returnedOf: { type: mongoose.Schema.Types.ObjectId, ref: 'Purchase', default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    date: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const Purchase = mongoose.model('Purchase', purchaseSchema);
export default Purchase;