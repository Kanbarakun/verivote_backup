const path = require('path');
const express = require("express");
const cors = require("cors");
const app = express();
require("dotenv").config();

// Move this before other middleware to catch all requests
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url} - ${new Date().toISOString()}`);
    next();
});

app.use(cors());
app.use(express.json());

// Add a test endpoint at the root
app.get('/api/test', (req, res) => {
    res.json({ message: "API is working" });
});

// Add debug endpoint to see users
app.get('/api/debug/users', async (req, res) => {
    try {
        const fileHandler = require('./utils/fileHandler');
        const users = await fileHandler.read('users') || [];
        const votes = await fileHandler.read('votes') || [];
        
        res.json({
            users: users.map(u => ({ email: u.email, hasVoted: u.hasVoted })),
            totalVotes: votes.length,
            userCount: users.length
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// TEMPORARY: Add a test user (REMOVE AFTER TESTING)
app.get('/api/debug/add-test-user', async (req, res) => {
    try {
        const fileHandler = require('./utils/fileHandler');
        const users = await fileHandler.read('users') || [];
        
        // Add a test user if not exists
        const testEmail = 'test@example.com';
        if (!users.find(u => u.email === testEmail)) {
            users.push({
                email: testEmail,
                password: 'password123',
                fullName: 'Test User',
                hasVoted: false,
                registeredAt: new Date().toISOString()
            });
            await fileHandler.write('users', users);
            res.json({ success: true, message: 'Test user added', users: users.map(u => u.email) });
        } else {
            res.json({ success: true, message: 'Test user already exists', users: users.map(u => u.email) });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Mount routes
const authRoutes = require("./routes/auth");
const electionRoutes = require("./routes/election");
const adminRoutes = require("./routes/admin");
const voteRouter = require("./routes/vote");

app.use('/api/vote', voteRouter);
app.use("/api/auth", authRoutes);
app.use("/api/elections", electionRoutes);
app.use("/api/admin", adminRoutes);

// Serve static files from the frontend directory
app.use(express.static(path.join(__dirname, '../frontend')));

// For any other routes, serve index.html (but only for non-API routes)
// FIXED: Changed from '*' to a more specific catch-all
app.use((req, res) => {
    // Only serve index.html for non-API routes
    if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(__dirname, '../frontend/index.html'));
    } else {
        // If it's an API route that wasn't found, return 404
        res.status(404).json({ error: 'API endpoint not found' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`API URL: http://localhost:${PORT}`);
});

// Add this debug endpoint to check JSONBin configuration
app.get('/api/debug/jsonbin', async (req, res) => {
    try {
        const fileHandler = require('./utils/fileHandler');
        
        // Check if API key exists
        if (!process.env.JSONBIN_API_KEY) {
            return res.json({ 
                error: 'JSONBIN_API_KEY is missing in environment variables',
                hasApiKey: false 
            });
        }

        // Check bin IDs
        const binStatus = {
            users: !!process.env.BIN_ID_USERS,
            votes: !!process.env.BIN_ID_VOTES,
            candidates: !!process.env.BIN_ID_CANDIDATES,
            elections: !!process.env.BIN_ID_ELECTIONS
        };

        // Try to read from users bin to test connection
        let usersTest = null;
        let votesTest = null;
        
        try {
            usersTest = await fileHandler.read('users');
            votesTest = await fileHandler.read('votes');
        } catch (e) {
            console.error('Test read failed:', e);
        }

        res.json({
            hasApiKey: true,
            binIds: binStatus,
            usersCount: usersTest ? usersTest.length : 0,
            votesCount: votesTest ? votesTest.length : 0,
            sampleUser: usersTest && usersTest.length > 0 ? usersTest[0] : null,
            message: 'Check your Render environment variables if bins are missing'
        });

    } catch (error) {
        res.status(500).json({ error: error.message, stack: error.stack });
    }
});