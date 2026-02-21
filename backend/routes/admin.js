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

// Admin login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const admins = await fileHandler.read('admins') || [];
        const admin = admins.find(a => a.email === email);
        
        if (!admin) {
            return res.status(401).json({ success: false, message: 'Invalid admin credentials' });
        }

        const validPassword = await bcrypt.compare(password, admin.password);
        if (!validPassword) {
            return res.status(401).json({ success: false, message: 'Invalid admin credentials' });
        }

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

// ==================== CANDIDATE MANAGEMENT ====================

// GET all candidates
router.get('/candidates', verifyAdmin, async (req, res) => {
    try {
        console.log('Fetching all candidates...');
        const candidates = await fileHandler.read('candidates');
        
        // Ensure we return an array
        const candidatesArray = Array.isArray(candidates) ? candidates : [];
        
        console.log(`Found ${candidatesArray.length} candidates`);
        res.json({ success: true, candidates: candidatesArray });
    } catch (error) {
        console.error('Error fetching candidates:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET single candidate by ID
router.get('/candidates/:id', verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        const candidates = await fileHandler.read('candidates') || [];
        const candidate = candidates.find(c => c.id === id);
        
        if (!candidate) {
            return res.status(404).json({ success: false, message: 'Candidate not found' });
        }
        
        res.json({ success: true, candidate });
    } catch (error) {
        console.error('Error fetching candidate:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// POST - Add new candidate
router.post('/candidates', verifyAdmin, async (req, res) => {
    try {
        const { id, name, position, photo, bio, status } = req.body;
        
        console.log('Received candidate data:', req.body);
        
        // Validate required fields
        if (!id || !name || !position) {
            return res.status(400).json({ 
                success: false, 
                message: 'ID, name, and position are required' 
            });
        }

        // Validate position
        if (!['president', 'senators', 'mayor'].includes(position)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Position must be president, senators, or mayor' 
            });
        }

        // Read existing candidates
        let candidates = await fileHandler.read('candidates');
        if (!Array.isArray(candidates)) {
            candidates = [];
        }
        
        // Check if candidate ID already exists
        if (candidates.find(c => c && c.id === id)) {
            return res.status(400).json({ 
                success: false, 
                message: `Candidate ID '${id}' already exists. Please use a different ID.` 
            });
        }

        // Create new candidate
        const newCandidate = {
            id,
            name,
            position,
            photo: photo || `imgs/${id}.jpg`,
            bio: bio || `${name} - Candidate for ${position}`,
            status: status || 'active',
            createdAt: new Date().toISOString(),
            createdBy: req.admin.email
        };

        candidates.push(newCandidate);
        
        // Save to JSONBin
        const saved = await fileHandler.write('candidates', candidates);
        
        if (!saved) {
            throw new Error('Failed to save to JSONBin');
        }
        
        // Log activity
        await logActivity(req.admin.email, 'Added candidate', `${name} (${id})`);

        console.log('Candidate added successfully:', newCandidate);
        
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

// PUT - Update candidate
router.put('/candidates/:id', verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        
        console.log(`Updating candidate ${id}:`, updates);
        
        // Read candidates
        let candidates = await fileHandler.read('candidates');
        if (!Array.isArray(candidates)) {
            candidates = [];
        }
        
        // Find candidate index
        const index = candidates.findIndex(c => c && c.id === id);
        
        if (index === -1) {
            return res.status(404).json({ 
                success: false, 
                message: 'Candidate not found' 
            });
        }

        // Update candidate (preserve createdAt)
        const updatedCandidate = {
            ...candidates[index],
            ...updates,
            id: id, // Ensure ID doesn't change
            updatedAt: new Date().toISOString(),
            updatedBy: req.admin.email
        };

        candidates[index] = updatedCandidate;
        
        // Save to JSONBin
        const saved = await fileHandler.write('candidates', candidates);
        
        if (!saved) {
            throw new Error('Failed to save to JSONBin');
        }
        
        // Log activity
        await logActivity(req.admin.email, 'Updated candidate', `${updatedCandidate.name} (${id})`);

        console.log('Candidate updated successfully:', updatedCandidate);
        
        res.json({ 
            success: true, 
            message: 'Candidate updated successfully',
            candidate: updatedCandidate
        });

    } catch (error) {
        console.error('Error updating candidate:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// DELETE - Remove candidate
router.delete('/candidates/:id', verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        console.log(`Deleting candidate: ${id}`);
        
        // Read candidates
        let candidates = await fileHandler.read('candidates');
        if (!Array.isArray(candidates)) {
            candidates = [];
        }
        
        const initialLength = candidates.length;
        const deletedCandidate = candidates.find(c => c && c.id === id);
        
        // Filter out the candidate
        candidates = candidates.filter(c => c && c.id !== id);
        
        if (candidates.length === initialLength) {
            return res.status(404).json({ 
                success: false, 
                message: 'Candidate not found' 
            });
        }

        // Save to JSONBin
        const saved = await fileHandler.write('candidates', candidates);
        
        if (!saved) {
            throw new Error('Failed to save to JSONBin');
        }
        
        // Log activity
        if (deletedCandidate) {
            await logActivity(req.admin.email, 'Deleted candidate', `${deletedCandidate.name} (${id})`);
        }

        console.log('Candidate deleted successfully:', id);
        
        res.json({ 
            success: true, 
            message: 'Candidate deleted successfully' 
        });

    } catch (error) {
        console.error('Error deleting candidate:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ==================== DASHBOARD STATS ====================

// Get dashboard statistics
router.get('/stats', verifyAdmin, async (req, res) => {
    try {
        // Read all data
        const users = await fileHandler.read('users') || [];
        const votes = await fileHandler.read('votes') || [];
        const candidates = await fileHandler.read('candidates') || [];
        const activities = await fileHandler.read('activities') || [];
        const elections = await fileHandler.read('elections') || [];
        
        // Ensure arrays
        const usersArray = Array.isArray(users) ? users : [];
        const votesArray = Array.isArray(votes) ? votes : [];
        const candidatesArray = Array.isArray(candidates) ? candidates : [];
        const activitiesArray = Array.isArray(activities) ? activities : [];
        const electionsArray = Array.isArray(elections) ? elections : [];
        
        // Calculate statistics
        const totalVoters = usersArray.length;
        const totalVotes = votesArray.length;
        const turnout = totalVoters ? Math.round((totalVotes / totalVoters) * 100) : 0;

        // Calculate votes per candidate
        const results = {
            president: {},
            senators: {},
            mayor: {}
        };

        votesArray.forEach(vote => {
            if (vote?.selections) {
                if (vote.selections.president) {
                    const presId = vote.selections.president;
                    results.president[presId] = (results.president[presId] || 0) + 1;
                }
                if (vote.selections.senators) {
                    const senId = vote.selections.senators;
                    results.senators[senId] = (results.senators[senId] || 0) + 1;
                }
                if (vote.selections.mayor) {
                    const mayorId = vote.selections.mayor;
                    results.mayor[mayorId] = (results.mayor[mayorId] || 0) + 1;
                }
            }
        });

        // Enhance results with candidate names
        const enhancedResults = {
            president: {},
            senators: {},
            mayor: {}
        };

        Object.keys(results).forEach(position => {
            Object.keys(results[position]).forEach(candidateId => {
                const candidate = candidatesArray.find(c => c && c.id === candidateId);
                enhancedResults[position][candidateId] = {
                    votes: results[position][candidateId],
                    name: candidate?.name || candidateId,
                    photo: candidate?.photo || null
                };
            });
        });

        // Get recent activity
        const recentActivity = activitiesArray
            .sort((a, b) => new Date(b?.timestamp || 0) - new Date(a?.timestamp || 0))
            .slice(0, 10)
            .map(act => ({
                action: act?.action || 'Unknown action',
                details: act?.details || '',
                timestamp: act?.timestamp || new Date().toISOString()
            }));

        // Check for active election
        const hasActiveElection = electionsArray.some(e => e && e.active === true);

        res.json({
            success: true,
            stats: {
                totalVoters,
                totalVotes,
                turnout,
                results: enhancedResults,
                recentActivity,
                hasActiveElection,
                votersVoted: votesArray.length,
                votersPending: totalVoters - votesArray.length
            }
        });

    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message,
            stats: {
                totalVoters: 0,
                totalVotes: 0,
                turnout: 0,
                results: { president: {}, senators: {}, mayor: {} },
                recentActivity: [],
                hasActiveElection: false,
                votersVoted: 0,
                votersPending: 0
            }
        });
    }
});

// ==================== ELECTION MANAGEMENT ====================

// Get election status
router.get('/election/status', verifyAdmin, async (req, res) => {
    try {
        const elections = await fileHandler.read('elections');
        const electionsArray = Array.isArray(elections) ? elections : [];
        const currentElection = electionsArray.find(e => e && e.active === true) || null;
        
        res.json({ 
            success: true, 
            election: currentElection,
            hasActive: !!currentElection
        });
    } catch (error) {
        console.error('Error fetching election status:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message,
            election: null,
            hasActive: false 
        });
    }
});

// Start election
router.post('/election/start', verifyAdmin, async (req, res) => {
    try {
        const { title, startDate, endDate, maxVotes } = req.body;
        
        let elections = await fileHandler.read('elections');
        if (!Array.isArray(elections)) {
            elections = [];
        }
        
        // Deactivate any active elections
        elections = elections.map(e => {
            if (e && e.active) {
                return { ...e, active: false };
            }
            return e;
        });
        
        const newElection = {
            id: `election_${Date.now()}`,
            title: title || 'General Election 2024',
            active: true,
            startDate: startDate || new Date().toISOString(),
            endDate: endDate || new Date(Date.now() + 7*24*60*60*1000).toISOString(),
            maxVotes: maxVotes || 1,
            startedBy: req.admin.email,
            startedAt: new Date().toISOString()
        };

        elections.push(newElection);
        await fileHandler.write('elections', elections);
        
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
        let elections = await fileHandler.read('elections');
        if (!Array.isArray(elections)) {
            elections = [];
        }
        
        let endedElection = null;
        elections = elections.map(e => {
            if (e && e.active) {
                endedElection = { ...e, active: false, endedAt: new Date().toISOString(), endedBy: req.admin.email };
                return endedElection;
            }
            return e;
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
        
        const usersArray = Array.isArray(users) ? users : [];
        const votesArray = Array.isArray(votes) ? votes : [];
        
        const votedEmails = new Set(votesArray.map(v => v?.voterEmail).filter(Boolean));
        
        const votersWithStatus = usersArray.map(user => ({
            name: user?.fullName || user?.name || 'Unknown',
            email: user?.email || 'No email',
            registeredAt: user?.registeredAt || user?.createdAt,
            hasVoted: votedEmails.has(user?.email),
            votedAt: votesArray.find(v => v?.voterEmail === user?.email)?.timestamp || null,
            status: user?.status || 'active'
        }));

        res.json({ 
            success: true, 
            voters: votersWithStatus,
            stats: {
                total: usersArray.length,
                voted: votesArray.length,
                pending: usersArray.length - votesArray.length
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
        const usersArray = Array.isArray(users) ? users : [];
        const userIndex = usersArray.findIndex(u => u?.email === email);
        
        if (userIndex === -1) {
            return res.status(404).json({ 
                success: false, 
                message: 'Voter not found' 
            });
        }

        const newStatus = action === 'block' ? 'blocked' : 'active';
        usersArray[userIndex].status = newStatus;
        usersArray[userIndex].updatedAt = new Date().toISOString();

        await fileHandler.write('users', usersArray);
        
        await logActivity(req.admin.email, `${action}ed voter`, email);

        res.json({ 
            success: true, 
            message: `Voter ${action}ed successfully`,
            voter: usersArray[userIndex]
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
        
        const votesArray = Array.isArray(votes) ? votes : [];
        const candidatesArray = Array.isArray(candidates) ? candidates : [];
        const usersArray = Array.isArray(users) ? users : [];
        
        // Calculate results per position
        const results = {
            president: {},
            senators: {},
            mayor: {}
        };

        votesArray.forEach(vote => {
            if (vote?.selections) {
                if (vote.selections.president) {
                    const id = vote.selections.president;
                    results.president[id] = (results.president[id] || 0) + 1;
                }
                if (vote.selections.senators) {
                    const id = vote.selections.senators;
                    results.senators[id] = (results.senators[id] || 0) + 1;
                }
                if (vote.selections.mayor) {
                    const id = vote.selections.mayor;
                    results.mayor[id] = (results.mayor[id] || 0) + 1;
                }
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
                const candidate = candidatesArray.find(c => c && c.id === candidateId);
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
            mayor: null
        };

        // President winner
        if (Object.keys(results.president).length > 0) {
            const presidentWinner = Object.entries(results.president)
                .sort((a, b) => b[1] - a[1])[0];
            if (presidentWinner) {
                const candidate = candidatesArray.find(c => c && c.id === presidentWinner[0]);
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
                const candidate = candidatesArray.find(c => c && c.id === mayorWinner[0]);
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
                totalVotes: votesArray.length,
                totalVoters: usersArray.length,
                turnout: usersArray.length ? Math.round((votesArray.length / usersArray.length) * 100) : 0
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
        
        const votesArray = Array.isArray(votes) ? votes : [];
        const candidatesArray = Array.isArray(candidates) ? candidates : [];
        
        // Create CSV content
        let csv = 'Candidate ID,Candidate Name,Position,Votes\n';
        
        const voteCount = {};
        votesArray.forEach(vote => {
            if (vote?.selections) {
                Object.keys(vote.selections).forEach(position => {
                    const candidateId = vote.selections[position];
                    if (candidateId) {
                        const key = `${position}_${candidateId}`;
                        voteCount[key] = (voteCount[key] || 0) + 1;
                    }
                });
            }
        });

        Object.keys(voteCount).forEach(key => {
            const [position, candidateId] = key.split('_');
            const candidate = candidatesArray.find(c => c && c.id === candidateId);
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
        let activities = await fileHandler.read('activities');
        if (!Array.isArray(activities)) {
            activities = [];
        }
        
        activities.push({
            admin: adminEmail,
            action,
            details,
            timestamp: new Date().toISOString()
        });
        
        // Keep only last 100 activities
        if (activities.length > 100) {
            activities = activities.slice(-100);
        }
        
        await fileHandler.write('activities', activities);
    } catch (error) {
        console.error('Failed to log activity:', error);
    }
}

// Get activity logs
router.get('/logs', verifyAdmin, async (req, res) => {
    try {
        let activities = await fileHandler.read('activities');
        if (!Array.isArray(activities)) {
            activities = [];
        }
        
        const logs = activities
            .sort((a, b) => new Date(b?.timestamp || 0) - new Date(a?.timestamp || 0))
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
        let settings = await fileHandler.read('settings');
        if (!settings || typeof settings !== 'object') {
            settings = {
                electionTitle: 'Philippine General Election 2024',
                maxVotesPerPosition: 1,
                allowRegistration: true,
                siteName: 'VeriVote'
            };
        }
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

module.exports = router;