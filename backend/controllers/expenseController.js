import Expense from '../models/Expense.js';

export const listExpenses = async (req, res) => {
  try {
    const { from, to, category } = req.query;
    const filter = {};
    if (from || to) {
      filter.expenseDate = {};
      if (from) filter.expenseDate.$gte = new Date(from);
      if (to) filter.expenseDate.$lte = new Date(to + 'T23:59:59');
    }
    if (category) filter.category = category;
    const expenses = await Expense.find(filter).sort({ expenseDate: -1 });
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createExpense = async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount) return res.status(400).json({ message: 'Amount is required' });
    const expense = await Expense.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json(expense);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateExpense = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) return res.status(404).json({ message: 'Expense not found' });
    Object.assign(expense, req.body);
    await expense.save();
    res.json(expense);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findByIdAndDelete(req.params.id);
    if (!expense) return res.status(404).json({ message: 'Expense not found' });
    res.json({ message: 'Expense deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};