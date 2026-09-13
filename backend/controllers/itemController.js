import Item from '../models/Item.js';

export const listItems = async (req, res) => {
  try {
    const { search, category, lowStock } = req.query;
    const filter = {};
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
    const item = await Item.create({ ...req.body, openingStock: stock !== undefined ? stock : req.body.openingStock, createdBy: req.user._id });
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
    const payload = items.map((it) => ({
      ...it,
      openingStock: it.stock !== undefined ? it.stock : it.openingStock,
      createdBy: req.user._id,
    }));
    const created = await Item.insertMany(payload);
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
    if (stock !== undefined) item.stock = stock;
    await item.save();
    res.json(item);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteItem = async (req, res) => {
  try {
    const item = await Item.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ message: 'Item not found' });
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
    await item.save();
    res.json(item);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};