import Item from '../models/Item.js';
import { auditFromReq } from '../utils/audit.js';

function sumGodownStock(godowns) {
  if (!Array.isArray(godowns) || godowns.length === 0) return null;
  return godowns.reduce((s, g) => s + (Number(g.qty) || 0), 0);
}

export const listItems = async (req, res) => {
  try {
    const { search, category, lowStock, ids } = req.query;
    const filter = {};
    if (ids) filter._id = { $in: ids.split(',').filter(Boolean) };
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { keyword: { $regex: search, $options: 'i' } },
        { hsn: { $regex: search, $options: 'i' } },
        { barcode: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
      ];
    }
    if (category) filter.category = category;
    if (lowStock === 'true') {
      filter.$expr = { $lte: ['$stock', '$lowStockAlert'] };
    }
    const items = await Item.find(filter).sort({ name: 1 });
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createItem = async (req, res) => {
  try {
    const { name, stock } = req.body;
    if (!name) return res.status(400).json({ message: 'Item name is required' });
    const godownStock = sumGodownStock(req.body.godowns);
    const effectiveStock = godownStock !== null && !req.body.isService ? godownStock : stock;
    const item = await Item.create({ ...req.body, openingStock: effectiveStock !== undefined ? effectiveStock : req.body.openingStock, stock: effectiveStock !== undefined ? effectiveStock : req.body.stock, createdBy: req.user._id });
    await auditFromReq(req, 'create', 'item', item._id.toString(), item.name, { stock: item.stock });
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const bulkCreateItems = async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Provide an array of items' });
    }
    const payload = items.map((it) => {
      const godownStock = sumGodownStock(it.godowns);
      const effStock = godownStock !== null && !it.isService ? godownStock : it.stock;
      return {
        ...it,
        openingStock: effStock !== undefined ? effStock : it.openingStock,
        stock: effStock !== undefined ? effStock : it.stock,
        createdBy: req.user._id,
      };
    });
    const created = await Item.insertMany(payload);
    await auditFromReq(req, 'bulk_create', 'item', '', '', { count: created.length });
    res.status(201).json({ count: created.length, items: created });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateItem = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Item not found' });
    const { stock, ...rest } = req.body;
    Object.assign(item, rest);
    const godownStock = sumGodownStock(rest.godowns);
    if (godownStock !== null && !rest.isService) item.stock = godownStock;
    else if (stock !== undefined) item.stock = stock;
    await item.save();
    await auditFromReq(req, 'update', 'item', item._id.toString(), item.name, { stock: item.stock });
    res.json(item);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteItem = async (req, res) => {
  try {
    const item = await Item.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ message: 'Item not found' });
    await auditFromReq(req, 'delete', 'item', item._id.toString(), item.name, {});
    res.json({ message: 'Item deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const adjustStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { adjustment, reason } = req.body;
    const amount = Number(adjustment) || 0;
    const item = await Item.findById(id);
    if (!item) return res.status(404).json({ message: 'Item not found' });
    item.stock += amount;
    if (amount !== 0 && item.godowns && item.godowns.length > 0) {
      const target = item.godowns.find((g) => g.godown && String(g.godown) === String(item.defaultGodown)) || item.godowns[0];
      if (target) target.qty += amount;
    }
    await item.save();
    await auditFromReq(req, 'adjust_stock', 'item', item._id.toString(), item.name, { adjustment: amount, reason: reason || '' });
    res.json(item);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

function ean13CheckDigit(digits12) {
  const d = digits12.split('').map(Number);
  const sum = d.reduce((acc, n, i) => acc + n * (i % 2 === 0 ? 1 : 3), 0);
  return (10 - (sum % 10)) % 10;
}

function itemHashedBarcode(itemId) {
  const hex = itemId.toString().replace(/[^0-9a-f]/gi, '');
  const hash = (BigInt('0x' + hex) % 1000000000n).toString().padStart(9, '0');
  const digits12 = `890${hash}`;
  return `${digits12}${ean13CheckDigit(digits12)}`;
}

export const generateBarcodes = async (req, res) => {
  try {
    const { ids } = req.body;
    let items;
    if (Array.isArray(ids) && ids.length > 0) {
      items = await Item.find({ _id: { $in: ids } });
    } else {
      items = await Item.find({ $or: [{ barcode: '' }, { barcode: { $exists: false } }] });
    }
    let count = 0;
    const updated = [];
    for (const item of items) {
      if (item.barcode && item.barcode.trim()) {
        updated.push(item);
        continue;
      }
      item.barcode = itemHashedBarcode(item._id);
      await item.save();
      count += 1;
      updated.push(item);
    }
    res.json({ count, items: updated });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};