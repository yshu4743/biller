import bcrypt from 'bcryptjs';
import User from '../models/User.js';

export const listUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createUser = async (req, res) => {
  try {
    const { name, email, phone, password, role } = req.body;
    const existing = await User.findOne({ email: (email || '').toLowerCase() });
    if (existing) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      phone: phone || '',
      password: hashed,
      role: role || 'salesman',
      createdBy: req.user._id,
    });
    res.status(201).json({ _id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role, isActive: user.isActive });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const { name, email, phone, role, isActive, password } = req.body;
    if (name) user.name = name;
    if (email) user.email = email;
    if (phone !== undefined) user.phone = phone;
    if (role) user.role = role;
    if (isActive !== undefined) user.isActive = isActive;
    if (password) user.password = await bcrypt.hash(password, 10);
    await user.save();
    res.json({ _id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role, isActive: user.isActive });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteUser = async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};