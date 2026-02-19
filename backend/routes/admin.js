const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fileHandler = require('../utils/fileHandler');

// Admin middleware to verify token
const verifyAdmin = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ success: false, message: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        
        // Check if user is admin
        const admins = await fileHandler.read('admins') || [];
        const admin = admins.find(a => a.email === decoded.email);
        
        if (!admin) {
            return res.status(403).json({ success: false, message: 'Admin access required' });
        }
        
        req.admin = admin;
        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: 'Invalid token' });
    }
};

// ==================== ADMIN LOGIN ====================

// Admin login (separate from regular user login)
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Read admins from JSONBin
        const admins = await fileHandler.read('admins') || [];
        const admin = admins.find(a => a.email === email);
        
        if (!admin) {
            return res.status(401).json({ success: false, message: 'Invalid admin credentials' });
        }

        // Verify password
        const validPassword = await bcrypt.compare(password, admin.password);
        if (!validPassword) {
            return res.status(401).json({ success: false, message: 'Invalid admin credentials' });
        }

        // Create token
        const token = jwt.sign(
            { 
                email: admin.email, 
                name: admin.name, 
                role: admin.role || 'admin',
                isAdmin: true 
            },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );

        // Log activity
        await logActivity(admin.email, 'Admin login', 'Logged into admin panel');

        res.json({
            success: true,
            token,
            admin: {
                email: admin.email,
                name: admin.name,
                role: admin.role
            }
        });

    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ==================== INITIAL ADMIN SETUP ====================

// Create initial admin (run this once)
router.post('/setup', async (req, res) => {
    try {
        const { secretKey } = req.body;
        
        // Use a secret key from environment variables
        if (secretKey !== process.env.ADMIN_SETUP_KEY) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        const admins = await fileHandler.read('admins') || [];
        
        // Check if admin already exists
        if (admins.find(a => a.email === 'admin@verivote.com')) {
            return res.json({ success: true, message: 'Admin already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash('Admin@123', 10);
        
        const newAdmin = {
            email: 'admin@verivote.com',
            password: hashedPassword,
            name: 'Super Admin',
            role: 'super-admin',
            createdAt: new Date().toISOString(),
            createdBy: 'setup'
        };

        admins.push(newAdmin);
        await fileHandler.write('admins', admins);

        res.json({ 
            success: true, 
            message: 'Admin created successfully. Email: admin@verivote.com, Password: Admin@123'
        });

    } catch (error) {
        console.error('Admin setup error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ==================== DASHBOARD STATS ====================

// Get dashboard statistics
router.get('/stats', verifyAdmin, async (req, res) => {
    try {
        // Read all data from JSONBin
        const users = await fileHandler.read('users') || [];
        const votes = await fileHandler.read('votes') || [];
        const candidates = await fileHandler.read('candidates') || [];
        
        // Calculate statistics
        const totalVoters = users.length;
        const totalVotes = votes.length;
        const turnout = totalVoters ? Math.round((totalVotes / totalVoters) * 100) : 0;

        // Calculate votes per candidate
        const results = {
            president: {},
            senators: {},
            mayor: {}
        };

        votes.forEach(vote => {
            if (vote.selections?.president) {
                results.president[vote.selections.president] = (results.president[vote.selections.president] || 0) + 1;
            }
            if (vote.selections?.senators) {
                results.senators[vote.selections.senators] = (results.senators[vote.selections.senators] || 0) + 1;
            }
            if (vote.selections?.mayor) {
                results.mayor[vote.selections.mayor] = (results.mayor[vote.selections.mayor] || 0) + 1;
            }
        });

        // Get recent activity
        const activities = await fileHandler.read('activities') || [];
        const recentActivity = activities
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 10);

        res.json({
            success: true,
            stats: {
                totalVoters,
                totalVotes,
                turnout,
                results,
                recentActivity,
                votersVoted: votes.length,
                votersPending: totalVoters - votes.length
            }
        });

    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ==================== CANDIDATE MANAGEMENT ====================

// Get all candidates
router.get('/candidates', verifyAdmin, async (req, res) => {
    try {
        const candidates = await fileHandler.read('candidates') || [];
        res.json({ success: true, candidates });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Add new candidate
router.post('/candidates', verifyAdmin, async (req, res) => {
    try {
        const { id, name, position, photo, bio } = req.body;
        
        // Validate required fields
        if (!id || !name || !position) {
            return res.status(400).json({ 
                success: false, 
                message: 'ID, name, and position are required' 
            });
        }

        const candidates = await fileHandler.read('candidates') || [];
        
        // Check if candidate ID already exists
        if (candidates.find(c => c.id === id)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Candidate ID already exists' 
            });
        }

        const newCandidate = {
            id,
            name,
            position,
            photo: photo || `imgs/${id}.jpg`,
            bio: bio || `${name} - Candidate for ${position}`,
            createdAt: new Date().toISOString(),
            status: 'active'
        };

        candidates.push(newCandidate);
        await fileHandler.write('candidates', candidates);
        
        // Log activity
        await logActivity(req.admin.email, 'Added candidate', `${name} (${id})`);

        res.json({ 
            success: true, 
            message: 'Candidate added successfully',
            candidate: newCandidate 
        });

    } catch (error) {
        console.error('Error adding candidate:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Update candidate
router.put('/candidates/:id', verifyAdmin, async (req, res) => {
    try {
        const candidateId = req.params.id;
        const updates = req.body;
        
        const candidates = await fileHandler.read('candidates') || [];
        const index = candidates.findIndex(c => c.id === candidateId);
        
        if (index === -1) {
            return res.status(404).json({ 
                success: false, 
                message: 'Candidate not found' 
            });
        }

        // Update candidate (preserve createdAt)
        candidates[index] = {
            ...candidates[index],
            ...updates,
            updatedAt: new Date().toISOString()
        };

        await fileHandler.write('candidates', candidates);
        
        // Log activity
        await logActivity(req.admin.email, 'Updated candidate', candidateId);

        res.json({ 
            success: true, 
            message: 'Candidate updated successfully',
            candidate: candidates[index]
        });

    } catch (error) {
        console.error('Error updating candidate:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Delete candidate
router.delete('/candidates/:id', verifyAdmin, async (req, res) => {
    try {
        const candidateId = req.params.id;
        
        let candidates = await fileHandler.read('candidates') || [];
        const initialLength = candidates.length;
        
        candidates = candidates.filter(c => c.id !== candidateId);
        
        if (candidates.length === initialLength) {
            return res.status(404).json({ 
                success: false, 
                message: 'Candidate not found' 
            });
        }

        await fileHandler.write('candidates', candidates);
        
        // Log activity
        await logActivity(req.admin.email, 'Deleted candidate', candidateId);

        res.json({ 
            success: true, 
            message: 'Candidate deleted successfully' 
        });

    } catch (error) {
        console.error('Error deleting candidate:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ==================== ELECTION MANAGEMENT ====================

// Get election status
router.get('/election/status', verifyAdmin, async (req, res) => {
    try {
        const elections = await fileHandler.read('elections') || [];
        const currentElection = elections.find(e => e.active === true) || null;
        
        res.json({ 
            success: true, 
            election: currentElection,
            hasActive: !!currentElection
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Start election
router.post('/election/start', verifyAdmin, async (req, res) => {
    try {
        const { title, startDate, endDate, maxVotes } = req.body;
        
        const elections = await fileHandler.read('elections') || [];
        
        // Deactivate any active elections
        elections.forEach(e => { e.active = false; });
        
        const newElection = {
            id: `election_${Date.now()}`,
            title: title || 'General Election 2024',
            active: true,
            startDate: startDate || new Date().toISOString(),
            endDate: endDate || new Date(Date.now() + 7*24*60*60*1000).toISOString(), // 7 days default
            maxVotes: maxVotes || 1,
            startedBy: req.admin.email,
            startedAt: new Date().toISOString()
        };

        elections.push(newElection);
        await fileHandler.write('elections', elections);
        
        // Log activity
        await logActivity(req.admin.email, 'Started election', newElection.title);

        res.json({ 
            success: true, 
            message: 'Election started successfully',
            election: newElection 
        });

    } catch (error) {
        console.error('Error starting election:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// End election
router.post('/election/end', verifyAdmin, async (req, res) => {
    try {
        const elections = await fileHandler.read('elections') || [];
        
        let endedElection = null;
        elections.forEach(e => {
            if (e.active) {
                e.active = false;
                e.endedAt = new Date().toISOString();
                e.endedBy = req.admin.email;
                endedElection = e;
            }
        });

        await fileHandler.write('elections', elections);
        
        if (endedElection) {
            await logActivity(req.admin.email, 'Ended election', endedElection.title);
        }

        res.json({ 
            success: true, 
            message: endedElection ? 'Election ended' : 'No active election found',
            election: endedElection
        });

    } catch (error) {
        console.error('Error ending election:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ==================== VOTER MANAGEMENT ====================

// Get all voters with status
router.get('/voters', verifyAdmin, async (req, res) => {
    try {
        const users = await fileHandler.read('users') || [];
        const votes = await fileHandler.read('votes') || [];
        
        // Create a set of emails that have voted
        const votedEmails = new Set(votes.map(v => v.voterEmail));
        
        const votersWithStatus = users.map(user => ({
            name: user.fullName || user.name || 'Unknown',
            email: user.email,
            registeredAt: user.registeredAt || user.createdAt,
            hasVoted: votedEmails.has(user.email),
            votedAt: votes.find(v => v.voterEmail === user.email)?.timestamp || null,
            status: user.status || 'active'
        }));

        res.json({ 
            success: true, 
            voters: votersWithStatus,
            stats: {
                total: users.length,
                voted: votes.length,
                pending: users.length - votes.length
            }
        });

    } catch (error) {
        console.error('Error fetching voters:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Block/unblock voter
router.patch('/voters/:email/:action', verifyAdmin, async (req, res) => {
    try {
        const { email, action } = req.params;
        
        if (!['block', 'unblock'].includes(action)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid action. Use "block" or "unblock"' 
            });
        }

        const users = await fileHandler.read('users') || [];
        const userIndex = users.findIndex(u => u.email === email);
        
        if (userIndex === -1) {
            return res.status(404).json({ 
                success: false, 
                message: 'Voter not found' 
            });
        }

        const newStatus = action === 'block' ? 'blocked' : 'active';
        users[userIndex].status = newStatus;
        users[userIndex].updatedAt = new Date().toISOString();

        await fileHandler.write('users', users);
        
        // Log activity
        await logActivity(req.admin.email, `${action}ed voter`, email);

        res.json({ 
            success: true, 
            message: `Voter ${action}ed successfully`,
            voter: users[userIndex]
        });

    } catch (error) {
        console.error('Error updating voter:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ==================== RESULTS MANAGEMENT ====================

// Get detailed results
router.get('/results/detailed', verifyAdmin, async (req, res) => {
    try {
        const votes = await fileHandler.read('votes') || [];
        const candidates = await fileHandler.read('candidates') || [];
        const users = await fileHandler.read('users') || [];
        
        // Calculate results per position
        const results = {
            president: {},
            senators: {},
            mayor: {}
        };

        votes.forEach(vote => {
            if (vote.selections?.president) {
                const id = vote.selections.president;
                results.president[id] = (results.president[id] || 0) + 1;
            }
            if (vote.selections?.senators) {
                const id = vote.selections.senators;
                results.senators[id] = (results.senators[id] || 0) + 1;
            }
            if (vote.selections?.mayor) {
                const id = vote.selections.mayor;
                results.mayor[id] = (results.mayor[id] || 0) + 1;
            }
        });

        // Add candidate names to results
        const enhancedResults = {
            president: {},
            senators: {},
            mayor: {}
        };

        Object.keys(results).forEach(position => {
            Object.keys(results[position]).forEach(candidateId => {
                const candidate = candidates.find(c => c.id === candidateId);
                enhancedResults[position][candidateId] = {
                    votes: results[position][candidateId],
                    name: candidate?.name || candidateId,
                    photo: candidate?.photo || null
                };
            });
        });

        // Find winners
        const winners = {
            president: null,
            mayor: null,
            senators: null // For senators, might be multiple
        };

        // President winner (highest votes)
        if (Object.keys(results.president).length > 0) {
            const presidentWinner = Object.entries(results.president)
                .sort((a, b) => b[1] - a[1])[0];
            if (presidentWinner) {
                const candidate = candidates.find(c => c.id === presidentWinner[0]);
                winners.president = {
                    id: presidentWinner[0],
                    name: candidate?.name || presidentWinner[0],
                    votes: presidentWinner[1]
                };
            }
        }

        // Mayor winner
        if (Object.keys(results.mayor).length > 0) {
            const mayorWinner = Object.entries(results.mayor)
                .sort((a, b) => b[1] - a[1])[0];
            if (mayorWinner) {
                const candidate = candidates.find(c => c.id === mayorWinner[0]);
                winners.mayor = {
                    id: mayorWinner[0],
                    name: candidate?.name || mayorWinner[0],
                    votes: mayorWinner[1]
                };
            }
        }

        res.json({
            success: true,
            results: enhancedResults,
            winners,
            statistics: {
                totalVotes: votes.length,
                totalVoters: users.length,
                turnout: users.length ? Math.round((votes.length / users.length) * 100) : 0
            }
        });

    } catch (error) {
        console.error('Error fetching detailed results:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Export results as CSV
router.get('/results/export', verifyAdmin, async (req, res) => {
    try {
        const votes = await fileHandler.read('votes') || [];
        const candidates = await fileHandler.read('candidates') || [];
        
        // Create CSV content
        let csv = 'Candidate ID,Candidate Name,Position,Votes\n';
        
        const voteCount = {};
        votes.forEach(vote => {
            Object.keys(vote.selections || {}).forEach(position => {
                const candidateId = vote.selections[position];
                const key = `${position}_${candidateId}`;
                voteCount[key] = (voteCount[key] || 0) + 1;
            });
        });

        Object.keys(voteCount).forEach(key => {
            const [position, candidateId] = key.split('_');
            const candidate = candidates.find(c => c.id === candidateId);
            csv += `${candidateId},${candidate?.name || candidateId},${position},${voteCount[key]}\n`;
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=election-results.csv');
        res.send(csv);

    } catch (error) {
        console.error('Error exporting results:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ==================== ACTIVITY LOGS ====================

// Log activity helper
async function logActivity(adminEmail, action, details) {
    try {
        const activities = await fileHandler.read('activities') || [];
        activities.push({
            admin: adminEmail,
            action,
            details,
            timestamp: new Date().toISOString()
        });
        
        // Keep only last 100 activities
        if (activities.length > 100) {
            activities.splice(0, activities.length - 100);
        }
        
        await fileHandler.write('activities', activities);
    } catch (error) {
        console.error('Failed to log activity:', error);
    }
}

// Get activity logs
router.get('/logs', verifyAdmin, async (req, res) => {
    try {
        const activities = await fileHandler.read('activities') || [];
        const logs = activities
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 50);

        res.json({ success: true, logs });
    } catch (error) {
        console.error('Error fetching logs:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ==================== SYSTEM SETTINGS ====================

// Get system settings
router.get('/settings', verifyAdmin, async (req, res) => {
    try {
        const settings = await fileHandler.read('settings') || {
            electionTitle: 'Philippine General Election 2024',
            maxVotesPerPosition: 1,
            allowRegistration: true,
            siteName: 'VeriVote'
        };
        res.json({ success: true, settings });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Update system settings
router.post('/settings', verifyAdmin, async (req, res) => {
    try {
        const newSettings = req.body;
        newSettings.updatedAt = new Date().toISOString();
        newSettings.updatedBy = req.admin.email;
        
        await fileHandler.write('settings', newSettings);
        
        // Log activity
        await logActivity(req.admin.email, 'Updated settings', 'System settings updated');
        
        res.json({ 
            success: true, 
            message: 'Settings updated successfully',
            settings: newSettings
        });
    } catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Store chart instances globally
let votesChartInstance = null;
let senatorsChartInstance = null;

// Render charts
function renderCharts(results) {
    if (!results) return;
    
    // Destroy existing chart instances if they exist
    if (votesChartInstance) {
        votesChartInstance.destroy();
    }
    
    if (senatorsChartInstance) {
        senatorsChartInstance.destroy();
    }
    
    // President/Mayor chart (votesChart)
    const votesCtx = document.getElementById('votesChart');
    if (votesCtx) {
        // Prepare data for President and Mayor
        const presidentData = Object.entries(results.president || {}).map(([id, data]) => ({
            label: data.name || id,
            votes: data.votes || 0
        }));
        
        const mayorData = Object.entries(results.mayor || {}).map(([id, data]) => ({
            label: data.name || id,
            votes: data.votes || 0
        }));
        
        // Combine for display
        const allLabels = [...presidentData.map(d => d.label), ...mayorData.map(d => d.label)];
        const allVotes = [...presidentData.map(d => d.votes), ...mayorData.map(d => d.votes)];
        
        votesChartInstance = new Chart(votesCtx, {
            type: 'bar',
            data: {
                labels: allLabels,
                datasets: [{
                    label: 'Votes',
                    data: allVotes,
                    backgroundColor: [
                        '#00205b', '#ce1126', '#4a7db5', '#ffd700', 
                        '#28a745', '#dc3545', '#6c757d', '#17a2b8'
                    ],
                    borderWidth: 1,
                    borderRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    title: {
                        display: true,
                        text: 'President & Mayor Votes'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }
    
    // Senators chart
    const senatorsCtx = document.getElementById('senatorsChart');
    if (senatorsCtx) {
        const senatorsData = Object.entries(results.senators || {}).map(([id, data]) => ({
            label: data.name || id,
            votes: data.votes || 0
        }));
        
        senatorsChartInstance = new Chart(senatorsCtx, {
            type: 'bar',
            data: {
                labels: senatorsData.map(d => d.label),
                datasets: [{
                    label: 'Votes',
                    data: senatorsData.map(d => d.votes),
                    backgroundColor: '#ce1126',
                    borderWidth: 1,
                    borderRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    title: {
                        display: true,
                        text: 'Senator Votes'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }
}

// Also update the loadDashboardStats function to properly handle charts
async function loadDashboardStats() {
    if (!checkAdminAuth()) return;
    
    try {
        showLoading(true);
        
        const response = await fetch('/api/admin/stats', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Update stats cards
            document.getElementById('totalVoters').textContent = data.stats.totalVoters || 0;
            document.getElementById('totalVotes').textContent = data.stats.totalVotes || 0;
            document.getElementById('turnout').textContent = (data.stats.turnout || 0) + '%';
            
            // Update election status
            const statusEl = document.getElementById('activeElection');
            if (statusEl) {
                const hasActive = data.stats.hasActiveElection || false;
                statusEl.textContent = hasActive ? 'Active' : 'Inactive';
                statusEl.className = hasActive ? 'badge bg-success' : 'badge bg-secondary';
            }
            
            // Load recent activity
            loadRecentActivity(data.stats.recentActivity);
            
            // Render charts with results
            if (data.stats.results) {
                renderCharts(data.stats.results);
            }
        }
    } catch (error) {
        console.error('Error loading stats:', error);
        showError('Failed to load dashboard statistics');
    } finally {
        showLoading(false);
    }
}
module.exports = router;