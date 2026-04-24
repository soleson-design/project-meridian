/*
 * PROJECT MERIDIAN - Configuration
 *
 * This file contains:
 * - Google Apps Script deployment URL
 * - API endpoint configuration
 * - US federal holidays for business day calculations
 * - Application constants
 */

const CONFIG = {
    // Google Apps Script Web App URL (replace with your deployment URL)
    API_URL: 'https://script.google.com/macros/s/AKfycbzkdCM_J56TeGHYKbiKaIUZXBOqlOOpi7ptZtkUC1vd7zaE6EmIffQdrXU55gnLjLgg/exec',

    // Refresh interval for polling data (in milliseconds)
    REFRESH_INTERVAL: 30000, // 30 seconds

    // API timeout
    API_TIMEOUT: 10000, // 10 seconds

    // Application settings
    APP_NAME: 'Project Meridian',
    APP_VERSION: '1.0.0',

    // Task status options
    STATUSES: [
        'Not Started',
        'In Progress',
        'Complete'
    ],

    // US Federal Holidays for 2026 (for business day calculations)
    // Format: YYYY-MM-DD
    FEDERAL_HOLIDAYS_2026: [
        '2026-01-01', // New Year's Day
        '2026-01-19', // Martin Luther King Jr. Day
        '2026-02-16', // Presidents' Day
        '2026-05-25', // Memorial Day
        '2026-07-03', // Independence Day (observed)
        '2026-09-07', // Labor Day
        '2026-10-12', // Columbus Day
        '2026-11-11', // Veterans Day
        '2026-11-26', // Thanksgiving
        '2026-12-25'  // Christmas
    ],

    // Entity color mapping for badges
    ENTITY_COLORS: {
        'US': '#08CA4A',
        'Germany': '#FF6B35',
        'UK': '#4A90E2',
        'AGS': '#9B59B6',
        'PythonAnywhere': '#E74C3C',
        'Step Computing': '#F39C12'
    }
};

// Freeze config to prevent accidental modifications
Object.freeze(CONFIG);
