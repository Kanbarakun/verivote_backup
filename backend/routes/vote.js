const express = require('express');
const router = express.Router();
const fileHandler = require('../utils/fileHandler');

// CHECK STATUS: Used by frontend on load
router.get('/status', async (req, res) => {
    try {
        const { email } = req.query;
        if (!email) return res.status(400).json({ error: "Email required" });

        console.log('Checking status for email:', email);
        
        const users = await fileHandler.read('users') || [];
        console.log(`Found ${users.length} users in JSONBin`);
        
        const user = users.find(u => u.email === email);
        
        if (user) {
            console.log(`User found: ${email}, hasVoted: ${user.hasVoted}`);
        } else {
            console.log(`User not found: ${email}`);
            // List first few users for debugging
            console.log('Available users:', users.slice(0, 3).map(u => u.email));
        }
        
        res.json({ hasVoted: user ? !!user.hasVoted : false });
    } catch (error) {
        console.error("Status check error:", error);
        res.status(500).json({ error: "Server error checking status", details: error.message });
    }
});

// SUBMIT VOTE: Handles the full ballot
router.post('/submit', async (req, res) => {
    try {
        const { voterEmail, selections } = req.body;
        
        console.log('='.repeat(50));
        console.log('VOTE SUBMISSION ATTEMPT');
        console.log('Email:', voterEmail);
        console.log('Selections:', selections);
        console.log('='.repeat(50));

        // Validate input
        if (!voterEmail) {
            return res.status(400).json({ success: false, message: "Email is required" });
        }
        
        if (!selections || !selections.president || !selections.senators || !selections.mayor) {
            return res.status(400).json({ success: false, message: "All selections are required" });
        }

        // Read data from JSONBin
        console.log('Reading users from JSONBin...');
        const users = await fileHandler.read('users') || [];
        console.log(`Found ${users.length} users`);
        
        console.log('Reading votes from JSONBin...');
        const votes = await fileHandler.read('votes') || [];
        console.log(`Found ${votes.length} existing votes`);

        // Find user
        const userIndex = users.findIndex(u => u.email === voterEmail);
        console.log('User index:', userIndex);

        if (userIndex === -1) {
            console.log(`USER NOT FOUND: ${voterEmail}`);
            console.log('Available emails:', users.map(u => u.email));
            return res.status(404).json({ 
                success: false, 
                message: "User not found. Please register first.",
                debug: { availableEmails: users.map(u => u.email) }
            });
        }

        // Check if already voted
        if (users[userIndex].hasVoted) {
            console.log(`User already voted: ${voterEmail}`);
            return res.status(403).json({ success: false, message: "Already voted." });
        }

        // Create new vote record
        const newVote = {
            id: Date.now().toString(),
            voterEmail,
            selections: {
                president: selections.president,
                senators: selections.senators,
                mayor: selections.mayor
            },
            timestamp: new Date().toISOString()
        };
        
        votes.push(newVote);
        
        // Mark user as having voted
        users[userIndex].hasVoted = true;

        console.log('Saving to JSONBin...');
        console.log('Users to save:', users.length);
        console.log('Votes to save:', votes.length);

        // Save both to JSONBin
        const usersSaved = await fileHandler.write('users', users);
        const votesSaved = await fileHandler.write('votes', votes);

        console.log('Users saved:', usersSaved);
        console.log('Votes saved:', votesSaved);

        if (!usersSaved || !votesSaved) {
            throw new Error('Failed to save to JSONBin');
        }

        console.log('VOTE SUCCESSFUL for:', voterEmail);
        console.log('='.repeat(50));
        
        res.json({ success: true, message: "Vote recorded successfully" });

    } catch (err) {
        console.error('='.repeat(50));
        console.error("VOTE SUBMISSION ERROR");
        console.error("Error message:", err.message);
        console.error("Error stack:", err.stack);
        console.error('='.repeat(50));
        
        res.status(500).json({ 
            success: false, 
            message: "Server error", 
            error: err.message 
        });
    }
});

// CHECK ELECTION STATUS
router.get('/election-status', async (req, res) => {
    try {
        const elections = await fileHandler.read('elections') || [];
        const activeElection = elections.find(e => e.active === true);
        
        res.json({
            success: true,
            isActive: !!activeElection,
            election: activeElection || null
        });
    } catch (error) {
        console.error("Error checking election status:", error);
        res.json({ success: true, isActive: false, election: null });
    }
});

// GET RESULTS
router.get('/results', async (req, res) => {    
    try {
        console.log('Fetching results...');
        const votes = await fileHandler.read('votes') || [];
        
        // Initialize counters
        const results = {
            president: {},
            senators: {},
            mayor: {}
        };

        // Tally votes
        votes.forEach(vote => {
            if (vote.selections) {
                const s = vote.selections;
                if (s.president) results.president[s.president] = (results.president[s.president] || 0) + 1;
                if (s.senators) results.senators[s.senators] = (results.senators[s.senators] || 0) + 1;
                if (s.mayor) results.mayor[s.mayor] = (results.mayor[s.mayor] || 0) + 1;
            }
        });

        console.log('Results calculated:', results);
        res.json({ success: true, results });
    } catch (error) {
        console.error("Error getting results:", error);
        res.status(500).json({ success: false, message: "Error fetching results" });
    }
});

// ADMIN RESET: Clears 'hasVoted' for everyone
router.post('/reset', async (req, res) => {
    try {
        const users = await fileHandler.read('users') || [];
        
        users.forEach(u => u.hasVoted = false);
        
        await fileHandler.write('users', users);
        res.json({ success: true, message: "Election reset! Users can vote again." });
    } catch (error) {
        console.error("Reset error:", error);
        res.status(500).json({ success: false, message: "Error resetting election" });
    }
});

module.exports = router;