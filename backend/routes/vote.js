const express = require('express');
const router = express.Router();
const fileHandler = require('../utils/fileHandler');
const fs = require('fs')

// Record a vote
router.post('/cast', (req, res) => {
    const { userId, category, candidateId } = req.body;
    const votes = fileHandler.read('votes.json');

    // Simple vote recording
    const newVote = {
        userId,
        category,
        candidateId,
        timestamp: new Date().toISOString()
    };

    votes.push(newVote);
    fileHandler.write('votes.json', votes);

    res.json({ success: true, message: "Vote cast successfully!" });
});

router.get('/results', async (req, res) => {    
    const votes = await fileHandler.read('votes');
    const candidates = await fileHandler.read('candidates');

    // Logic to count votes per candidate
    const summary = candidates.map(c => {
        const count = votes.filter(v => v.candidateId === c.id).length;
        return { name: c.name, votes: count };
    });

    res.json({ success: true, results: summary });
});

router.post('/submit', async (req, res) => {
    const { voterEmail, candidateId } = req.body;

    const users = await fileHandler.read('users');
    const votes = await fileHandler.read('votes');
    
    // 1. Verify Identity & Check if already voted
    const user = users.find(u => u.email === voterEmail);
    if (!user || user.hasVoted) {
        return res.status(403).json({ success: false, message: "Unauthorized or already voted." });
    }   

    // 2. Cast Vote
    votes.push({ candidateId, timestamp: new Date() });
    user.hasVoted = true; // Mark as voted

    // 3. Save both Bins
    await fileHandler.write('votes', votes);
    await fileHandler.write('users', users);

    res.json({ success: true, message: "Vote submitted successfully!" });
});

module.exports = router;