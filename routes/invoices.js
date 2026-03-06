const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const Invoice = require('../models/Invoice');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

const stripMoneyFromInvoice = (invoiceDoc) => {
    const obj = invoiceDoc.toObject ? invoiceDoc.toObject() : { ...invoiceDoc };
    delete obj.subtotal;
    delete obj.total;
    delete obj.tax;
    delete obj.discount;
    if (Array.isArray(obj.items)) {
        obj.items = obj.items.map((it) => ({
            description: it.description,
            quantity: it.quantity,
        }));
    }
    return obj;
};

// GET all invoices
router.get('/', asyncHandler(async (req, res) => {
    const filter = {};
    if (req.query.client) filter.client = req.query.client;
    if (req.query.project) filter.project = req.query.project;

    const invoices = await Invoice.find(filter)
        .populate('client', 'name company')
        .populate('project', 'name')
        .sort({ createdAt: -1 });
    if (req.user.role !== 'admin') {
        return res.json(invoices.map(stripMoneyFromInvoice));
    }
    res.json(invoices);
}));

// GET single invoice
router.get('/:id', asyncHandler(async (req, res) => {
    const invoice = await Invoice.findById(req.params.id)
        .populate('client', 'name company email address')
        .populate('project', 'name');
    if (!invoice) { res.status(404); throw new Error('Invoice not found'); }
    if (req.user.role !== 'admin') {
        return res.json(stripMoneyFromInvoice(invoice));
    }
    res.json(invoice);
}));

// POST create invoice
router.post('/', authorize('admin'), asyncHandler(async (req, res) => {
    const { items, tax = 0, discount = 0 } = req.body;
    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
    const total = subtotal + tax - discount;
    const invoice = await Invoice.create({
        ...req.body,
        subtotal,
        total,
        createdBy: req.user._id,
    });
    res.status(201).json(invoice);
}));

// PUT update invoice
router.put('/:id', authorize('admin'), asyncHandler(async (req, res) => {
    if (req.body.items) {
        const subtotal = req.body.items.reduce((sum, item) => sum + item.amount, 0);
        req.body.subtotal = subtotal;
        req.body.total = subtotal + (req.body.tax || 0) - (req.body.discount || 0);
    }
    if (req.body.status === 'paid') req.body.paidAt = new Date();
    const invoice = await Invoice.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!invoice) { res.status(404); throw new Error('Invoice not found'); }
    res.json(invoice);
}));

// DELETE invoice
router.delete('/:id', authorize('admin'), asyncHandler(async (req, res) => {
    const invoice = await Invoice.findByIdAndDelete(req.params.id);
    if (!invoice) { res.status(404); throw new Error('Invoice not found'); }
    res.json({ message: 'Invoice removed' });
}));

module.exports = router;
