import mongoose from 'mongoose';

const companySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    gstin: { type: String, default: '' },
    isGstRegistered: { type: Boolean, default: false },
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
    address: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    stateCode: { type: String, default: '' },
    pincode: { type: String, default: '' },
    logo: { type: String, default: '' },
    website: { type: String, default: '' },
    bankName: { type: String, default: '' },
    bankAccount: { type: String, default: '' },
    bankIfsc: { type: String, default: '' },
    upiId: { type: String, default: '' },
    invoicePrefix: { type: String, default: 'INV' },
    invoiceNote: { type: String, default: 'Thank you for your business!' },
    invoiceFooter: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

const Company = mongoose.model('Company', companySchema);
export default Company;