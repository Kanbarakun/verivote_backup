// API URL - use relative path for production
const API_URL = '';

// Check if admin is logged in
function checkAdminAuth() {
    const token = localStorage.getItem('adminToken');
    const adminEmail = localStorage.getItem('adminEmail');
    
    if (!token || !adminEmail) {
        window.location.href = 'admin-login.html';
        return false;
    }
    return true;
}

// Show loading state
function showLoading(show = true) {
    const loader = document.getElementById('loadingSpinner');
    if (loader) {
        loader.style.display = show ? 'block' : 'none';
    }
}

// Show error message
function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    if (errorDiv) {
        errorDiv.innerHTML = `<i class="fas fa-exclamation-circle me-2"></i>${message}`;
        errorDiv.style.display = 'block';
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    }
}

// Format date
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
}

// ==================== DASHBOARD FUNCTIONS ====================

// Load dashboard statistics
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
                statusEl.textContent = data.stats.hasActiveElection ? 'Active' : 'Inactive';
                statusEl.className = data.stats.hasActiveElection ? 'badge bg-success' : 'badge bg-secondary';
            }
            
            // Load recent activity
            loadRecentActivity(data.stats.recentActivity);
            
            // Render charts
            renderCharts(data.stats.results);
        }
    } catch (error) {
        console.error('Error loading stats:', error);
        showError('Failed to load dashboard statistics');
    } finally {
        showLoading(false);
    }
}

// Load recent activity
function loadRecentActivity(activities) {
    const activityList = document.getElementById('recentActivity');
    if (!activityList) return;
    
    if (!activities || activities.length === 0) {
        activityList.innerHTML = '<div class="text-center text-muted py-3">No recent activity</div>';
        return;
    }
    
    activityList.innerHTML = activities.map(activity => `
        <div class="activity-item">
            <div class="activity-icon">
                <i class="fas ${getActivityIcon(activity.action)}"></i>
            </div>
            <div class="activity-details">
                <p>${activity.action} - ${activity.details}</p>
                <span class="activity-time">${formatDate(activity.timestamp)}</span>
            </div>
        </div>
    `).join('');
}

// Get icon for activity
function getActivityIcon(action) {
    if (action.includes('Added')) return 'fa-user-plus';
    if (action.includes('Updated')) return 'fa-edit';
    if (action.includes('Deleted')) return 'fa-trash';
    if (action.includes('Started')) return 'fa-play';
    if (action.includes('Ended')) return 'fa-stop';
    return 'fa-history';
}

// Store chart instances globally
let votesChartInstance = null;
let senatorsChartInstance = null;

// Render charts
function renderCharts(results) {
    if (!results) return;
    
    // Destroy existing chart instances if they exist
    if (votesChartInstance) {
        votesChartInstance.destroy();
        votesChartInstance = null;
    }
    
    if (senatorsChartInstance) {
        senatorsChartInstance.destroy();
        senatorsChartInstance = null;
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

// Update loadDashboardStats function
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
            // Update stats cards with safe defaults
            document.getElementById('totalVoters').textContent = data.stats?.totalVoters || 0;
            document.getElementById('totalVotes').textContent = data.stats?.totalVotes || 0;
            document.getElementById('turnout').textContent = (data.stats?.turnout || 0) + '%';
            
            // Update election status
            const statusEl = document.getElementById('activeElection');
            if (statusEl) {
                const hasActive = data.stats?.hasActiveElection || false;
                statusEl.textContent = hasActive ? 'Active' : 'Inactive';
                statusEl.className = hasActive ? 'badge bg-success' : 'badge bg-secondary';
            }
            
            // Load recent activity
            loadRecentActivity(data.stats?.recentActivity || []);
            
            // Render charts with results
            if (data.stats?.results) {
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

// ==================== CANDIDATE MANAGEMENT ====================

// Load candidates
async function loadCandidates() {
    if (!checkAdminAuth()) return;
    
    try {
        showLoading(true);
        
        const response = await fetch('/api/admin/candidates', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            renderCandidates(data.candidates);
        }
    } catch (error) {
        console.error('Error loading candidates:', error);
        showError('Failed to load candidates');
    } finally {
        showLoading(false);
    }
}

// Render candidates
function renderCandidates(candidates) {
    const grid = document.getElementById('candidatesGrid');
    if (!grid) return;
    
    if (!candidates || candidates.length === 0) {
        grid.innerHTML = '<div class="col-12 text-center py-5">No candidates found</div>';
        return;
    }
    
    grid.innerHTML = candidates.map(candidate => `
        <div class="col-md-4">
            <div class="candidate-card">
                <div class="candidate-header">
                    <img src="${candidate.photo || 'imgs/default.jpg'}" alt="${candidate.name}" class="candidate-photo">
                </div>
                <div class="candidate-info">
                    <h3>${candidate.name}</h3>
                    <p class="candidate-position">${candidate.position.toUpperCase()}</p>
                    <p class="candidate-bio">${candidate.bio || 'No bio available'}</p>
                    <div class="candidate-actions">
                        <button class="btn-edit" onclick="editCandidate('${candidate.id}')">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn-delete" onclick="deleteCandidate('${candidate.id}')">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// Filter candidates
function filterCandidates() {
    const filter = document.getElementById('candidateFilter')?.value;
    const search = document.getElementById('candidateSearch')?.value.toLowerCase();
    
    // Implement filtering logic here
    console.log('Filter:', filter, 'Search:', search);
}

// Search candidates
function searchCandidates() {
    filterCandidates();
}

// Open candidate modal
function openCandidateModal(candidateId = null) {
    if (candidateId) {
        // Edit existing candidate
        document.getElementById('candidateModalTitle').textContent = 'Edit Candidate';
        // Load candidate data and populate form
    } else {
        // Add new candidate
        document.getElementById('candidateModalTitle').textContent = 'Add Candidate';
        document.getElementById('candidateForm').reset();
    }
    
    new bootstrap.Modal(document.getElementById('candidateModal')).show();
}

// Save candidate
async function saveCandidate() {
    const form = document.getElementById('candidateForm');
    const formData = new FormData(form);
    
    const candidate = {
        id: formData.get('id'),
        name: formData.get('name'),
        position: formData.get('position'),
        photo: formData.get('photo'),
        bio: formData.get('bio')
    };
    
    try {
        showLoading(true);
        
        const response = await fetch('/api/admin/candidates', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            },
            body: JSON.stringify(candidate)
        });
        
        const data = await response.json();
        
        if (data.success) {
            bootstrap.Modal.getInstance(document.getElementById('candidateModal')).hide();
            loadCandidates();
            showSuccess('Candidate added successfully');
        } else {
            showError(data.message);
        }
    } catch (error) {
        console.error('Error saving candidate:', error);
        showError('Failed to save candidate');
    } finally {
        showLoading(false);
    }
}

// Delete candidate
async function deleteCandidate(id) {
    if (!confirm('Are you sure you want to delete this candidate?')) return;
    
    try {
        showLoading(true);
        
        const response = await fetch(`/api/admin/candidates/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            loadCandidates();
            showSuccess('Candidate deleted successfully');
        } else {
            showError(data.message);
        }
    } catch (error) {
        console.error('Error deleting candidate:', error);
        showError('Failed to delete candidate');
    } finally {
        showLoading(false);
    }
}

// ==================== VOTER MANAGEMENT ====================

// Load voters
async function loadVoters() {
    if (!checkAdminAuth()) return;
    
    try {
        showLoading(true);
        
        const response = await fetch('/api/admin/voters', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            renderVoters(data.voters);
            updateVoterStats(data.voters);
        }
    } catch (error) {
        console.error('Error loading voters:', error);
        showError('Failed to load voters');
    } finally {
        showLoading(false);
    }
}

// Render voters table
function renderVoters(voters) {
    const tbody = document.getElementById('voterTableBody');
    if (!tbody) return;
    
    if (!voters || voters.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4">No voters found</td></tr>';
        return;
    }
    
    tbody.innerHTML = voters.map(voter => `
        <tr>
            <td>${voter.name}</td>
            <td>${voter.email}</td>
            <td>
                <span class="badge ${voter.hasVoted ? 'bg-success' : 'bg-warning'}">
                    ${voter.hasVoted ? 'Voted' : 'Pending'}
                </span>
            </td>
            <td>${voter.votedAt ? formatDate(voter.votedAt) : 'Not voted'}</td>
            <td>
                <button class="btn btn-sm ${voter.status === 'blocked' ? 'btn-success' : 'btn-warning'}" 
                        onclick="toggleVoterStatus('${voter.email}', '${voter.status}')">
                    <i class="fas ${voter.status === 'blocked' ? 'fa-unlock' : 'fa-ban'}"></i>
                    ${voter.status === 'blocked' ? 'Unblock' : 'Block'}
                </button>
            </td>
        </tr>
    `).join('');
}

// Update voter statistics
function updateVoterStats(voters) {
    const total = voters.length;
    const voted = voters.filter(v => v.hasVoted).length;
    const pending = total - voted;
    
    document.getElementById('registeredCount').textContent = total;
    document.getElementById('votedCount').textContent = voted;
    document.getElementById('pendingCount').textContent = pending;
}

// Toggle voter status
async function toggleVoterStatus(email, currentStatus) {
    const action = currentStatus === 'blocked' ? 'unblock' : 'block';
    
    try {
        showLoading(true);
        
        const response = await fetch(`/api/admin/voters/${email}/${action}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            loadVoters();
            showSuccess(`Voter ${action}ed successfully`);
        } else {
            showError(data.message);
        }
    } catch (error) {
        console.error('Error updating voter:', error);
        showError('Failed to update voter');
    } finally {
        showLoading(false);
    }
}

// ==================== ELECTION MANAGEMENT ====================

// Load election status
async function loadElectionStatus() {
    if (!checkAdminAuth()) return;
    
    try {
        const response = await fetch('/api/admin/election/status', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            }
        });
        
        const data = await response.json();
        
        if (data.success && data.election) {
            const election = data.election;
            document.getElementById('electionTitle').value = election.title || '';
            document.getElementById('startDate').value = election.startDate?.slice(0,16) || '';
            document.getElementById('endDate').value = election.endDate?.slice(0,16) || '';
            document.getElementById('maxVotes').value = election.maxVotes || 1;
            
            const statusBadge = document.getElementById('electionStatus');
            if (statusBadge) {
                statusBadge.innerHTML = `<span class="badge ${election.active ? 'bg-success' : 'bg-secondary'}">${election.active ? 'ACTIVE' : 'INACTIVE'}</span>`;
            }
            
            // Update timer
            if (election.active && election.endDate) {
                startElectionTimer(election.endDate);
            }
        }
    } catch (error) {
        console.error('Error loading election status:', error);
    }
}

// Start election timer
function startElectionTimer(endDate) {
    const timerEl = document.getElementById('electionTimer');
    if (!timerEl) return;
    
    const end = new Date(endDate).getTime();
    
    const timer = setInterval(() => {
        const now = new Date().getTime();
        const distance = end - now;
        
        if (distance < 0) {
            clearInterval(timer);
            timerEl.innerHTML = 'Election ended';
            return;
        }
        
        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        
        timerEl.innerHTML = `<i class="fas fa-clock me-2"></i>${days}d ${hours}h ${minutes}m remaining`;
    }, 60000);
}

// Start election
async function startElection() {
    const electionData = {
        title: document.getElementById('electionTitle').value,
        startDate: document.getElementById('startDate').value,
        endDate: document.getElementById('endDate').value,
        maxVotes: parseInt(document.getElementById('maxVotes').value)
    };
    
    try {
        showLoading(true);
        
        const response = await fetch('/api/admin/election/start', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            },
            body: JSON.stringify(electionData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            showSuccess('Election started successfully');
            loadElectionStatus();
        } else {
            showError(data.message);
        }
    } catch (error) {
        console.error('Error starting election:', error);
        showError('Failed to start election');
    } finally {
        showLoading(false);
    }
}

// End election
async function endElection() {
    if (!confirm('Are you sure you want to end the election? This action cannot be undone.')) return;
    
    try {
        showLoading(true);
        
        const response = await fetch('/api/admin/election/end', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showSuccess('Election ended successfully');
            loadElectionStatus();
        } else {
            showError(data.message);
        }
    } catch (error) {
        console.error('Error ending election:', error);
        showError('Failed to end election');
    } finally {
        showLoading(false);
    }
}

// ==================== RESULTS MANAGEMENT ====================

// Load results
async function loadResults() {
    if (!checkAdminAuth()) return;
    
    try {
        showLoading(true);
        
        const response = await fetch('/api/admin/results/detailed', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            renderResults(data.results, data.winners);
        }
    } catch (error) {
        console.error('Error loading results:', error);
        showError('Failed to load results');
    } finally {
        showLoading(false);
    }
}

// Render results
function renderResults(results, winners) {
    const summary = document.getElementById('resultsSummary');
    const winnersGrid = document.getElementById('winnersGrid');
    
    if (!summary || !winnersGrid) return;
    
    // Render winners
    if (winners) {
        winnersGrid.innerHTML = `
            <div class="winner-card president">
                <h4>President</h4>
                <h3>${winners.president?.name || 'TBD'}</h3>
                <p>${winners.president?.votes || 0} votes</p>
            </div>
            <div class="winner-card mayor">
                <h4>Mayor</h4>
                <h3>${winners.mayor?.name || 'TBD'}</h3>
                <p>${winners.mayor?.votes || 0} votes</p>
            </div>
        `;
    }
    
    // Render detailed results
    summary.innerHTML = `
        <h4>President Results</h4>
        ${Object.entries(results.president || {}).map(([id, data]) => `
            <div class="result-item">
                <span>${data.name}</span>
                <span class="badge bg-primary">${data.votes} votes</span>
            </div>
        `).join('')}
    `;
}

// Export results
async function exportResults(format) {
    try {
        showLoading(true);
        
        const response = await fetch(`/api/admin/results/export?format=${format}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            }
        });
        
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `election-results.${format}`;
            a.click();
        } else {
            showError('Failed to export results');
        }
    } catch (error) {
        console.error('Error exporting results:', error);
        showError('Failed to export results');
    } finally {
        showLoading(false);
    }
}

// ==================== SECTION MANAGEMENT ====================

// Show section
function showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Show selected section
    document.getElementById(sectionId).classList.add('active');
    
    // Update active nav link
    document.querySelectorAll('.sidebar-nav a').forEach(link => {
        link.classList.remove('active');
    });
    document.querySelector(`.sidebar-nav a[href="#${sectionId}"]`).classList.add('active');
    
    // Load section-specific data
    switch(sectionId) {
        case 'dashboard':
            loadDashboardStats();
            break;
        case 'candidates':
            loadCandidates();
            break;
        case 'voters':
            loadVoters();
            break;
        case 'elections':
            loadElectionStatus();
            break;
        case 'results':
            loadResults();
            break;
    }
}

// ==================== LOGOUT ====================

// Logout function
function logout() {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminEmail');
    localStorage.removeItem('adminName');
    localStorage.removeItem('adminRole');
    window.location.href = 'admin-login.html';
}

// Show success message
function showSuccess(message) {
    const alertMsg = document.getElementById('alertMessage');
    const alertText = document.getElementById('alertText');
    
    if (alertMsg && alertText) {
        alertMsg.classList.add('show', 'success');
        alertText.textContent = message;
        
        setTimeout(() => {
            alertMsg.classList.remove('show', 'success');
        }, 3000);
    }
}

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    // Check authentication first
    if (!checkAdminAuth()) return;
    
    // Load initial data
    loadDashboardStats();
    
    // Set current date
    const dateEl = document.getElementById('currentDate');
    if (dateEl) {
        dateEl.textContent = new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
    
    // Set admin name
    const adminNameEl = document.getElementById('adminName');
    if (adminNameEl) {
        adminNameEl.textContent = localStorage.getItem('adminName') || 'Admin User';
    }
});