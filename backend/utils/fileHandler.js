const fs = require('fs');
const path = require('path');

const fileHandler = {
    read: (filename) => {
        // This ensures it always finds the 'data' folder relative to this file
        const filePath = path.join(__dirname, '../data', filename);
        try {
            if (!fs.existsSync(filePath)) return [];
            const data = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(data || '[]');
        } catch (err) {
            console.error(`Error reading ${filename}:`, err);
            return [];
        }
    },
    write: (filename, data) => {
        const filePath = path.join(__dirname, '../data', filename);
        try {
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
            return true;
        } catch (err) {
            console.error(`Error writing ${filename}:`, err);
            return false;
        }
    }
};

module.exports = fileHandler;