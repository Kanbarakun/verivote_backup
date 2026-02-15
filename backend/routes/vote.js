const express = require('express');
const router = express.Router();
const fileHandler = require('../utils/fileHandler');

// CHECK STATUS: Used by frontend on load
router.get('/status', async (req, res) => {
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: "Email required" });

    const users = await fileHandler.read('users') || [];
    const user = users.find(u => u.email === email);
    
    // Return true if user exists and hasVoted is true
    res.json({ hasVoted: user ? !!user.hasVoted : false });
});

// SUBMIT VOTE: Handles the full ballot
router.post('/submit', async (req, res) => {
    try {
        const { voterEmail, selections } = req.body;
        const users = await fileHandler.read('users') || [];
        const votes = await fileHandler.read('votes') || [];

        const userIndex = users.findIndex(u => u.email === voterEmail);
        if (userIndex === -1) {
            return res.status(404).json({ success: false, message: "User not found." });
        }

        if (users[userIndex].hasVoted) {
            return res.status(403).json({ success: false, message: "Already voted." });
        }

        votes.push({
            voterEmail,
            selections,
            timestamp: new Date().toISOString()
        });
        users[userIndex].hasVoted = true;

        await Promise.all([
            fileHandler.write('votes', votes),
            fileHandler.write('users', users)
        ]);

        res.json({ success: true });
    } catch (err) {
        console.error("Vote submission crash:", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
});



// GET RESULTS
router.get('/results', async (req, res) => {    
    const votes = await fileHandler.read('votes') || [];
    
    // Initialize counters
    const results = {
        president: {},
        senators: {},
        mayor: {}
    };

    // Tally votes based on the 'selections' object structure
    votes.forEach(vote => {
        if (vote.selections) {
            const s = vote.selections;
            if (s.president) results.president[s.president] = (results.president[s.president] || 0) + 1;
            if (s.senators) results.senators[s.senators] = (results.senators[s.senators] || 0) + 1;
            if (s.mayor) results.mayor[s.mayor] = (results.mayor[s.mayor] || 0) + 1;
        }
    });

    res.json({ success: true, results });
});

// ADMIN RESET: Clears 'hasVoted' for everyone
router.post('/reset', async (req, res) => {
    // In a real app, add admin password check here!
    const users = await fileHandler.read('users') || [];
    
    users.forEach(u => u.hasVoted = false);
    
    await fileHandler.write('users', users);
    res.json({ success: true, message: "Election reset! Users can vote again." });
});

module.exports = router;