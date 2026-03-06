const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const ServiceRequest = require('../models/ServiceRequest');
const { protect } = require('../middleware/auth');

router.use(protect);

// GET all service requests
router.get('/', asyncHandler(async (req, res) => {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.client) filter.client = req.query.client;
    const requests = await ServiceRequest.find(filter)
        .populate('client', 'name company')
        .populate('assignedTo', 'name email')
        .sort({ createdAt: -1 });
    res.json(requests);
}));

// GET single request
router.get('/:id', asyncHandler(async (req, res) => {
    const request = await ServiceRequest.findById(req.params.id)
        .populate('client', 'name company email')
        .populate('assignedTo', 'name email');
    if (!request) { res.status(404); throw new Error('Service request not found'); }
    res.json(request);
}));

// POST create
router.post('/', asyncHandler(async (req, res) => {
    const request = await ServiceRequest.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json(request);
}));

// PUT update
router.put('/:id', asyncHandler(async (req, res) => {
    if (req.body.status === 'resolved') req.body.resolvedAt = new Date();
    const request = await ServiceRequest.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!request) { res.status(404); throw new Error('Service request not found'); }
    res.json(request);
}));

// DELETE
router.delete('/:id', asyncHandler(async (req, res) => {
    const request = await ServiceRequest.findByIdAndDelete(req.params.id);
    if (!request) { res.status(404); throw new Error('Service request not found'); }
    res.json({ message: 'Request removed' });
}));

module.exports = router;
