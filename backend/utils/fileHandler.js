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

const fileHandler = {
    read: async (type) => {
        const binId = BINS[type]; // Get ID from our BINS object
        
        if (!binId) {
            console.error(`Error: Bin ID for "${type}" is missing! Check your .env file.`);
            return [];
        }

        try {
            const response = await axios.get(`https://api.jsonbin.io/v3/b/${binId}/latest`, {
                headers: { 'X-Master-Key': API_KEY }
            });
            return response.data.record;
        } catch (err) {
            // Better error logging
            console.error(`Cloud Read Error (${type}):`, err.response?.data?.message || err.message);
            return [];
        }
    },

    write: async (type, data) => {
        const binId = BINS[type];
        if (!binId) return false;

        try {
            await axios.put(`https://api.jsonbin.io/v3/b/${binId}`, data, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Master-Key': API_KEY
                }
            });
            return true;
        } catch (err) {
            console.error(`Cloud Write Error (${type}):`, err.response?.data?.message || err.message);
            return false;
        }
    }
};

module.exports = fileHandler;