const express = require('express');
const router = express.Router();
const fileHandler = require('../utils/filehandler.js');

// Registration Endpoint
router.post('/register', (req, res) => {
    const { name, email, password } = req.body;
    const users = fileHandler.read('users.json');

    // Check if user already exists
    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
        return res.status(400).json({ success: false, message: "User already exists!" });
    }
    
    // Login Endpoint
router.post('/login', (req, res) => {
    const { email, password } = req.body;
    const users = fileHandler.read('users.json');

    // Find the user by email
    const user = users.find(u => u.email === email && u.password === password);

    if (user) {
        res.json({ success: true, message: "Login successful!", user: { name: user.name } });
    } else {
        res.status(401).json({ success: false, message: "Invalid email or password." });
    }
});

    // Add new user
    const newUser = { id: Date.now(), name, email, password };
    users.push(newUser);
    fileHandler.write('users.json', users);

    res.json({ success: true, message: "Registration successful!" });
});

module.exports = router;