const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const fileHandler = require('../utils/fileHandler');

// --- REGISTRATION ---
router.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        
        // Validate input
        if (!name || !email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: "All fields are required" 
            });
        }

        console.log('Registration attempt:', { name, email });
        
        // 1. Read existing users with error handling
        let users = [];
        try {
            users = await fileHandler.read('users') || [];
            // Ensure users is an array
            if (!Array.isArray(users)) {
                console.log('Users data was not an array, resetting to empty array');
                users = [];
            }
        } catch (readError) {
            console.error('Error reading users:', readError);
            users = [];
        }

        // 2. Check duplicates (with safe navigation)
        const existingUser = users.find(u => u && u.email && u.email.toLowerCase() === email.toLowerCase());
        if (existingUser) {
            return res.status(400).json({ 
                success: false, 
                message: "User already exists" 
            });
        }

        // 3. Hash Password
        const hashedPassword = await bcrypt.hash(password, 10);

        // 4. Create User Object
        const newUser = {
            id: Date.now().toString(), // Add unique ID
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
            res.json({ 
                success: true, 
                message: "Registration successful!" 
            });
        } else {
            console.error('Failed to save user to JSONBin');
            res.status(500).json({ 
                success: false, 
                message: "Failed to save to cloud. Please try again." 
            });
        }
    } catch (error) {
        console.error("Register Error:", error);
        res.status(500).json({ 
            success: false, 
            message: "Server error during registration" 
        });
    }
});

// --- LOGIN ---
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Validate input
        if (!email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: "Email and password are required" 
            });
        }

        const normalizedEmail = email.toLowerCase();
        console.log('Login attempt for:', normalizedEmail);
        
        // Read users with error handling
        let users = [];
        try {
            users = await fileHandler.read('users') || [];
            // Ensure users is an array
            if (!Array.isArray(users)) {
                console.log('Users data was not an array, resetting to empty array');
                users = [];
                // Save the fixed empty array back to JSONBin
                await fileHandler.write('users', []);
            }
        } catch (readError) {
            console.error('Error reading users:', readError);
            users = [];
        }

        console.log(`Found ${users.length} users in database`);
        
        // Filter out any invalid user objects and find the user
        const validUsers = users.filter(u => u && typeof u === 'object');
        const user = validUsers.find(u => u.email && u.email.toLowerCase() === normalizedEmail);
        
        if (!user) {
            console.log('User not found:', normalizedEmail);
            console.log('Available emails:', validUsers.map(u => u.email).filter(Boolean));
            return res.status(401).json({ 
                success: false, 
                message: "User not found" 
            });
        }
        
        // Check if user has password field
        if (!user.password) {
            console.log('User has no password field:', normalizedEmail);
            return res.status(401).json({ 
                success: false, 
                message: "Invalid user data" 
            });
        }
        
        // Compare passwords
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
            email: user.email,
            userName: user.name || email.split('@')[0]
        });
        
    } catch (error) {
        console.error('Login error:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ 
            success: false, 
            message: "Server error during login" 
        });
    }
});

// --- FIX DATA ENDPOINT - Run this once to clean up your JSONBin data ---
router.post('/fix-data', async (req, res) => {
    try {
        const users = await fileHandler.read('users') || [];
        
        // Filter out invalid users and ensure all have required fields
        const fixedUsers = users
            .filter(u => u && typeof u === 'object')
            .map(u => {
                // Ensure each user has all required fields
                return {
                    id: u.id || Date.now().toString(),
                    name: u.name || u.fullName || 'Unknown',
                    email: u.email ? u.email.toLowerCase() : null,
                    password: u.password || '',
                    hasVoted: u.hasVoted === true,
                    registeredAt: u.registeredAt || new Date().toISOString()
                };
            })
            .filter(u => u.email); // Remove any users without email
        
        // Save fixed data back to JSONBin
        await fileHandler.write('users', fixedUsers);
        
        res.json({ 
            success: true, 
            message: `Fixed ${users.length - fixedUsers.length} invalid users`,
            originalCount: users.length,
            fixedCount: fixedUsers.length,
            users: fixedUsers.map(u => ({ email: u.email, hasVoted: u.hasVoted }))
        });
    } catch (error) {
        console.error('Fix data error:', error);
        res.status(500).json({ error: error.message });
    }
});

// --- CHECK USER ENDPOINT - To verify user exists ---
router.post('/check-user', async (req, res) => {
    try {
        const { email } = req.body;
        const users = await fileHandler.read('users') || [];
        const validUsers = users.filter(u => u && typeof u === 'object');
        const user = validUsers.find(u => u.email && u.email.toLowerCase() === email.toLowerCase());
        
        res.json({
            exists: !!user,
            email: email,
            storedEmail: user ? user.email : null,
            hasVoted: user ? user.hasVoted : null,
            totalUsers: validUsers.length
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;