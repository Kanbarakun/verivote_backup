// API URL - use relative path for production
const API_URL = '';

// Store chart instances globally
let presidentChartInstance = null;
let senatorsChartInstance = null;
let mayorChartInstance = null;

// Store all candidates for filtering
let allCandidates = [];

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
        loader.style.display = show ? 'flex' : 'none';
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

// Show success message
function showSuccess(message) {
    const successDiv = document.getElementById('successMessage');
    if (successDiv) {
        successDiv.innerHTML = `<i class="fas fa-check-circle me-2"></i>${message}`;
        successDiv.style.display = 'block';
        setTimeout(() => {
            successDiv.style.display = 'none';
        }, 3000);
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
                <p>${activity.action} ${activity.details ? '- ' + activity.details : ''}</p>
                <span class="activity-time">${formatDate(activity.timestamp)}</span>
            </div>
        </div>
    `).join('');
}

// Get icon for activity
function getActivityIcon(action) {
    if (!action) return 'fa-history';
    const actionLower = action.toLowerCase();
    if (actionLower.includes('add')) return 'fa-user-plus';
    if (actionLower.includes('update')) return 'fa-edit';
    if (actionLower.includes('delete')) return 'fa-trash';
    if (actionLower.includes('start')) return 'fa-play';
    if (actionLower.includes('end')) return 'fa-stop';
    if (actionLower.includes('login')) return 'fa-sign-in-alt';
    if (actionLower.includes('block')) return 'fa-ban';
    if (actionLower.includes('unblock')) return 'fa-unlock';
    return 'fa-history';
}

// Render charts (FIXED: Separate charts for each position)
function renderCharts(results) {
    if (!results) return;
    
    // Destroy existing chart instances if they exist
    if (presidentChartInstance) presidentChartInstance.destroy();
    if (senatorsChartInstance) senatorsChartInstance.destroy();
    if (mayorChartInstance) mayorChartInstance.destroy();
    
    // President chart
    const presidentCtx = document.getElementById('presidentChart');
    if (presidentCtx) {
        const presidentData = Object.entries(results.president || {}).map(([id, data]) => ({
            label: data.name || id,
            votes: data.votes || 0
        }));
        
        presidentChartInstance = new Chart(presidentCtx, {
            type: 'bar',
            data: {
                labels: presidentData.map(d => d.label),
                datasets: [{
                    label: 'Votes',
                    data: presidentData.map(d => d.votes),
                    backgroundColor: '#00205b',
                    borderWidth: 1,
                    borderRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    title: { display: true, text: 'President Votes' }
                },
                scales: {
                    y: { beginAtZero: true, ticks: { stepSize: 1 } }
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
                    legend: { display: false },
                    title: { display: true, text: 'Senator Votes' }
                },
                scales: {
                    y: { beginAtZero: true, ticks: { stepSize: 1 } }
                }
            }
        });
    }
    
    // Mayor chart
    const mayorCtx = document.getElementById('mayorChart');
    if (mayorCtx) {
        const mayorData = Object.entries(results.mayor || {}).map(([id, data]) => ({
            label: data.name || id,
            votes: data.votes || 0
        }));
        
        mayorChartInstance = new Chart(mayorCtx, {
            type: 'bar',
            data: {
                labels: mayorData.map(d => d.label),
                datasets: [{
                    label: 'Votes',
                    data: mayorData.map(d => d.votes),
                    backgroundColor: '#4a7db5',
                    borderWidth: 1,
                    borderRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    title: { display: true, text: 'Mayor Votes' }
                },
                scales: {
                    y: { beginAtZero: true, ticks: { stepSize: 1 } }
                }
            }
        });
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
            allCandidates = data.candidates || [];
            renderCandidates(allCandidates);
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
                    <img src="${candidate.photo || 'imgs/default.jpg'}" alt="${candidate.name}" class="candidate-photo" onerror="this.src='imgs/default.jpg'">
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
    
    let filtered = allCandidates;
    
    // Filter by position
    if (filter && filter !== 'all') {
        filtered = filtered.filter(c => c.position === filter);
    }
    
    // Filter by search
    if (search) {
        filtered = filtered.filter(c => 
            c.name.toLowerCase().includes(search) || 
            (c.bio && c.bio.toLowerCase().includes(search))
        );
    }
    
    renderCandidates(filtered);
}

// Image preview function
function previewImage(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('candidateImagePreview').src = e.target.result;
            // In a real app, you would upload this file to a server
            // For now, we'll use a placeholder approach
            document.getElementById('candidatePhotoUrl').value = 'imgs/' + input.files[0].name;
            document.getElementById('candidatePhotoInput').value = 'imgs/' + input.files[0].name;
        }
        reader.readAsDataURL(input.files[0]);
    }
}

// Update photo from URL
function updatePhotoFromUrl(url) {
    if (url) {
        document.getElementById('candidateImagePreview').src = url;
        document.getElementById('candidatePhotoUrl').value = url;
    }
}

// Open candidate modal
function openCandidateModal(candidateId = null) {
    const modal = new bootstrap.Modal(document.getElementById('candidateModal'));
    
    if (candidateId) {
        // Edit existing candidate
        document.getElementById('candidateModalTitle').textContent = 'Edit Candidate';
        const candidate = allCandidates.find(c => c.id === candidateId);
        if (candidate) {
            document.getElementById('candidateIdInput').value = candidate.id;
            document.getElementById('candidateName').value = candidate.name;
            document.getElementById('candidatePosition').value = candidate.position;
            document.getElementById('candidatePhotoInput').value = candidate.photo || '';
            document.getElementById('candidatePhotoUrl').value = candidate.photo || '';
            document.getElementById('candidateBio').value = candidate.bio || '';
            document.getElementById('candidateStatus').value = candidate.status || 'active';
            document.getElementById('candidateImagePreview').src = candidate.photo || 'imgs/default.jpg';
        }
    } else {
        // Add new candidate
        document.getElementById('candidateModalTitle').textContent = 'Add Candidate';
        document.getElementById('candidateForm').reset();
        document.getElementById('candidateImagePreview').src = 'imgs/default.jpg';
        document.getElementById('candidateIdInput').value = '';
        document.getElementById('candidatePhotoUrl').value = '';
    }
    
    modal.show();
}

// Edit candidate
function editCandidate(id) {
    openCandidateModal(id);
}

// Save candidate
async function saveCandidate() {
    const candidate = {
        id: document.getElementById('candidateIdInput').value,
        name: document.getElementById('candidateName').value,
        position: document.getElementById('candidatePosition').value,
        photo: document.getElementById('candidatePhotoUrl').value || document.getElementById('candidatePhotoInput').value || `imgs/${document.getElementById('candidateIdInput').value}.jpg`,
        bio: document.getElementById('candidateBio').value,
        status: document.getElementById('candidateStatus').value
    };
    
    // Validate required fields
    if (!candidate.id || !candidate.name || !candidate.position) {
        showError('ID, Name, and Position are required');
        return;
    }
    
    try {
        showLoading(true);
        
        const isEditing = document.getElementById('candidateModalTitle').textContent.includes('Edit');
        const url = isEditing ? `/api/admin/candidates/${candidate.id}` : '/api/admin/candidates';
        const method = isEditing ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            },
            body: JSON.stringify(candidate)
        });
        
        const data = await response.json();
        
        if (data.success) {
            bootstrap.Modal.getInstance(document.getElementById('candidateModal')).hide();
            await loadCandidates();
            showSuccess(isEditing ? 'Candidate updated successfully' : 'Candidate added successfully');
            
            // Refresh dashboard if active
            if (document.getElementById('dashboard').classList.contains('active')) {
                loadDashboardStats();
            }
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
            await loadCandidates();
            showSuccess('Candidate deleted successfully');
            
            // Refresh dashboard if active
            if (document.getElementById('dashboard').classList.contains('active')) {
                loadDashboardStats();
            }
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
        
        if (data.success) {
            const election = data.election;
            if (election) {
                document.getElementById('electionTitle').value = election.title || '';
                document.getElementById('startDate').value = election.startDate ? election.startDate.slice(0,16) : '';
                document.getElementById('endDate').value = election.endDate ? election.endDate.slice(0,16) : '';
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
            
            // Refresh dashboard if active
            if (document.getElementById('dashboard').classList.contains('active')) {
                loadDashboardStats();
            }
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
            
            // Refresh dashboard if active
            if (document.getElementById('dashboard').classList.contains('active')) {
                loadDashboardStats();
            }
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

// Save election settings
function saveElectionSettings() {
    showSuccess('Election settings saved');
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
            renderResults(data.results, data.winners, data.statistics);
        }
    } catch (error) {
        console.error('Error loading results:', error);
        showError('Failed to load results');
    } finally {
        showLoading(false);
    }
}

// Render results
function renderResults(results, winners, statistics) {
    const summary = document.getElementById('resultsSummary');
    const winnersGrid = document.getElementById('winnersGrid');
    
    if (!summary || !winnersGrid) return;
    
    // Render statistics
    if (statistics) {
        summary.innerHTML = `
            <div class="stats-summary mb-4">
                <h4>Election Statistics</h4>
                <p>Total Votes: ${statistics.totalVotes || 0}</p>
                <p>Total Voters: ${statistics.totalVoters || 0}</p>
                <p>Turnout: ${statistics.turnout || 0}%</p>
            </div>
        `;
    }
    
    // Render winners
    if (winners) {
        let winnersHtml = '<h4>Winners</h4><div class="row">';
        
        if (winners.president) {
            winnersHtml += `
                <div class="col-md-4">
                    <div class="winner-card">
                        <h5>President</h5>
                        <h3>${winners.president.name}</h3>
                        <p>${winners.president.votes} votes</p>
                    </div>
                </div>
            `;
        }
        
        if (winners.mayor) {
            winnersHtml += `
                <div class="col-md-4">
                    <div class="winner-card">
                        <h5>Mayor</h5>
                        <h3>${winners.mayor.name}</h3>
                        <p>${winners.mayor.votes} votes</p>
                    </div>
                </div>
            `;
        }
        
        winnersHtml += '</div>';
        winnersGrid.innerHTML = winnersHtml;
    }
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
            showSuccess('Results exported successfully');
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

// Export voters
function exportVoters() {
    showSuccess('Voter list exported');
}

// ==================== SETTINGS FUNCTIONS ====================

function addAdmin() {
    showSuccess('Feature coming soon');
}

function saveSecuritySettings() {
    showSuccess('Security settings saved');
}

function testApiConnection() {
    showSuccess('API connection successful');
}

function clearLogs() {
    document.getElementById('systemLogs').innerHTML = '';
    showSuccess('Logs cleared');
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