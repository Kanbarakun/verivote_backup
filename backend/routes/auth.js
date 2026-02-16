const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const fileHandler = require('../utils/fileHandler');

// --- REGISTRATION ---
router.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        
        console.log('Registration attempt:', { name, email }); // Debug log
        
        // 1. Read existing users
        const users = await fileHandler.read('users') || [];

        // 2. Check duplicates (case-insensitive email)
        const existingUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());
        if (existingUser) {
            return res.status(400).json({ success: false, message: "User already exists" });
        }

        // 3. Hash Password
        const hashedPassword = await bcrypt.hash(password, 10);

        // 4. Create User Object (store email in lowercase to avoid case issues)
        const newUser = {
            name,
            email: email.toLowerCase(), // Store email in lowercase
            password: hashedPassword,
            hasVoted: false,
            registeredAt: new Date().toISOString()
        };

        users.push(newUser);

        // 5. Save to JSONBin
        const saved = await fileHandler.write('users', users);

        if (saved) {
            console.log('User registered successfully:', email);
            res.json({ success: true, message: "Registration successful!" });
        } else {
            console.error('Failed to save user to JSONBin');
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
        const normalizedEmail = email.toLowerCase(); // Convert to lowercase for comparison
        
        console.log('Login attempt for:', normalizedEmail);
        
        const users = await fileHandler.read('users') || [];
        
        // Case-insensitive email search
        const user = users.find(u => u.email.toLowerCase() === normalizedEmail);
        
        if (!user) {
            console.log('User not found:', normalizedEmail);
            return res.status(401).json({ 
                success: false, 
                message: "User not found" 
            });
        }
        
        // FIXED: Use bcrypt to compare passwords
        const isPasswordValid = await bcrypt.compare(password, user.password);
        
        if (!isPasswordValid) {
            console.log('Invalid password for:', normalizedEmail);
            return res.status(401).json({ 
                success: false, 
                message: "Invalid password" 
            });
        }
        
        console.log('Login successful for:', normalizedEmail);
        
        // Return user info (never send password back!)
        res.json({ 
            success: true, 
            message: "Login successful",
            email: user.email, // Send the stored email (might be lowercase)
            userName: user.name || email.split('@')[0]
        });
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            success: false, 
            message: "Server error" 
        });
    }
});

// Optional: Add a test endpoint to check if a user exists
router.post('/check-user', async (req, res) => {
    try {
        const { email } = req.body;
        const users = await fileHandler.read('users') || [];
        const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
        
        res.json({
            exists: !!user,
            email: email,
            storedEmail: user ? user.email : null
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;