const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        description: { type: String, default: '' },
        client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
        assignedTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
        status: {
            type: String,
            enum: ['active', 'on-hold', 'completed', 'cancelled'],
            default: 'active',
        },
        priority: {
            type: String,
            enum: ['low', 'medium', 'high'],
            default: 'medium',
        },
        startDate: { type: Date, default: Date.now },
        dueDate: { type: Date },
        budget: { type: Number, default: 0, min: 0 },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        // Broad category to differentiate SMM vs Tech projects
        workstream: {
            type: String,
            enum: ['smm', 'tech', 'general'],
            default: 'general',
        },
        // High-level bucket to classify the engagement (SMM, SEO, Web, etc.)
        serviceType: {
            type: String,
            default: 'general',
            trim: true,
        },
        // Flexible container for plan-specific data (e.g. reels/posts/stories for SMM)
        serviceDetails: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Project', ProjectSchema);
