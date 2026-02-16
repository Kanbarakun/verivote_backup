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

// Mount routes
const authRoutes = require("./routes/auth");
const electionRoutes = require("./routes/election");
const adminRoutes = require("./routes/admin");
const voteRouter = require("./routes/vote");

app.use('/api/vote', voteRouter);
app.use("/api/auth", authRoutes);
app.use("/api/elections", electionRoutes);
app.use("/api/admin", adminRoutes);

// Serve static files
app.use(express.static(path.join(__dirname, '../frontend')));

// Catch-all route for SPA (if needed)
app.get("*", (req, res) => {
    if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(__dirname, '../frontend/index.html'));
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`API URL: http://localhost:${PORT}`);
});