const mongoose = require('mongoose');

const LeadSchema = new mongoose.Schema(
    {
        fullName: { type: String, required: true, trim: true },
        company: { type: String, default: '', trim: true },
        email: { type: String, default: '', lowercase: true, trim: true },
        phone: { type: String, default: '', trim: true },
        source: { type: String, default: 'manual', trim: true }, // manual, referral, instagram, website, etc.
        status: {
            type: String,
            enum: [
                // Legacy (kept for backward compat)
                'new', 'qualified', 'proposal',
                // Incoming
                'new-lead', 'lead-captured', 'unassigned',
                // Initial Contact
                'attempted-contact', 'contacted', 'no-response', 'wrong-number',
                // Qualification
                'interested', 'not-interested', 'budget-issue', 'qualified-lead',
                // Sales Stage
                'meeting-scheduled', 'discovery-call-done', 'requirement-collected', 'proposal-sent', 'negotiation',
                // Decision Stage
                'follow-up-pending', 'waiting-for-client', 'decision-pending',
                // Final
                'won', 'lost', 'not-now',
            ],
            default: 'new-lead',
        },
        assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        salesOwner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        description: { type: String, default: '' },
        notes: [
            {
                text: { type: String, required: true },
                createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
                createdAt: { type: Date, default: Date.now },
            },
        ],
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Lead', LeadSchema);

