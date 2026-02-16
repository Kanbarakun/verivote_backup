const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const fileHandler = require('../utils/fileHandler');

// --- REGISTRATION ---
router.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        
        // 1. Read existing users
        const users = await fileHandler.read('users') || []; // Fallback to empty array if null

        // 2. Check duplicates
        if (users.find(u => u.email === email)) {
            return res.status(400).json({ success: false, message: "User already exists" });
        }

        // 3. Hash Password
        const hashedPassword = await bcrypt.hash(password, 10);

        // 4. Create User Object (Explicitly add hasVoted: false)
        const newUser = {
            name,
            email,
            password: hashedPassword,
            hasVoted: false  // <--- CRITICAL FIX
        };

        users.push(newUser);

        // 5. Save to JSONBin
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
// In your backend/routes/auth.js
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        console.log('Login attempt for:', email); // Debug log
        
        const users = await fileHandler.read('users') || [];
        const user = users.find(u => u.email === email);
        
        if (!user) {
            console.log('User not found:', email);
            return res.status(401).json({ 
                success: false, 
                message: "User not found" 
            });
        }
        
        // Check password (you should use bcrypt in production)
        if (user.password !== password) {
            console.log('Invalid password for:', email);
            return res.status(401).json({ 
                success: false, 
                message: "Invalid password" 
            });
        }
        
        console.log('Login successful for:', email);
        
        // IMPORTANT: Send back the email and userName
        res.json({ 
            success: true, 
            message: "Login successful",
            email: user.email,           // Send the email back
            userName: user.name || user.fullName || email.split('@')[0] // Send name back
        });
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            success: false, 
            message: "Server error" 
        });
    }
});

module.exports = router;