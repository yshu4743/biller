import mongoose from 'mongoose';

const auditSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    userName: { type: String, default: '' },
    action: { type: String, required: true },
    entity: { type: String, required: true },
    entityId: { type: String, default: '' },
    ref: { type: String, default: '' },
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
    date: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

auditSchema.index({ date: -1 });
auditSchema.index({ entity: 1, entityId: 1 });

const AuditLog = mongoose.model('AuditLog', auditSchema);
export default AuditLog;