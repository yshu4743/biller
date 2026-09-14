import mongoose from 'mongoose';

const invoiceItemSchema = new mongoose.Schema(
  {
    item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
    name: { type: String },
    hsn: { type: String, default: '' },
    unit: { type: String, default: 'pcs' },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    mrp: { type: Number, default: 0 },
    gstRate: { type: Number, default: 0 },
    gstIncluded: { type: Boolean, default: false },
    amount: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    discountedAmount: { type: Number, default: 0 },
  },
  { _id: false }
);

const invoiceSchema = new mongoose.Schema(
  {
    billNumber: { type: String, required: true, unique: true },
    prefix: { type: String, default: 'INV' },
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
    party: { type: mongoose.Schema.Types.ObjectId, ref: 'Party' },
    partySnapshot: {
      name: String,
      gstin: String,
      phone: String,
      address: String,
      stateCode: String,
    },
    items: [invoiceItemSchema],
    invoiceType: { type: String, enum: ['sale', 'estimate', 'challan', 'sale_return'], default: 'sale' },
    subtotal: { type: Number, default: 0 },
    discountType: { type: String, enum: ['percent', 'amount'], default: 'amount' },
    discountValue: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    taxable: { type: Number, default: 0 },
    cgst: { type: Number, default: 0 },
    sgst: { type: Number, default: 0 },
    igst: { type: Number, default: 0 },
    totalGst: { type: Number, default: 0 },
    roundOff: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    amountInWords: { type: String, default: '' },
    status: { type: String, enum: ['paid', 'unpaid', 'partial'], default: 'unpaid' },
    paidAmount: { type: Number, default: 0 },
    dueAmount: { type: Number, default: 0 },
    paymentMode: { type: String, enum: ['cash', 'upi', 'card', 'bank', 'cheque', 'credit'], default: 'cash' },
    dueDate: { type: Date, default: null },
    notes: { type: String, default: '' },
    salesPerson: { type: String, default: '' },
    transport: {
      transporter: { type: String, default: '' },
      vehicleNo: { type: String, default: '' },
      lrNo: { type: String, default: '' },
      lrDate: { type: String, default: '' },
      mode: { type: String, enum: ['road', 'rail', 'air', 'ship', ''], default: '' },
      ewayBillNo: { type: String, default: '' },
    },
    eInvoice: {
      irn: { type: String, default: '' },
      ackNo: { type: String, default: '' },
      ackDate: { type: Date, default: null },
      status: { type: String, enum: ['pending', 'generated'], default: 'pending' },
    },
    eWayBill: {
      no: { type: String, default: '' },
      date: { type: Date, default: null },
      expiry: { type: Date, default: null },
      status: { type: String, enum: ['pending', 'generated'], default: 'pending' },
      intraState: { type: Boolean, default: false },
      value: { type: Number, default: 0 },
      threshold: { type: Number, default: 50000 },
      thresholdMet: { type: Boolean, default: false },
      fromState: { type: String, default: '' },
      toState: { type: String, default: '' },
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    date: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

invoiceSchema.index({ billNumber: 'text', 'partySnapshot.name': 'text' });

const Invoice = mongoose.model('Invoice', invoiceSchema);
export default Invoice;