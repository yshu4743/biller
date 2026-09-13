import mongoose from 'mongoose';

const itemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    keyword: { type: String, default: '', trim: true },
    hsn: { type: String, default: '' },
    sku: { type: String, default: '' },
    barcode: { type: String, default: '' },
    unit: { type: String, default: 'pcs' },
    category: { type: String, default: 'General' },
    purchasePrice: { type: Number, default: 0 },
    salePrice: { type: Number, default: 0 },
    mrp: { type: Number, default: 0 },
    wholesalePrice: { type: Number, default: 0 },
    gstRate: { type: Number, default: 0 },
    gstIncluded: { type: Boolean, default: false },
    openingStock: { type: Number, default: 0 },
    stock: { type: Number, default: 0 },
    lowStockAlert: { type: Number, default: 0 },
    batch: { type: String, default: '' },
    expiryDate: { type: Date, default: null },
    isService: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
  },
  { timestamps: true }
);

itemSchema.index({ name: 'text', keyword: 'text', barcode: 'text', sku: 'text' });

const Item = mongoose.model('Item', itemSchema);
export default Item;