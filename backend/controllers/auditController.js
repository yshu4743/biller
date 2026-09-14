import AuditLog from '../models/AuditLog.js';

export const listAudit = async (req, res) => {
  try {
    const { page = 1, limit = 50, entity, action, userId } = req.query;
    const filter = {};
    if (entity) filter.entity = entity;
    if (action) filter.action = action;
    if (userId) filter.user = userId;
    const total = await AuditLog.countDocuments(filter);
    const logs = await AuditLog.find(filter)
      .sort({ date: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));
    res.json({ logs, total, pages: Math.ceil(total / Number(limit)) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};