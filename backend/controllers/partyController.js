import Party from '../models/Party.js';

export const listParties = async (req, res) => {
  try {
    const { search, partyType, category } = req.query;
    const filter = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { shopName: { $regex: search, $options: 'i' } },
        { gstin: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }
    if (partyType) filter.partyType = partyType;
    if (category) filter.category = category;
    const parties = await Party.find(filter).sort({ name: 1 });
    res.json(parties);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createParty = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: 'Party name is required' });
    const party = await Party.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json(party);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateParty = async (req, res) => {
  try {
    const party = await Party.findById(req.params.id);
    if (!party) return res.status(404).json({ message: 'Party not found' });
    Object.assign(party, req.body);
    await party.save();
    res.json(party);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteParty = async (req, res) => {
  try {
    const party = await Party.findByIdAndDelete(req.params.id);
    if (!party) return res.status(404).json({ message: 'Party not found' });
    res.json({ message: 'Party deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getParty = async (req, res) => {
  try {
    const party = await Party.findById(req.params.id);
    if (!party) return res.status(404).json({ message: 'Party not found' });
    res.json(party);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};