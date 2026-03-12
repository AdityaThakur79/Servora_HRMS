const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const OnboardingForm = require('../models/OnboardingForm');
const { protect } = require('../middleware/auth');

// ─── PUBLIC: Get form by token (no auth) ───
router.get('/public/:token', asyncHandler(async (req, res) => {
    const form = await OnboardingForm.findOne({ token: req.params.token });
    if (!form) { res.status(404); throw new Error('Form not found'); }
    res.json(form);
}));

// ─── PUBLIC: Submit form by token (no auth) ───
router.put('/public/:token', asyncHandler(async (req, res) => {
    const form = await OnboardingForm.findOne({ token: req.params.token });
    if (!form) { res.status(404); throw new Error('Form not found'); }

    // Update all submitted fields
    const fields = [
        'brandName','founderName','yearStarted','businessType','brandLocation',
        'contactEmail','contactPhone','website','brandDescription','brandInspiration',
        'problemSolved','uniqueness','founderJourney','whyStarted','futureVision',
        'achievements','productsServices','bestSellers','signatureProducts','priceRange',
        'brandMission','brandVision','brandValues','idealCustomer','ageGroup',
        'audienceLocation','typicalBuyers','brandPersonality','competitors',
        'inspiringBrands','instagram','facebook','youtube','tiktok','followerCount',
        'contentPreferences','campaignGoals','upcomingEvents','specialMessage','additionalInfo',
    ];
    for (const f of fields) {
        if (req.body[f] !== undefined) form[f] = req.body[f];
    }
    form.status = 'submitted';
    form.submittedAt = new Date();
    await form.save();
    res.json(form);
}));

// ─── PROTECTED ROUTES (admin) ───
router.use(protect);

// GET all forms
router.get('/', asyncHandler(async (req, res) => {
    const forms = await OnboardingForm.find()
        .populate('client', 'name company')
        .populate('createdBy', 'name')
        .sort({ createdAt: -1 });
    res.json(forms);
}));

// GET single form by id
router.get('/:id', asyncHandler(async (req, res) => {
    const form = await OnboardingForm.findById(req.params.id)
        .populate('client', 'name company email phone')
        .populate('createdBy', 'name');
    if (!form) { res.status(404); throw new Error('Form not found'); }
    res.json(form);
}));

// POST create new form
router.post('/', asyncHandler(async (req, res) => {
    const { client, clientName } = req.body;
    const form = await OnboardingForm.create({
        client: client || undefined,
        clientName: clientName || '',
        createdBy: req.user._id,
        status: 'sent',
    });
    const populated = await OnboardingForm.findById(form._id)
        .populate('client', 'name company')
        .populate('createdBy', 'name');
    res.status(201).json(populated);
}));

// DELETE form
router.delete('/:id', asyncHandler(async (req, res) => {
    const form = await OnboardingForm.findByIdAndDelete(req.params.id);
    if (!form) { res.status(404); throw new Error('Form not found'); }
    res.json({ message: 'Form deleted' });
}));

module.exports = router;
