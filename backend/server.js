const path = require('path');
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

// DEBUG LOGGER: This will show in Render logs
app.use((req, res, next) => {
    console.log(`${req.method} request received at: ${req.url}`);
    next();
});

const authRoutes = require("./routes/auth");
const voteRoutes = require("./routes/vote");

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/vote", voteRoutes);

app.use(express.static(path.join(__dirname, '../frontend')));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});