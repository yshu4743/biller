import Godown from '../models/Godown.js';
import Item from '../models/Item.js';

export const listGodowns = async (req, res) => {
  try {
    const godowns = await Godown.find().sort({ isDefault: -1, name: 1 });
    res.json(godowns);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createGodown = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: 'Godown name is required' });
    const existing = await Godown.countDocuments();
    const godown = await Godown.create({ ...req.body, isDefault: existing === 0, createdBy: req.user._id });
    res.status(201).json(godown);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateGodown = async (req, res) => {
  try {
    const godown = await Godown.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!godown) return res.status(404).json({ message: 'Godown not found' });
    res.json(godown);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteGodown = async (req, res) => {
  try {
    const godown = await Godown.findById(req.params.id);
    if (!godown) return res.status(404).json({ message: 'Godown not found' });
    await Item.updateMany(
      { 'godowns.godown': godown._id },
      { $pull: { godowns: { godown: godown._id } } }
    );
    await Item.updateMany({ defaultGodown: godown._id }, { $unset: { defaultGodown: 1 } });
    await Godown.findByIdAndDelete(req.params.id);
    res.json({ message: 'Godown deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const transferStock = async (req, res) => {
  try {
    const { itemId, fromGodown, toGodown, qty } = req.body;
    const amount = Number(qty) || 0;
    if (!itemId || !fromGodown || !toGodown) return res.status(400).json({ message: 'Item, from and to godowns are required' });
    if (fromGodown === toGodown) return res.status(400).json({ message: 'Source and destination godowns must differ' });
    if (amount <= 0) return res.status(400).json({ message: 'Quantity must be greater than zero' });

    const item = await Item.findById(itemId);
    if (!item) return res.status(404).json({ message: 'Item not found' });

    const fromEntry = (item.godowns || []).find((g) => String(g.godown) === String(fromGodown));
    const toEntry = (item.godowns || []).find((g) => String(g.godown) === String(toGodown));
    const fromQty = fromEntry ? fromEntry.qty : 0;
    if (fromQty < amount) {
      return res.status(400).json({ message: `Only ${fromQty} ${item.unit} available in source godown` });
    }

    if (fromEntry) fromEntry.qty -= amount;
    else item.godowns.push({ godown: fromGodown, qty: -amount });
    if (toEntry) toEntry.qty += amount;
    else item.godowns.push({ godown: toGodown, qty: amount });

    await item.save();
    res.json(item);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};