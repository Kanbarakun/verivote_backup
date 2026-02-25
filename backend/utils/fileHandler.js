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
        const binId = BINS[type];
        
        if (!binId) {
            console.error(`Error: Bin ID for "${type}" is missing! Check your .env file.`);
            return [];
        }

        try {
            console.log(`Reading from ${type} bin...`);
            const response = await axios.get(`https://api.jsonbin.io/v3/b/${binId}/latest`, {
                headers: { 'X-Master-Key': API_KEY }
            });
            console.log(`Read from ${type} successful`);
            return response.data.record;
        } catch (err) {
            console.error(`Cloud Read Error (${type}):`, {
                status: err.response?.status,
                statusText: err.response?.statusText,
                data: err.response?.data,
                message: err.message
            });
            return [];
        }
    },

    write: async (type, data) => {
        const binId = BINS[type];
        if (!binId) {
            console.error(`Write Error: No bin ID for ${type}`);
            return false;
        }

        try {
            console.log(`Writing to ${type} bin...`);
            console.log(`Data size: ${JSON.stringify(data).length} bytes`);
            console.log(`Data preview:`, JSON.stringify(data).substring(0, 200) + '...');
            
            const response = await axios.put(`https://api.jsonbin.io/v3/b/${binId}`, data, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Master-Key': API_KEY
                }
            });
            
            console.log(`Write to ${type} successful:`, response.status);
            return true;
        } catch (err) {
            console.error(`Cloud Write Error (${type}):`, {
                status: err.response?.status,
                statusText: err.response?.statusText,
                data: err.response?.data,
                message: err.message,
                stack: err.stack
            });
            
            // Log the full error for debugging
            if (err.response) {
                console.error('Full error response:', JSON.stringify(err.response.data, null, 2));
            }
            
            return false;
        }
    }
};

module.exports = fileHandler;