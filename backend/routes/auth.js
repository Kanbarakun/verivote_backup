const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fileHandler = require('../utils/fileHandler');

// ==================== MIDDLEWARE ====================

// Token verification middleware - MUST BE DEFINED BEFORE USE
const verifyToken = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ success: false, message: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: 'Invalid token' });
    }
};

// Log activity helper
async function logActivity(actor, action, details) {
    try {
        let activities = await fileHandler.read('activities');
        if (!Array.isArray(activities)) {
            activities = [];
        }
        
        activities.push({
            admin: actor,
            action,
            details,
            timestamp: new Date().toISOString()
        });
        
        // Keep only last 100 activities
        if (activities.length > 100) {
            activities = activities.slice(-100);
        }
        
        await fileHandler.write('activities', activities);
    } catch (error) {
        console.error('Failed to log activity:', error);
    }
}

// ==================== AUTH ROUTES ====================

// REGISTER - Create new user
router.post('/register', async (req, res) => {
    try {
        let { name, email, password } = req.body;
        
        // FIX: Normalize email to lowercase
        email = email.toLowerCase().trim();
        
        // Validate input
        if (!name || !email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Name, email, and password are required' 
            });
        }

        // Read existing users
        let users = await fileHandler.read('users') || [];
        if (!Array.isArray(users)) users = [];
        
        // FIX: Case-insensitive check for existing user
        if (users.find(u => u && u.email && u.email.toLowerCase() === email)) {
            return res.status(400).json({ 
                success: false, 
                message: 'User already exists' 
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Create new user object
        const newUser = {
            name,
            email, // Store normalized lowercase email
            password: hashedPassword,
            hasVoted: false,
            createdAt: new Date().toISOString()
        };

        // Save to JSONBin
        users.push(newUser);
        const saved = await fileHandler.write('users', users);

        if (!saved) {
            throw new Error('Failed to save user to database');
        }

        // Log activity
        await logActivity('system', 'User registered', `New user registered: ${email}`);

        res.json({ 
            success: true, 
            message: 'User registered successfully' 
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Registration failed: ' + error.message 
        });
    }
});

// LOGIN - Authenticate user
router.post('/login', async (req, res) => {
    try {
        let { email, password } = req.body;
        
        // FIX: Normalize email to lowercase
        email = email.toLowerCase().trim();
        
        // Validate input
        if (!email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email and password are required' 
            });
        }

        // Read users from database
        let users = await fileHandler.read('users') || [];
        if (!Array.isArray(users)) users = [];
        
        // FIX: Case-insensitive search for user
        const user = users.find(u => u && u.email && u.email.toLowerCase() === email);
        
        if (!user) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid email or password' 
            });
        }

        // Verify password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid email or password' 
            });
        }

        // Create JWT token
        const token = jwt.sign(
            { 
                email: user.email, 
                name: user.name,
                hasVoted: user.hasVoted 
            },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );

        // Log activity
        await logActivity(user.email, 'User login', `User logged in: ${email}`);

        res.json({ 
            success: true, 
            message: 'Login successful',
            token,
            email: user.email,
            userName: user.name,
            hasVoted: user.hasVoted
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Login failed: ' + error.message 
        });
    }
});

// GET PROFILE - Get user profile (protected route)
router.get('/profile', verifyToken, async (req, res) => {
    try {
        const { email } = req.user;
        
        // Read users from database
        let users = await fileHandler.read('users') || [];
        if (!Array.isArray(users)) users = [];
        
        // Find user by email
        const user = users.find(u => u && u.email === email);
        
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        // Return user data (excluding password)
        res.json({ 
            success: true, 
            user: {
                name: user.name,
                email: user.email,
                hasVoted: user.hasVoted,
                createdAt: user.createdAt
            }
        });
    } catch (error) {
        console.error('Profile fetch error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch profile: ' + error.message 
        });
    }
});

// UPDATE PROFILE - Update user name (protected route)
router.put('/profile', verifyToken, async (req, res) => {
    try {
        const { email } = req.user;
        const { name } = req.body;
        
        if (!name) {
            return res.status(400).json({ 
                success: false, 
                message: 'Name is required' 
            });
        }

        // Read users from database
        let users = await fileHandler.read('users') || [];
        if (!Array.isArray(users)) users = [];
        
        // Find user index
        const userIndex = users.findIndex(u => u && u.email === email);
        
        if (userIndex === -1) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        // Update user name
        users[userIndex].name = name;
        users[userIndex].updatedAt = new Date().toISOString();

        // Save to JSONBin
        const saved = await fileHandler.write('users', users);

        if (!saved) {
            throw new Error('Failed to save user data');
        }

        // Log activity
        await logActivity(email, 'Profile updated', `User updated their name`);

        res.json({ 
            success: true, 
            message: 'Profile updated successfully',
            name: name
        });
    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to update profile: ' + error.message 
        });
    }
});

// UPDATE PASSWORD - Change user password (protected route)
router.put('/password', verifyToken, async (req, res) => {
    try {
        const { email } = req.user;
        const { currentPassword, newPassword } = req.body;
        
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ 
                success: false, 
                message: 'Current password and new password are required' 
            });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({ 
                success: false, 
                message: 'New password must be at least 8 characters long' 
            });
        }

        // Read users from database
        let users = await fileHandler.read('users') || [];
        if (!Array.isArray(users)) users = [];
        
        // Find user index
        const userIndex = users.findIndex(u => u && u.email === email);
        
        if (userIndex === -1) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        // Verify current password
        const validPassword = await bcrypt.compare(currentPassword, users[userIndex].password);
        if (!validPassword) {
            return res.status(401).json({ 
                success: false, 
                message: 'Current password is incorrect' 
            });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        // Update password
        users[userIndex].password = hashedPassword;
        users[userIndex].updatedAt = new Date().toISOString();

        // Save to JSONBin
        const saved = await fileHandler.write('users', users);

        if (!saved) {
            throw new Error('Failed to save user data');
        }

        // Log activity
        await logActivity(email, 'Password changed', `User changed their password`);

        res.json({ 
            success: true, 
            message: 'Password updated successfully' 
        });
    } catch (error) {
        console.error('Password update error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to update password: ' + error.message 
        });
    }
});

// DELETE ACCOUNT - Permanently delete user account (protected route)
router.delete('/account', verifyToken, async (req, res) => {
    try {
        const { email } = req.user; // From JWT token
        
        console.log(`Attempting to delete account for: ${email}`);
        
        // Read current users
        let users = await fileHandler.read('users') || [];
        if (!Array.isArray(users)) users = [];
        
        // Find the user
        const userExists = users.some(u => u && u.email === email);
        if (!userExists) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }
        
        // Filter out the user (DELETE operation)
        const updatedUsers = users.filter(u => u && u.email !== email);
        
        // Read current votes
        let votes = await fileHandler.read('votes') || [];
        if (!Array.isArray(votes)) votes = [];
        
        // Also remove user's voting records
        const updatedVotes = votes.filter(v => v && v.voterEmail !== email);
        
        // Save both updated arrays
        const usersSaved = await fileHandler.write('users', updatedUsers);
        const votesSaved = await fileHandler.write('votes', updatedVotes);
        
        if (!usersSaved) {
            throw new Error('Failed to save users after deletion');
        }
        
        // Log activity
        await logActivity('system', 'Account deleted', `User ${email} deleted their account`);
        
        console.log(`Account successfully deleted for: ${email}`);
        
        res.json({ 
            success: true, 
            message: 'Account deleted successfully' 
        });

    } catch (error) {
        console.error('Error deleting account:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to delete account: ' + error.message 
        });
    }
});

// LOGOUT - Invalidate token (client-side, but we can add server-side if needed)
router.post('/logout', verifyToken, (req, res) => {
    // With JWT, we don't need server-side logout
    // Just inform client to remove token
    res.json({ 
        success: true, 
        message: 'Logged out successfully' 
    });
});

// TEST TOKEN - Simple endpoint to verify token is working
router.get('/test-token', verifyToken, (req, res) => {
    res.json({ 
        success: true, 
        message: 'Token is valid',
        user: req.user
    });
});

module.exports = router;