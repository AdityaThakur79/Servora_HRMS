const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const Client = require('../models/Client');
const Project = require('../models/Project');
const Task = require('../models/Task');
const Invoice = require('../models/Invoice');
const ServiceRequest = require('../models/ServiceRequest');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

// GET /api/dashboard/stats (admin only)
router.get('/stats', authorize('admin'), asyncHandler(async (req, res) => {
    const [
        totalClients,
        totalProjects,
        activeProjects,
        totalTasks,
        pendingTasks,
        totalUsers,
        invoices,
        openRequests,
        recentClients,
        recentProjects,
    ] = await Promise.all([
        Client.countDocuments(),
        Project.countDocuments(),
        Project.countDocuments({ status: 'active' }),
        Task.countDocuments(),
        Task.countDocuments({ status: { $in: ['todo', 'in-progress'] } }),
        User.countDocuments(),
        Invoice.find(),
        ServiceRequest.countDocuments({ status: 'open' }),
        Client.find().sort({ createdAt: -1 }).limit(5).select('name company status'),
        Project.find().sort({ createdAt: -1 }).limit(5)
            .populate('client', 'name')
            .select('name status priority client'),
    ]);

    const totalRevenue = invoices
        .filter(inv => inv.status === 'paid')
        .reduce((sum, inv) => sum + inv.total, 0);

    const pendingRevenue = invoices
        .filter(inv => ['sent', 'overdue'].includes(inv.status))
        .reduce((sum, inv) => sum + inv.total, 0);

    res.json({
        totalClients,
        totalProjects,
        activeProjects,
        totalTasks,
        pendingTasks,
        totalUsers,
        totalRevenue,
        pendingRevenue,
        openRequests,
        recentClients,
        recentProjects,
    });
}));

module.exports = router;
