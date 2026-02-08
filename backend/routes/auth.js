const express = require ('express');
const router = express.Router();
const fileHandler = require('../utils/fileHandler');

// --- REGISTRATION ---
router.post('/register', async (req, res) => { // Added 'async'
    try {
        const { name, email, password } = req.body;

        // Use 'await' because fileHandler.read() now fetches from the cloud
        const users = await fileHandler.read('users');

        // Check if user already exists
        if (users.find(u => u.email === email)) {
            return res.status(400).json({ success: false, message: "User already exists" });
        }

        // Add new user
        const newUser = { name, email, password };
        users.push(newUser);

        // Use 'await' to ensure data is saved to JSONBin before sending response
        const saved = await fileHandler.write('users', users);

        if (saved) {
            res.json({ success: true, message: "Registration successful!" });
        } else {
            res.status(500).json({ success: false, message: "Failed to save to cloud" });
        }
    } catch (error) {
        console.error("Register Error:", error);
        res.status(500).json({ success: false, message: "Server error during registration" });
    }
});

// --- LOGIN ---
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const users = await fileHandler.read('users'); // Ensure this matches your file helper

        // SAFETY CHECK: If users is null or undefined, don't crash the server
        if (!users || !Array.isArray(users)) {
            console.error("DATABASE ERROR: Users bin is empty or unreachable.");
            return res.status(500).json({ success: false, message: "Database connection failed." });
        }

        const user = users.find(u => u.email === email);
        if (!user) return res.status(401).json({ success: false, message: "Account not found." });

        // ... rest of your bcrypt compare logic ...
    } catch (err) {
        console.error("CRITICAL LOGIN ERROR:", err);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
});
module.exports = router;