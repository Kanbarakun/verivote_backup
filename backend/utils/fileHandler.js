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
                headers: { 
                    'X-Master-Key': API_KEY,
                    'X-Bin-Meta': 'false'
                }
            });
            
            console.log(`✅ Read from ${type} successful`);
            
            // FIX: Handle different data structures automatically
            const data = response.data;
            
            // If it's an array, return it directly
            if (Array.isArray(data)) {
                return data;
            }
            
            // If it's an object with a property matching the type name (e.g., { votes: [...] })
            if (data && data[type]) {
                return data[type];
            }
            
            // If it's an object with 'data' property
            if (data && data.data) {
                return data.data;
            }
            
            // If it's an object with 'records' property
            if (data && data.records) {
                return data.records;
            }
            
            // If it's some other object, return it as is (might be settings, etc.)
            if (data && typeof data === 'object') {
                return data;
            }
            
            // Default fallback
            return [];
            
        } catch (err) {
            console.error(`❌ Cloud Read Error (${type}):`, {
                status: err.response?.status,
                statusText: err.response?.statusText,
                message: err.message
            });
            
            // Return appropriate empty structure based on type
            if (type === 'settings' || type === 'elections') {
                return {};
            }
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
            
            // IMPORTANT: Ensure data is never null or undefined
            let dataToSend = data !== null && data !== undefined ? data : [];
            
            // FIX: JSONBin REQUIRES an object at the root level, NEVER a raw array
            // Wrap the data in an object with the type as the key
            let wrappedData;
            
            if (Array.isArray(dataToSend)) {
                // For arrays (votes, users, candidates, etc.), wrap with type as key
                wrappedData = {
                    [type]: dataToSend
                };
                console.log(`📦 Wrapping array in { ${type}: [...] } for JSONBin compatibility`);
            } else if (typeof dataToSend === 'object' && !dataToSend[type]) {
                // For objects that don't already have the type key, wrap them
                wrappedData = {
                    [type]: dataToSend
                };
                console.log(`📦 Wrapping object in { ${type}: ... } for JSONBin compatibility`);
            } else {
                // Already properly formatted
                wrappedData = dataToSend;
            }
            
            console.log(`Data structure:`, Object.keys(wrappedData));
            console.log(`Data size: ${JSON.stringify(wrappedData).length} bytes`);
            
            const response = await axios.put(`https://api.jsonbin.io/v3/b/${binId}`, wrappedData, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Master-Key': API_KEY,
                    'X-Bin-Meta': 'false'
                }
            });
            
            console.log(`✅ Write to ${type} successful:`, response.status);
            return true;
            
        } catch (err) {
            console.error(`❌ Cloud Write Error (${type}):`, {
                status: err.response?.status,
                statusText: err.response?.statusText,
                message: err.message,
                binId: binId,
                responseData: err.response?.data
            });
            
            // Log more details for debugging
            if (err.response?.data) {
                console.error('Full error response:', JSON.stringify(err.response.data, null, 2));
            }
            
            return false;
        }
    }
};

module.exports = fileHandler;