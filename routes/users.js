const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

// GET all team members (any authenticated user can see team list)
router.get('/', asyncHandler(async (req, res) => {
    const users = await User.find().sort({ createdAt: -1 }).select('-password');
    res.json(users);
}));

// GET single user
router.get('/:id', asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) { res.status(404); throw new Error('User not found'); }
    res.json(user);
}));

// PUT update user (admin can change roles)
router.put('/:id', asyncHandler(async (req, res) => {
    // Non-admins can only edit themselves and cannot change role
    if (req.user.role !== 'admin' && req.user._id.toString() !== req.params.id) {
        res.status(403);
        throw new Error('Not authorized to edit this user');
    }
    if (req.user.role !== 'admin') delete req.body.role;

    // If password is being updated, re-hash it
    if (req.body.password) {
        const bcrypt = require('bcryptjs');
        const salt = await bcrypt.genSalt(10);
        req.body.password = await bcrypt.hash(req.body.password, salt);
    }

    const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!user) { res.status(404); throw new Error('User not found'); }
    res.json(user);
}));

// DELETE user (admin only)
router.delete('/:id', authorize('admin'), asyncHandler(async (req, res) => {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) { res.status(404); throw new Error('User not found'); }
    res.json({ message: 'User removed' });
}));

module.exports = router;
