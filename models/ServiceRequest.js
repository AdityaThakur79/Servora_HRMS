const mongoose = require('mongoose');

const ServiceRequestSchema = new mongoose.Schema(
    {
        title: { type: String, required: true, trim: true },
        description: { type: String, default: '' },
        client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
        project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
        assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        status: {
            type: String,
            enum: ['open', 'in-progress', 'resolved', 'closed'],
            default: 'open',
        },
        priority: {
            type: String,
            enum: ['low', 'medium', 'high', 'urgent'],
            default: 'medium',
        },
        category: {
            type: String,
            enum: ['bug', 'feature', 'support', 'billing', 'other'],
            default: 'support',
        },
        resolvedAt: { type: Date },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    },
    { timestamps: true }
);

module.exports = mongoose.model('ServiceRequest', ServiceRequestSchema);
