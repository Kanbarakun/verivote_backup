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
    // READ: Automatically extracts the array from the wrapped object
    read: async (type) => {
        const binId = BINS[type];
        
        if (!binId) {
            console.error(`❌ Error: Bin ID for "${type}" is missing! Check your .env file.`);
            return type === 'settings' || type === 'elections' ? {} : [];
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
            
            const data = response.data;
            
            // Handle different response structures
            if (!data) {
                return type === 'settings' || type === 'elections' ? {} : [];
            }
            
            // If data has a property matching the type (e.g., { votes: [...] })
            if (data[type] !== undefined) {
                return data[type];
            }
            
            // If data is directly an array (for backwards compatibility)
            if (Array.isArray(data)) {
                return data;
            }
            
            // If data is an object with 'data' property
            if (data.data !== undefined) {
                return data.data;
            }
            
            // For settings/elections that might be objects
            if (typeof data === 'object') {
                return data;
            }
            
            // Default fallback
            return type === 'settings' || type === 'elections' ? {} : [];
            
        } catch (err) {
            console.error(`❌ Cloud Read Error (${type}):`, {
                status: err.response?.status,
                statusText: err.response?.statusText,
                message: err.message
            });
            
            // Return appropriate empty structure
            return type === 'settings' || type === 'elections' ? {} : [];
        }
    },

    // WRITE: Automatically wraps arrays in { type: [...] } for JSONBin
    write: async (type, data) => {
        const binId = BINS[type];
        
        if (!binId) {
            console.error(`❌ Write Error: No bin ID for ${type}`);
            return false;
        }

        try {
            console.log(`📝 Writing to ${type} bin...`);
            console.log(`Bin ID: ${binId}`);
            
            // Ensure data is never null or undefined
            let dataToWrite = data !== null && data !== undefined ? data : [];
            
            // For settings/elections that are objects, keep as is
            // For arrays (users, votes, candidates, activities, admins), wrap them
            let wrappedData;
            
            if (Array.isArray(dataToWrite)) {
                // This is the key fix: wrap arrays in an object with the type as key
                wrappedData = {
                    [type]: dataToWrite
                };
                console.log(`📦 Wrapped array in { ${type}: [...] } for JSONBin compatibility`);
            } else {
                // Already an object, use as is
                wrappedData = dataToWrite;
            }
            
            console.log(`Data structure keys:`, Object.keys(wrappedData));
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