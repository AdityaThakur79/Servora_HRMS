const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const TimeSheet = require('../models/TimeSheet');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

const toDayKey = (date = new Date()) => {
    const d = new Date(date);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};

const getOrCreateToday = async (userId) => {
    const day = toDayKey(new Date());
    const existing = await TimeSheet.findOne({ user: userId, day });
    if (existing) return existing;
    return await TimeSheet.create({ user: userId, day, workBlocks: [] });
};

const getOrCreateByDay = async (userId, day) => {
    const existing = await TimeSheet.findOne({ user: userId, day });
    if (existing) return existing;
    return await TimeSheet.create({ user: userId, day, workBlocks: [] });
};

const populateTimeSheet = async (ts) => {
    return await TimeSheet.findById(ts._id)
        .populate('workBlocks.project', 'name')
        .populate('workBlocks.createdBy', 'name email');
};

const roundDownToHour = (d) => {
    const x = new Date(d);
    x.setMinutes(0, 0, 0);
    return x;
};

const isOverlap = (aStart, aEnd, bStart, bEnd) => aStart < bEnd && bStart < aEnd;

// GET /api/hrms/today
router.get('/today', asyncHandler(async (req, res) => {
    const ts = await getOrCreateToday(req.user._id);
    res.json(await populateTimeSheet(ts));
}));

// GET /api/hrms/day?day=YYYY-MM-DD
router.get('/day', asyncHandler(async (req, res) => {
    const day = String(req.query.day || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
        res.status(400);
        throw new Error('Invalid day format. Use YYYY-MM-DD');
    }
    const ts = await getOrCreateByDay(req.user._id, day);
    res.json(await populateTimeSheet(ts));
}));

// Helper function to calculate distance between two coordinates (Haversine formula)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
};

// POST /api/hrms/check-in
// Body: { latitude, longitude }
router.post('/check-in', asyncHandler(async (req, res) => {
    const ts = await getOrCreateToday(req.user._id);
    if (ts.checkInAt && !ts.checkOutAt) {
        res.status(400);
        throw new Error('Already checked in');
    }

    // Validate location if office coordinates are set
    const officeLatitude = process.env.OFFICE_LATITUDE;
    const officeLongitude = process.env.OFFICE_LONGITUDE;
    
    if (officeLatitude && officeLongitude) {
        const { latitude, longitude } = req.body;
        
        if (!latitude || !longitude) {
            res.status(400);
            throw new Error('Location is required for check-in');
        }

        const distance = calculateDistance(
            parseFloat(officeLatitude),
            parseFloat(officeLongitude),
            parseFloat(latitude),
            parseFloat(longitude)
        );

        if (distance > 200) {
            res.status(403);
            throw new Error(`You must be within 200m of the office to check in. Current distance: ${Math.round(distance)}m`);
        }
    }

    ts.checkInAt = new Date();
    ts.checkOutAt = null;
    await ts.save();
    res.status(200).json(await populateTimeSheet(ts));
}));

// POST /api/hrms/check-out
router.post('/check-out', asyncHandler(async (req, res) => {
    const ts = await getOrCreateToday(req.user._id);
    if (!ts.checkInAt) {
        res.status(400);
        throw new Error('Check in first');
    }
    if (ts.checkOutAt) {
        res.status(400);
        throw new Error('Already checked out');
    }

    // Validate that timeline is filled (all hours between check-in and now have work blocks)
    const checkInTime = new Date(ts.checkInAt);
    const now = new Date();
    const hoursWorked = Math.floor((now - checkInTime) / (1000 * 60 * 60));
    
    if (hoursWorked > 0 && ts.workBlocks.length === 0) {
        res.status(400);
        throw new Error('Please log your work hours before checking out');
    }

    // Check if all hours are filled
    const filledHours = new Set();
    ts.workBlocks.forEach(block => {
        const blockStart = new Date(block.startAt);
        const blockEnd = new Date(block.endAt);
        const blockHours = Math.ceil((blockEnd - blockStart) / (1000 * 60 * 60));
        for (let i = 0; i < blockHours; i++) {
            const hour = new Date(blockStart.getTime() + i * 60 * 60 * 1000);
            filledHours.add(Math.floor(hour.getTime() / (1000 * 60 * 60)));
        }
    });

    const requiredHours = new Set();
    for (let i = 0; i < hoursWorked; i++) {
        const hour = new Date(checkInTime.getTime() + i * 60 * 60 * 1000);
        requiredHours.add(Math.floor(hour.getTime() / (1000 * 60 * 60)));
    }

    const missingHours = [...requiredHours].filter(h => !filledHours.has(h));
    if (missingHours.length > 0) {
        res.status(400);
        throw new Error('Please fill all hours in your timeline before checking out');
    }

    ts.checkOutAt = new Date();
    await ts.save();
    res.status(200).json(await populateTimeSheet(ts));
}));

// POST /api/hrms/work-blocks/one-hour
// Body: { project?, note? }
router.post('/work-blocks/one-hour', asyncHandler(async (req, res) => {
    const ts = await getOrCreateToday(req.user._id);
    if (!ts.checkInAt || ts.checkOutAt) {
        res.status(400);
        throw new Error('You must be checked in to add work');
    }

    // Determine start time: end of last block OR check-in time
    const last = ts.workBlocks.length > 0 ? ts.workBlocks[0] : null;
    const baseStart = last ? new Date(last.endAt) : new Date(ts.checkInAt);
    const startAt = new Date(Math.max(baseStart.getTime(), ts.checkInAt.getTime()));
    const endAt = new Date(startAt.getTime() + 60 * 60 * 1000);

    const block = {
        startAt,
        endAt,
        minutes: 60,
        project: req.body.project || undefined,
        taskText: String(req.body.taskText || '').trim(),
        note: String(req.body.note || '').trim(),
        createdBy: req.user._id,
    };

    ts.workBlocks.unshift(block);
    await ts.save();
    res.status(201).json(await populateTimeSheet(ts));
}));

// POST /api/hrms/work-blocks/slot
// Body: { startAt, taskText, project?, note? }
router.post('/work-blocks/slot', asyncHandler(async (req, res) => {
    const ts = await getOrCreateToday(req.user._id);
    if (!ts.checkInAt) {
        res.status(400);
        throw new Error('Check in first');
    }

    const startAtRaw = req.body.startAt;
    const startAt = new Date(startAtRaw);
    if (!startAtRaw || Number.isNaN(startAt.getTime())) {
        res.status(400);
        throw new Error('startAt is required');
    }
    const slotStart = roundDownToHour(startAt);
    const slotEnd = new Date(slotStart.getTime() + 60 * 60 * 1000);

    // Must be within check-in day window
    if (slotEnd.getTime() <= new Date(ts.checkInAt).getTime()) {
        res.status(400);
        throw new Error('Slot must be after check-in time');
    }
    if (ts.checkOutAt && slotStart.getTime() >= new Date(ts.checkOutAt).getTime()) {
        res.status(400);
        throw new Error('Slot must be before check-out time');
    }

    // No duplicate slot starts
    const already = ts.workBlocks.find((b) => roundDownToHour(new Date(b.startAt)).getTime() === slotStart.getTime());
    if (already) {
        res.status(400);
        throw new Error('This hour slot is already logged');
    }

    // No overlap with existing blocks
    const overlap = ts.workBlocks.some((b) => isOverlap(slotStart, slotEnd, new Date(b.startAt), new Date(b.endAt)));
    if (overlap) {
        res.status(400);
        throw new Error('This hour overlaps with an existing entry');
    }

    ts.workBlocks.unshift({
        startAt: slotStart,
        endAt: slotEnd,
        minutes: 60,
        project: req.body.project || undefined,
        taskText: String(req.body.taskText || '').trim(),
        note: String(req.body.note || '').trim(),
        createdBy: req.user._id,
    });
    await ts.save();
    res.status(201).json(await populateTimeSheet(ts));
}));

// PATCH /api/hrms/work-blocks/:blockId
router.patch('/work-blocks/:blockId', asyncHandler(async (req, res) => {
    const ts = await getOrCreateToday(req.user._id);
    const block = ts.workBlocks.id(req.params.blockId);
    if (!block) {
        res.status(404);
        throw new Error('Work block not found');
    }

    if (req.body.project !== undefined) block.project = req.body.project || undefined;
    if (req.body.taskText !== undefined) block.taskText = String(req.body.taskText || '').trim();
    if (req.body.note !== undefined) block.note = String(req.body.note || '').trim();

    await ts.save();
    res.status(200).json(await populateTimeSheet(ts));
}));

// POST /api/hrms/work-blocks
// Body: { minutes, project?, note? }
router.post('/work-blocks', asyncHandler(async (req, res) => {
    const minutes = Number(req.body.minutes);
    if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 12 * 60) {
        res.status(400);
        throw new Error('Minutes must be between 1 and 720');
    }

    const ts = await getOrCreateToday(req.user._id);
    if (!ts.checkInAt || ts.checkOutAt) {
        res.status(400);
        throw new Error('You must be checked in to add work');
    }

    const last = ts.workBlocks.length > 0 ? ts.workBlocks[0] : null;
    const baseStart = last ? new Date(last.endAt) : new Date(ts.checkInAt);
    const startAt = new Date(Math.max(baseStart.getTime(), ts.checkInAt.getTime()));
    const endAt = new Date(startAt.getTime() + minutes * 60 * 1000);

    const block = {
        startAt,
        endAt,
        minutes: Math.round(minutes),
        project: req.body.project || undefined,
        taskText: String(req.body.taskText || '').trim(),
        note: String(req.body.note || '').trim(),
        createdBy: req.user._id,
    };

    ts.workBlocks.unshift(block);
    await ts.save();
    res.status(201).json(await populateTimeSheet(ts));
}));

// GET /api/hrms/reports/monthly?userId=...&month=YYYY-MM
router.get('/reports/monthly', authorize('admin', 'manager'), asyncHandler(async (req, res) => {
    const userId = String(req.query.userId || '').trim();
    const month = String(req.query.month || '').trim();

    if (!userId) {
        res.status(400);
        throw new Error('userId is required');
    }
    if (!/^\d{4}-\d{2}$/.test(month)) {
        res.status(400);
        throw new Error('Invalid month format. Use YYYY-MM');
    }

    const monthRegex = new RegExp(`^${month}-\\d{2}$`);
    const sheets = await TimeSheet.find({ user: userId, day: monthRegex })
        .sort({ day: 1 })
        .populate('user', 'name email role jobTitle')
        .populate('workBlocks.project', 'name');

    const totalMinutes = sheets.reduce((sum, s) => sum + (s.workBlocks || []).reduce((a, b) => a + Number(b.minutes || 0), 0), 0);
    const daysPresent = sheets.filter((s) => !!s.checkInAt).length;
    const daysWithWork = sheets.filter((s) => (s.workBlocks || []).length > 0).length;

    const days = sheets.map((s) => {
        const worked = (s.workBlocks || []).reduce((a, b) => a + Number(b.minutes || 0), 0);
        return {
            day: s.day,
            checkInAt: s.checkInAt,
            checkOutAt: s.checkOutAt,
            workedMinutes: worked,
            blocks: (s.workBlocks || [])
                .slice()
                .sort((a, b) => new Date(a.startAt) - new Date(b.startAt))
                .map((b) => ({
                    startAt: b.startAt,
                    endAt: b.endAt,
                    minutes: b.minutes,
                    project: b.project ? { _id: b.project._id, name: b.project.name } : null,
                    taskText: b.taskText || '',
                    note: b.note || '',
                })),
        };
    });

    res.json({
        user: sheets[0]?.user || null,
        month,
        totalMinutes,
        totalHours: Math.round((totalMinutes / 60) * 100) / 100,
        daysPresent,
        daysWithWork,
        days,
    });
}));

// GET /api/hrms/reports/monthly.csv?userId=...&month=YYYY-MM
// Admin only download endpoint
router.get('/reports/monthly.csv', authorize('admin'), asyncHandler(async (req, res) => {
    const userId = String(req.query.userId || '').trim();
    const month = String(req.query.month || '').trim();

    if (!userId) {
        res.status(400);
        throw new Error('userId is required');
    }
    if (!/^\d{4}-\d{2}$/.test(month)) {
        res.status(400);
        throw new Error('Invalid month format. Use YYYY-MM');
    }

    const monthRegex = new RegExp(`^${month}-\\d{2}$`);
    const sheets = await TimeSheet.find({ user: userId, day: monthRegex })
        .sort({ day: 1 })
        .populate('user', 'name email role jobTitle')
        .populate('workBlocks.project', 'name');

    const escapeCsv = (v) => {
        const s = String(v ?? '');
        if (/[",\n]/.test(s)) return `"${s.replaceAll('"', '""')}"`;
        return s;
    };

    const user = sheets[0]?.user;
    const safeName = String(user?.name || 'member').replaceAll(/[^a-z0-9-_]+/gi, '_');
    const filename = `monthly_report_${safeName}_${month}.csv`;

    const lines = [];
    lines.push([
        'memberName',
        'memberEmail',
        'memberJobTitle',
        'month',
        'day',
        'startTime',
        'endTime',
        'minutes',
        'project',
        'task',
        'note',
    ].join(','));

    for (const s of sheets) {
        const day = s.day;
        const blocks = (s.workBlocks || []).slice().sort((a, b) => new Date(a.startAt) - new Date(b.startAt));
        for (const b of blocks) {
            lines.push([
                escapeCsv(user?.name || ''),
                escapeCsv(user?.email || ''),
                escapeCsv(user?.jobTitle || ''),
                escapeCsv(month),
                escapeCsv(day),
                escapeCsv(new Date(b.startAt).toISOString()),
                escapeCsv(new Date(b.endAt).toISOString()),
                escapeCsv(b.minutes || 0),
                escapeCsv(b.project?.name || ''),
                escapeCsv(b.taskText || ''),
                escapeCsv(b.note || ''),
            ].join(','));
        }
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(lines.join('\n'));
}));

// GET /api/hrms/not-checked-out
// Returns list of users who checked in today but haven't checked out
router.get('/not-checked-out', asyncHandler(async (req, res) => {
    const today = toDayKey(new Date());
    
    const timesheets = await TimeSheet.find({
        day: today,
        checkInAt: { $exists: true, $ne: null },
        checkOutAt: null
    }).populate('user', 'name email jobTitle avatar');

    const notCheckedOut = timesheets.map(ts => ({
        user: ts.user,
        checkInAt: ts.checkInAt,
        workedMinutes: ts.workBlocks.reduce((sum, b) => sum + (b.minutes || 0), 0)
    }));

    res.json(notCheckedOut);
}));

// GET /api/hrms/team-tasks-today
// Returns today's tasks for all team members
router.get('/team-tasks-today', asyncHandler(async (req, res) => {
    const Task = require('../models/Task');
    const User = require('../models/User');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get all users
    const users = await User.find({ isActive: true }).select('name email jobTitle avatar');

    // Get today's tasks for all users
    const tasks = await Task.find({
        dueDate: { $gte: today, $lt: tomorrow }
    }).populate('assignedTo', 'name email')
      .populate('project', 'name');

    // Group tasks by user
    const tasksByUser = {};
    users.forEach(user => {
        tasksByUser[user._id.toString()] = {
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                jobTitle: user.jobTitle,
                avatar: user.avatar
            },
            tasks: []
        };
    });

    tasks.forEach(task => {
        if (task.assignedTo) {
            const userId = task.assignedTo._id.toString();
            if (tasksByUser[userId]) {
                tasksByUser[userId].tasks.push({
                    _id: task._id,
                    title: task.title,
                    status: task.status,
                    priority: task.priority,
                    project: task.project,
                    dueDate: task.dueDate
                });
            }
        }
    });

    res.json(Object.values(tasksByUser));
}));

module.exports = router;

