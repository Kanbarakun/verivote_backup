const express = require('express');
const router = express.Router();
const fileHandler = require('../utils/fileHandler');

// Get current election status and candidates
router.get('/status', async (req, res) => {
    const election = await fileHandler.read('elections');
    const candidates = await fileHandler.read('candidates');
    res.json({ election, candidates });
});

// Update election status (Open/Close)
router.post('/toggle-election', async (req, res) => {
    const { status } = req.body;
    const election = await fileHandler.read('elections');
    election.status = status;
    await fileHandler.write('elections', election);
    res.json({ success: true, status: election.status });
});

// Add a new candidate
router.post('/add-candidate', async (req, res) => {
    const { name, party } = req.body;
    const candidates = await fileHandler.read('candidates');
    const newCandidate = { id: Date.now().toString(), name, party };
    candidates.push(newCandidate);
    await fileHandler.write('candidates', candidates);
    res.json({ success: true, candidate: newCandidate });
});

module.exports = router;