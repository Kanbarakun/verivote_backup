const path = require('path');
const express = require("express");
const cors = require("cors");
const app = express();
require("dotenv").config();

app.use(cors());

const authRoutes = require("./routes/auth");
const electionRoutes = require("./routes/election");
const adminRoutes = require("./routes/admin");
const voteRouter = require("./routes/vote");

app.use((req, res, next) => {
    console.log(`${req.method} request received at: ${req.url}`);
    next();
});
app.use(cors());
app.use(express.json());

app.use('/api/vote', voteRouter);
app.use("/api/auth", authRoutes);
app.use("/api/elections", electionRoutes);
app.use("/api/admin", adminRoutes);
app.use(express.static(path.join(__dirname, '../frontend')));

app.get("/", (req, res) => {
  res.json({ message: "VeriVote API is running" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
