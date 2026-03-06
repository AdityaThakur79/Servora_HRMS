const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const Lead = require('../models/Lead');
const { protect } = require('../middleware/auth');

router.use(protect);

const allowedJobTitles = new Set([
    'Operations',
    'Account Manager',
    'Business Developer',
]);

const canAccessLeads = (user) => user?.role === 'admin' || allowedJobTitles.has(user?.jobTitle);

const requireLeadAccess = (req, res, next) => {
    if (!canAccessLeads(req.user)) {
        res.status(403);
        throw new Error('Not authorized to access leads');
    }
    next();
};

router.use(requireLeadAccess);

const parseIntOr = (val, fallback) => {
    const n = parseInt(val, 10);
    return Number.isFinite(n) ? n : fallback;
};

// GET /api/leads?search=&status=&assignedTo=&page=&limit=
router.get('/', asyncHandler(async (req, res) => {
    const { search = '', status, assignedTo } = req.query;
    const page = parseIntOr(req.query.page, 1);
    const limit = parseIntOr(req.query.limit, 10);
    const skip = (page - 1) * limit;

    const filter = {};
    if (status) filter.status = status;
    if (assignedTo) filter.assignedTo = assignedTo;
    if (search) {
        const q = String(search).trim();
        if (q) {
            filter.$or = [
                { fullName: { $regex: q, $options: 'i' } },
                { company: { $regex: q, $options: 'i' } },
                { email: { $regex: q, $options: 'i' } },
                { phone: { $regex: q, $options: 'i' } },
            ];
        }
    }

    const [rows, total] = await Promise.all([
        Lead.find(filter)
            .populate('assignedTo', 'name email jobTitle role')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),
        Lead.countDocuments(filter),
    ]);

    res.json({
        rows,
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
    });
}));

// GET /api/leads/stats
router.get('/stats', asyncHandler(async (req, res) => {
    const counts = await Lead.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const byStatus = counts.reduce((acc, cur) => {
        acc[cur._id] = cur.count;
        return acc;
    }, {});

    const total = Object.values(byStatus).reduce((s, v) => s + v, 0);
    const won = byStatus.won || 0;
    const lost = byStatus.lost || 0;
    const conversionRate = total > 0 ? Math.round((won / total) * 1000) / 10 : 0; // %
    const lossRate = total > 0 ? Math.round((lost / total) * 1000) / 10 : 0;

    res.json({
        total,
        byStatus: {
            new: byStatus.new || 0,
            contacted: byStatus.contacted || 0,
            qualified: byStatus.qualified || 0,
            proposal: byStatus.proposal || 0,
            won: byStatus.won || 0,
            lost: byStatus.lost || 0,
        },
        conversionRate,
        lossRate,
    });
}));

// GET /api/leads/:id
router.get('/:id', asyncHandler(async (req, res) => {
    const lead = await Lead.findById(req.params.id)
        .populate('assignedTo', 'name email jobTitle role')
        .populate('createdBy', 'name email')
        .populate('notes.createdBy', 'name email');
    if (!lead) {
        res.status(404);
        throw new Error('Lead not found');
    }
    res.json(lead);
}));

// POST /api/leads
router.post('/', asyncHandler(async (req, res) => {
    const fullName = String(req.body.fullName || '').trim();
    if (!fullName) {
        res.status(400);
        throw new Error('Full name is required');
    }

    const payload = {
        fullName,
        company: String(req.body.company || '').trim(),
        email: String(req.body.email || '').trim(),
        phone: String(req.body.phone || '').trim(),
        source: String(req.body.source || 'manual').trim(),
        status: req.body.status || 'new',
        description: String(req.body.description || '').trim(),
        assignedTo: req.body.assignedTo || undefined,
        createdBy: req.user._id,
    };

    const lead = await Lead.create(payload);
    res.status(201).json(lead);
}));

// PUT /api/leads/:id
router.put('/:id', asyncHandler(async (req, res) => {
    const update = { ...req.body };
    if (update.fullName !== undefined) update.fullName = String(update.fullName || '').trim();
    if (update.company !== undefined) update.company = String(update.company || '').trim();
    if (update.email !== undefined) update.email = String(update.email || '').trim();
    if (update.phone !== undefined) update.phone = String(update.phone || '').trim();
    if (update.source !== undefined) update.source = String(update.source || '').trim();
    if (update.description !== undefined) update.description = String(update.description || '').trim();

    // Non-admins shouldn't change assignment
    if (req.user.role !== 'admin') delete update.assignedTo;

    const lead = await Lead.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true })
        .populate('assignedTo', 'name email jobTitle role');
    if (!lead) {
        res.status(404);
        throw new Error('Lead not found');
    }
    res.json(lead);
}));

// POST /api/leads/:id/notes
router.post('/:id/notes', asyncHandler(async (req, res) => {
    const text = String(req.body.text || '').trim();
    if (!text) {
        res.status(400);
        throw new Error('Note text is required');
    }
    const lead = await Lead.findById(req.params.id);
    if (!lead) {
        res.status(404);
        throw new Error('Lead not found');
    }
    lead.notes.unshift({ text, createdBy: req.user._id });
    await lead.save();
    const populated = await Lead.findById(req.params.id)
        .populate('assignedTo', 'name email jobTitle role')
        .populate('createdBy', 'name email')
        .populate('notes.createdBy', 'name email');
    res.status(201).json(populated);
}));

// DELETE /api/leads/:id (admin only)
router.delete('/:id', asyncHandler(async (req, res) => {
    if (req.user.role !== 'admin') {
        res.status(403);
        throw new Error('Only admin can delete leads');
    }
    const lead = await Lead.findByIdAndDelete(req.params.id);
    if (!lead) {
        res.status(404);
        throw new Error('Lead not found');
    }
    res.json({ message: 'Lead removed' });
}));

module.exports = router;

