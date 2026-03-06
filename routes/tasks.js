const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const Task = require('../models/Task');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

// GET all tasks (optionally filter by project / user, supports basic pagination)
router.get('/', asyncHandler(async (req, res) => {
    const filter = {};
    if (req.query.project) filter.project = req.query.project;
    if (req.query.assignedTo) filter.assignedTo = req.query.assignedTo;

    const page = parseInt(req.query.page, 10) || 0;
    const limit = parseInt(req.query.limit, 10) || 0;

    // Backwards compatible: if no pagination params, return full list as before
    if (!page || !limit) {
        const allTasks = await Task.find(filter)
            .populate('project', 'name')
            .populate('assignedTo', 'name email jobTitle')
            .sort({ createdAt: -1 });
        return res.json(allTasks);
    }

    const skip = (page - 1) * limit;

    const [tasks, total] = await Promise.all([
        Task.find(filter)
            .populate('project', 'name')
            .populate('assignedTo', 'name email jobTitle')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),
        Task.countDocuments(filter),
    ]);

    res.json({
        tasks,
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
    });
}));

// GET single task
router.get('/:id', asyncHandler(async (req, res) => {
    const task = await Task.findById(req.params.id)
        .populate('project', 'name')
        .populate('assignedTo', 'name email');
    if (!task) { res.status(404); throw new Error('Task not found'); }
    res.json(task);
}));

// POST create task
router.post('/', asyncHandler(async (req, res) => {
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
        req.body.assignedTo = req.user._id;
    }
    const task = await Task.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json(task);
}));

// PUT update task
router.put('/:id', asyncHandler(async (req, res) => {
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
        // Staff cannot change assignment
        delete req.body.assignedTo;
        // Staff can only update tasks assigned to themselves
        const existing = await Task.findById(req.params.id).select('assignedTo');
        if (!existing) { res.status(404); throw new Error('Task not found'); }
        if (!existing.assignedTo || existing.assignedTo.toString() !== req.user._id.toString()) {
            res.status(403);
            throw new Error('Not authorized to update this task');
        }
    }
    const task = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!task) { res.status(404); throw new Error('Task not found'); }
    res.json(task);
}));

// DELETE task
router.delete('/:id', asyncHandler(async (req, res) => {
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) { res.status(404); throw new Error('Task not found'); }
    res.json({ message: 'Task removed' });
}));

module.exports = router;
