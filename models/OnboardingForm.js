const mongoose = require('mongoose');
const crypto = require('crypto');

const OnboardingFormSchema = new mongoose.Schema(
    {
        client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
        clientName: { type: String, default: '', trim: true },
        token: { type: String, unique: true, default: () => crypto.randomBytes(16).toString('hex') },
        status: { type: String, enum: ['draft', 'sent', 'submitted'], default: 'draft' },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

        // Section 1 – Basic Brand Info
        brandName: { type: String, default: '' },
        founderName: { type: String, default: '' },
        yearStarted: { type: String, default: '' },
        businessType: { type: String, default: '' },
        brandLocation: { type: String, default: '' },
        contactEmail: { type: String, default: '' },
        contactPhone: { type: String, default: '' },
        website: { type: String, default: '' },

        // Section 2 – About the Brand
        brandDescription: { type: String, default: '' },
        brandInspiration: { type: String, default: '' },
        problemSolved: { type: String, default: '' },
        uniqueness: { type: String, default: '' },

        // Section 3 – Founder Story
        founderJourney: { type: String, default: '' },
        whyStarted: { type: String, default: '' },
        futureVision: { type: String, default: '' },
        achievements: { type: String, default: '' },

        // Section 4 – Products / Services
        productsServices: { type: String, default: '' },
        bestSellers: { type: String, default: '' },
        signatureProducts: { type: String, default: '' },
        priceRange: { type: String, default: '' },

        // Section 5 – Mission & Vision
        brandMission: { type: String, default: '' },
        brandVision: { type: String, default: '' },
        brandValues: { type: String, default: '' },

        // Section 6 – Target Audience
        idealCustomer: { type: String, default: '' },
        ageGroup: { type: String, default: '' },
        audienceLocation: { type: String, default: '' },
        typicalBuyers: { type: String, default: '' },

        // Section 7 – Brand Personality
        brandPersonality: [{ type: String }], // array of selected words

        // Section 8 – Competitors
        competitors: { type: String, default: '' },
        inspiringBrands: { type: String, default: '' },

        // Section 9 – Social Media
        instagram: { type: String, default: '' },
        facebook: { type: String, default: '' },
        youtube: { type: String, default: '' },
        tiktok: { type: String, default: '' },
        followerCount: { type: String, default: '' },

        // Section 10 – Content Preferences
        contentPreferences: [{ type: String }],

        // Section 11 – Campaign Goals
        campaignGoals: [{ type: String }],

        // Section 12 – Additional
        upcomingEvents: { type: String, default: '' },
        specialMessage: { type: String, default: '' },
        additionalInfo: { type: String, default: '' },

        submittedAt: { type: Date },
    },
    { timestamps: true }
);

module.exports = mongoose.model('OnboardingForm', OnboardingFormSchema);
