const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const Client = require('../models/Client');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

// GET all clients
router.get('/', asyncHandler(async (req, res) => {
    const clients = await Client.find().sort({ createdAt: -1 });
    res.json(clients);
}));

// GET single client
router.get('/:id', asyncHandler(async (req, res) => {
    const client = await Client.findById(req.params.id);
    if (!client) { res.status(404); throw new Error('Client not found'); }
    res.json(client);
}));

// POST create client
router.post('/', asyncHandler(async (req, res) => {
    const client = await Client.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json(client);
}));

// PUT update client
router.put('/:id', asyncHandler(async (req, res) => {
    const client = await Client.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!client) { res.status(404); throw new Error('Client not found'); }
    res.json(client);
}));

// DELETE client
router.delete('/:id', authorize('admin', 'manager'), asyncHandler(async (req, res) => {
    const client = await Client.findByIdAndDelete(req.params.id);
    if (!client) { res.status(404); throw new Error('Client not found'); }
    res.json({ message: 'Client removed' });
}));

module.exports = router;
