const mongoose = require('mongoose');

const WorkBlockSchema = new mongoose.Schema(
    {
        startAt: { type: Date, required: true },
        endAt: { type: Date, required: true },
        minutes: { type: Number, required: true, min: 1 },
        project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
        task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
        taskText: { type: String, default: '', trim: true, maxlength: 200 },
        note: { type: String, default: '', trim: true },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        createdAt: { type: Date, default: Date.now },
    },
    { _id: true }
);

const TimeSheetSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        day: { type: String, required: true, index: true }, // YYYY-MM-DD in server local time
        checkInAt: { type: Date },
        checkOutAt: { type: Date },
        workBlocks: { type: [WorkBlockSchema], default: [] },
    },
    { timestamps: true }
);

TimeSheetSchema.index({ user: 1, day: 1 }, { unique: true });

module.exports = mongoose.model('TimeSheet', TimeSheetSchema);

