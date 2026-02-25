const axios = require('axios');
require('dotenv').config();

const API_KEY = process.env.JSONBIN_API_KEY;

// Map your data types to their specific Bin IDs from JSONBin.io
const BINS = {
    users: process.env.BIN_ID_USERS,
    candidates: process.env.BIN_ID_CANDIDATES,
    elections: process.env.BIN_ID_ELECTIONS,
    votes: process.env.BIN_ID_VOTES,
    admins: process.env.BIN_ID_ADMINS,
    activities: process.env.BIN_ID_ACTIVITIES
};

// Log which bins are configured on startup
console.log('=== JSONBin Configuration ===');
Object.keys(BINS).forEach(key => {
    console.log(`${key}: ${BINS[key] ? '✅ Configured' : '❌ MISSING'}`);
});
console.log('============================');

const fileHandler = {
    read: async (type) => {
        const binId = BINS[type];
        
        if (!binId) {
            console.error(`❌ Error: Bin ID for "${type}" is missing! Check your .env file.`);
            return [];
        }

        try {
            console.log(`📖 Reading from ${type} bin...`);
            const response = await axios.get(`https://api.jsonbin.io/v3/b/${binId}/latest`, {
                headers: { 'X-Master-Key': API_KEY }
            });
            console.log(`✅ Read from ${type} successful`);
            return response.data.record;
        } catch (err) {
            console.error(`❌ Cloud Read Error (${type}):`, {
                status: err.response?.status,
                statusText: err.response?.statusText,
                message: err.message
            });
            return [];
        }
    },

    write: async (type, data) => {
        const binId = BINS[type];
        
        if (!binId) {
            console.error(`❌ Write Error: No bin ID for ${type}`);
            return false;
        }

        try {
            console.log(`📝 Writing to ${type} bin...`);
            console.log(`Bin ID: ${binId}`);
            
            const response = await axios.put(`https://api.jsonbin.io/v3/b/${binId}`, data, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Master-Key': API_KEY
                }
            });
            
            console.log(`✅ Write to ${type} successful:`, response.status);
            return true;
        } catch (err) {
            console.error(`❌ Cloud Write Error (${type}):`, {
                status: err.response?.status,
                statusText: err.response?.statusText,
                message: err.message,
                binId: binId // This will show us if binId is undefined
            });
            return false;
        }
    }
};

module.exports = fileHandler;