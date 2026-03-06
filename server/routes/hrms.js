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

// POST /api/hrms/check-in
router.post('/check-in', asyncHandler(async (req, res) => {
    const ts = await getOrCreateToday(req.user._id);
    if (ts.checkInAt && !ts.checkOutAt) {
        res.status(400);
        throw new Error('Already checked in');
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

module.exports = router;

