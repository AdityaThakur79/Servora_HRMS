const mongoose = require('mongoose');

const InvoiceItemSchema = new mongoose.Schema({
    description: { type: String, required: true },
    quantity: { type: Number, required: true, default: 1 },
    rate: { type: Number, required: true },
    amount: { type: Number, required: true },
});

const InvoiceSchema = new mongoose.Schema(
    {
        invoiceNumber: { type: String, unique: true },
        client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
        project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
        items: [InvoiceItemSchema],
        subtotal: { type: Number, default: 0 },
        tax: { type: Number, default: 0 },
        discount: { type: Number, default: 0 },
        total: { type: Number, default: 0 },
        status: {
            type: String,
            enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled'],
            default: 'draft',
        },
        dueDate: { type: Date },
        paidAt: { type: Date },
        notes: { type: String, default: '' },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    },
    { timestamps: true }
);

// Auto-generate invoice number
InvoiceSchema.pre('save', async function (next) {
    if (!this.invoiceNumber) {
        const count = await this.constructor.countDocuments();
        this.invoiceNumber = `INV-${String(count + 1).padStart(4, '0')}`;
    }
    next();
});

module.exports = mongoose.model('Invoice', InvoiceSchema);
