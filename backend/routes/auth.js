const express = require ('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const fileHandler = require('../utils/fileHandler');

// --- REGISTRATION ---
router.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        const users = await fileHandler.read('users');

        if (users.find(u => u.email === email)) {
            return res.status(400).json({ success: false, message: "User already exists" });
        }

        // ✅ HASH PASSWORD (THE MISSING PART)
        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = {
            name,
            email,
            password: hashedPassword
        };

        users.push(newUser);

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
        
        // --- ADD THIS LINE (The Missing Piece) ---
        const users = await fileHandler.read('users');

        // SAFETY CHECK: Ensure users list exists before searching
        if (!users || !Array.isArray(users)) {
            console.error("Database error: Could not load user list.");
            return res.status(500).json({ success: false, message: "Server connection error" });
        }

        const user = users.find(u => u.email === email);
        if (!user) {
            return res.status(401).json({ success: false, message: "User not found" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Incorrect password" });
        }

        res.json({ success: true, userName: user.name, email: user.email });
    } catch (error) {
        console.error("Login Crash:", error); // Log the error so you can see it in Render logs
        res.status(500).json({ success: false, message: "Server error" });
    }
});

module.exports = router;