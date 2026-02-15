const path = require('path');
const express = require("express");
const cors = require("cors");
const app = express();
require("dotenv").config();

const authRoutes = require("./routes/auth");
const electionRoutes = require("./routes/election");
const adminRoutes = require("./routes/admin");


app.use(cors());
app.use(express.json());

app.use("/api/vote", require("./routes/vote"));
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
