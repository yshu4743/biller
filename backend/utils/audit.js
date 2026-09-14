import AuditLog from '../models/AuditLog.js';

export const logAudit = async ({ userId, userName, action, entity, entityId = '', ref = '', details = {} }) => {
  try {
    await AuditLog.create({ user: userId, userName, action, entity, entityId, ref, details });
  } catch (error) {
    // Audit failures must never break the main flow.
    console.error('Audit log write failed:', error.message);
  }
};

export const auditFromReq = (req, action, entity, entityId, ref, details) =>
  logAudit({ userId: req.user?._id, userName: req.user?.name, action, entity, entityId, ref, details });