const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const sendEmail = require('../utils/sendEmail');

// Generate JWT
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE,
    });
};

// @desc    Register user (first user is admin)
// @route   POST /api/auth/register
// @access  Public
router.post(
    '/register',
    asyncHandler(async (req, res) => {
        const { name, email, password, role, phone, department, jobTitle } = req.body;

        const userExists = await User.findOne({ email });
        if (userExists) {
            res.status(400);
            throw new Error('User already exists');
        }

        const userCount = await User.countDocuments();

        // If system already has users, block public registration
        if (userCount > 0) {
            // Check if there is an auth header with a valid token
            let token;
            if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
                token = req.headers.authorization.split(' ')[1];
            }

            if (!token) {
                res.status(401);
                throw new Error('Not authorized to access this route');
            }

            try {
                // Verify token
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                const requestingUser = await User.findById(decoded.id);

                if (!requestingUser || requestingUser.role !== 'admin') {
                    res.status(403);
                    throw new Error('Not authorized to access this route');
                }
            } catch (err) {
                res.status(401);
                throw new Error('Not authorized to access this route');
            }
        }

        // First registered user becomes admin
        const assignedRole = userCount === 0 ? 'admin' : role || 'staff';

        const user = await User.create({
            name,
            email,
            password,
            role: assignedRole,
            phone: phone || '',
            department: department || '',
            jobTitle: jobTitle || '',
        });

        // Send Welcome Email
        try {
            const htmlMessage = `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #413634; background-color: #FFF7F3;">
                    <h2>Welcome to Servora!</h2>
                    <p>Hi ${name},</p>
                    <p>An account has been created for you on the Servora platform with the role of <strong>${assignedRole}</strong>.</p>
                    <p>Here are your login details:</p>
                    <ul>
                        <li><strong>Email:</strong> ${email}</li>
                        <li><strong>Password:</strong> ${password}</li>
                    </ul>
                    <p>Please log in and change your password as soon as possible.</p>
                    <br/>
                    <p>Best regards,</p>
                    <p>The Servora Team</p>
                </div>
            `;

            await sendEmail({
                email: user.email,
                subject: 'Welcome to Servora - Login Details',
                html: htmlMessage,
            });
        } catch (err) {
            console.error('Email sending failed', err);
            // Even if email fails, user is created, so we don't throw an error here,
            // but we might want to log it for admins.
        }

        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            jobTitle: user.jobTitle || '',
            department: user.department || '',
            phone: user.phone || '',
            token: generateToken(user._id),
        });
    })
);

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
router.post(
    '/login',
    asyncHandler(async (req, res) => {
        const { email, password } = req.body;

        const user = await User.findOne({ email }).select('+password');
        if (!user || !(await user.matchPassword(password))) {
            res.status(401);
            throw new Error('Invalid email or password');
        }

        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            jobTitle: user.jobTitle || '',
            department: user.department || '',
            phone: user.phone || '',
            token: generateToken(user._id),
        });
    })
);

// @desc    Get current logged-in user
// @route   GET /api/auth/me
// @access  Private
router.get(
    '/me',
    protect,
    asyncHandler(async (req, res) => {
        res.json(req.user);
    })
);

// @desc    Check if any users exist to toggle registration form
// @route   GET /api/auth/has-users
// @access  Public
router.get(
    '/has-users',
    asyncHandler(async (req, res) => {
        const userCount = await User.countDocuments();
        res.json({ hasUsers: userCount > 0 });
    })
);

module.exports = router;
