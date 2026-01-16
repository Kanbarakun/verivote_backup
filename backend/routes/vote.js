const express = require("express");
const auth = require("../middleware/authMiddleware");
const { readJSON, writeJSON } = require("../utils/fileHandler");
const { v4: uuidv4 } = require("uuid");

const router = express.Router();

const USERS_FILE = "users.json";
const VOTES_FILE = "votes.json";

// CAST VOTE
router.post("/", auth, (req, res) => {
  const { electionId, candidateId } = req.body;

  if (!electionId || !candidateId) {
    return res.status(400).json({ error: "Missing vote data" });
  }

  const users = readJSON(USERS_FILE);
  const votes = readJSON(VOTES_FILE);

  const userIndex = users.findIndex(u => u.id === req.user.id);
  if (userIndex === -1) {
    return res.status(404).json({ error: "User not found" });
  }

  // 🚫 One-person-one-vote check
  if (users[userIndex].hasVoted) {
    return res.status(403).json({ error: "You already voted" });
  }

  // Save vote
  votes.push({
    id: uuidv4(),
    voterId: req.user.id,
    electionId,
    candidateId,
    timestamp: new Date().toISOString()
  });

  users[userIndex].hasVoted = true;

  writeJSON(VOTES_FILE, votes);
  writeJSON(USERS_FILE, users);

  res.json({ message: "Vote successfully cast" });
});

module.exports = router;
