const mongoose = require('mongoose');

const ClientSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        company: { type: String, default: '' },
        email: { type: String, lowercase: true, default: '' },
        phone: { type: String, default: '' },
        address: { type: String, default: '' },
        status: {
            type: String,
            enum: ['active', 'inactive', 'prospect'],
            default: 'active',
        },
        notes: { type: String, default: '' },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Client', ClientSchema);
