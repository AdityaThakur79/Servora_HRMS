// Centralized lead pipeline statuses with labels, colors, and grouping

export const LEAD_PIPELINE_GROUPS = [
    {
        label: 'Incoming',
        color: '#8b5cf6',
        statuses: ['new-lead', 'lead-captured', 'unassigned'],
    },
    {
        label: 'Initial Contact',
        color: '#3b82f6',
        statuses: ['attempted-contact', 'contacted', 'no-response', 'wrong-number'],
    },
    {
        label: 'Qualification',
        color: '#f59e0b',
        statuses: ['interested', 'not-interested', 'budget-issue', 'qualified-lead'],
    },
    {
        label: 'Sales Stage',
        color: '#f97316',
        statuses: ['meeting-scheduled', 'discovery-call-done', 'requirement-collected', 'proposal-sent', 'negotiation'],
    },
    {
        label: 'Decision',
        color: '#6366f1',
        statuses: ['follow-up-pending', 'waiting-for-client', 'decision-pending'],
    },
    {
        label: 'Final',
        color: '#10b981',
        statuses: ['won', 'lost', 'not-now'],
    },
];

export const LEAD_STATUS_MAP = {
    // Incoming
    'new-lead':            { label: 'New Lead',            color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)',  group: 'Incoming' },
    'lead-captured':       { label: 'Lead Captured',       color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', group: 'Incoming' },
    'unassigned':          { label: 'Unassigned',          color: '#7c3aed', bg: 'rgba(124,58,237,0.12)',  group: 'Incoming' },
    // Initial Contact
    'attempted-contact':   { label: 'Attempted Contact',   color: '#3b82f6', bg: 'rgba(59,130,246,0.12)',  group: 'Initial Contact' },
    'contacted':           { label: 'Contacted',           color: '#60a5fa', bg: 'rgba(96,165,250,0.12)',  group: 'Initial Contact' },
    'no-response':         { label: 'No Response',         color: '#93c5fd', bg: 'rgba(147,197,253,0.12)', group: 'Initial Contact' },
    'wrong-number':        { label: 'Wrong Number',        color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   group: 'Initial Contact' },
    // Qualification
    'interested':          { label: 'Interested',          color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  group: 'Qualification' },
    'not-interested':      { label: 'Not Interested',      color: '#d97706', bg: 'rgba(217,119,6,0.12)',   group: 'Qualification' },
    'budget-issue':        { label: 'Budget Issue',        color: '#b45309', bg: 'rgba(180,83,9,0.12)',    group: 'Qualification' },
    'qualified-lead':      { label: 'Qualified Lead',      color: '#eab308', bg: 'rgba(234,179,8,0.12)',   group: 'Qualification' },
    // Sales Stage
    'meeting-scheduled':   { label: 'Meeting Scheduled',   color: '#f97316', bg: 'rgba(249,115,22,0.12)',  group: 'Sales Stage' },
    'discovery-call-done': { label: 'Discovery Call Done', color: '#fb923c', bg: 'rgba(251,146,60,0.12)',  group: 'Sales Stage' },
    'requirement-collected':{ label: 'Requirement Collected', color: '#fdba74', bg: 'rgba(253,186,116,0.12)', group: 'Sales Stage' },
    'proposal-sent':       { label: 'Proposal Sent',       color: '#ea580c', bg: 'rgba(234,88,12,0.12)',   group: 'Sales Stage' },
    'negotiation':         { label: 'Negotiation',         color: '#c2410c', bg: 'rgba(194,65,12,0.12)',   group: 'Sales Stage' },
    // Decision
    'follow-up-pending':   { label: 'Follow-up Pending',   color: '#6366f1', bg: 'rgba(99,102,241,0.12)',  group: 'Decision' },
    'waiting-for-client':  { label: 'Waiting for Client',  color: '#818cf8', bg: 'rgba(129,140,248,0.12)', group: 'Decision' },
    'decision-pending':    { label: 'Decision Pending',    color: '#4f46e5', bg: 'rgba(79,70,229,0.12)',   group: 'Decision' },
    // Final
    'won':                 { label: 'Won',                 color: '#10b981', bg: 'rgba(16,185,129,0.12)',  group: 'Final' },
    'lost':                { label: 'Lost',                color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   group: 'Final' },
    'not-now':             { label: 'Not Now',             color: '#6b7280', bg: 'rgba(107,114,128,0.12)', group: 'Final' },
};

export const ALL_LEAD_STATUSES = Object.keys(LEAD_STATUS_MAP);

// Map legacy statuses to new ones
const LEGACY_MAP = {
    'new': 'new-lead',
    'qualified': 'qualified-lead',
    'proposal': 'proposal-sent',
};

export const normalizeLegacyStatus = (status) => LEGACY_MAP[status] || status;

export const getStatusInfo = (status) => {
    const normalized = normalizeLegacyStatus(status);
    return LEAD_STATUS_MAP[normalized] || { label: status, color: '#6b7280', bg: 'rgba(107,114,128,0.12)', group: 'Unknown' };
};
