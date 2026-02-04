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
rrouter.post('/login', async (req, res) => {
    const { email, password } = req.body; // Ensure this matches what frontend sends

    try {
        // 1. Find the user in your database/JSON file
        const user = users.find(u => u.email === email);
        if (!user) {
            return res.status(401).json({ success: false, message: "User not found" });
        }

        // 2. Check the password
        // If you used bcrypt to register, you MUST use bcrypt.compare here
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Incorrect password" });
        }

        // 3. Successful Login
        res.json({ success: true, userName: user.name, email: user.email });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

module.exports = router;