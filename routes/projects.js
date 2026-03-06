const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const Project = require('../models/Project');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

const normalizeInt = (value) => {
    if (value === '' || value === null || value === undefined) return undefined;
    const n = Number(value);
    if (!Number.isFinite(n)) return NaN;
    return Math.trunc(n);
};

const validateProjectPayload = (body) => {
    if (body.budget !== undefined && body.budget !== null && body.budget !== '') {
        const budget = Number(body.budget);
        if (!Number.isFinite(budget) || budget < 0) {
            return 'Budget must be a valid non-negative number';
        }
    }

    if (body.serviceType === 'smm') {
        const reels = normalizeInt(body.serviceDetails?.reels);
        const posts = normalizeInt(body.serviceDetails?.posts);
        const stories = normalizeInt(body.serviceDetails?.stories);

        if ([reels, posts, stories].some((n) => Number.isNaN(n))) {
            return 'SMM counts (reels/posts/stories) must be valid numbers';
        }
        if ([reels, posts, stories].some((n) => n === undefined)) {
            return 'Please enter reels, posts, and stories for SMM projects';
        }
        if ([reels, posts, stories].some((n) => n < 0)) {
            return 'SMM counts (reels/posts/stories) cannot be negative';
        }
    }

    if (body.workstream !== undefined && body.workstream !== null && body.workstream !== '') {
        const ws = String(body.workstream).trim();
        if (!['smm', 'tech', 'general'].includes(ws)) {
            return 'Workstream must be one of: smm, tech, general';
        }
    }

    return null;
};

const stripMoneyFromProject = (projectDoc) => {
    const obj = projectDoc.toObject ? projectDoc.toObject() : { ...projectDoc };
    delete obj.budget;
    return obj;
};

// GET all projects
router.get('/', asyncHandler(async (req, res) => {
    const projects = await Project.find()
        .populate('client', 'name company')
        .populate('assignedTo', 'name email')
        .sort({ createdAt: -1 });

    if (req.user.role !== 'admin') {
        return res.json(projects.map(stripMoneyFromProject));
    }
    res.json(projects);
}));

// GET single project
router.get('/:id', asyncHandler(async (req, res) => {
    const project = await Project.findById(req.params.id)
        .populate('client', 'name company email')
        .populate('assignedTo', 'name email role');
    if (!project) { res.status(404); throw new Error('Project not found'); }
    if (req.user.role !== 'admin') {
        return res.json(stripMoneyFromProject(project));
    }
    res.json(project);
}));

// POST create project
router.post('/', asyncHandler(async (req, res) => {
    if (req.user.role !== 'admin') {
        delete req.body.budget;
    }
    const validationError = validateProjectPayload(req.body);
    if (validationError) {
        res.status(400);
        throw new Error(validationError);
    }
    const project = await Project.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json(project);
}));

// PUT update project
router.put('/:id', asyncHandler(async (req, res) => {
    if (req.user.role !== 'admin') {
        delete req.body.budget;
    }
    const validationError = validateProjectPayload(req.body);
    if (validationError) {
        res.status(400);
        throw new Error(validationError);
    }
    const project = await Project.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!project) { res.status(404); throw new Error('Project not found'); }
    res.json(project);
}));

// DELETE project
router.delete('/:id', authorize('admin', 'manager'), asyncHandler(async (req, res) => {
    const project = await Project.findByIdAndDelete(req.params.id);
    if (!project) { res.status(404); throw new Error('Project not found'); }
    res.json({ message: 'Project removed' });
}));

module.exports = router;
