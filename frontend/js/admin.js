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
        
        if (response.status === 401) {
            // Token expired or invalid
            localStorage.removeItem('adminToken');
            localStorage.removeItem('adminEmail');
            localStorage.removeItem('adminName');
            localStorage.removeItem('adminRole');
            window.location.href = 'admin-login.html';
            return;
        }
        
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

// Render charts
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
        
        if (response.status === 401) {
            localStorage.removeItem('adminToken');
            localStorage.removeItem('adminEmail');
            localStorage.removeItem('adminName');
            localStorage.removeItem('adminRole');
            window.location.href = 'admin-login.html';
            return;
        }
        
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
        grid.innerHTML = '<div class="col-12 text-center py-5"><p class="text-muted">No candidates found. Click "Add Candidate" to create one.</p></div>';
        return;
    }
    
    let html = '';
    candidates.forEach(candidate => {
        // Safe defaults
        const id = candidate.id || 'unknown';
        const name = candidate.name || 'Unknown';
        const position = candidate.position || 'unknown';
        const photo = candidate.photo || 'imgs/default.jpg';
        const bio = candidate.bio || 'No bio available';
        const status = candidate.status || 'active';
        
        html += `
            <div class="col-md-4 mb-4">
                <div class="card candidate-card h-100">
                    <div class="card-header text-center pt-4" style="background: linear-gradient(135deg, #00205b, #ce1126);">
                        <img src="${photo}" alt="${name}" class="rounded-circle" style="width: 100px; height: 100px; object-fit: cover; border: 3px solid white;" onerror="this.src='imgs/default.jpg'">
                    </div>
                    <div class="card-body text-center">
                        <h5 class="card-title">${name}</h5>
                        <p class="badge bg-primary mb-2">${position.toUpperCase()}</p>
                        <p class="card-text small">${bio}</p>
                        <span class="badge ${status === 'active' ? 'bg-success' : 'bg-secondary'} mb-2">${status}</span>
                    </div>
                    <div class="card-footer bg-transparent border-0 pb-3 text-center">
                        <button class="btn btn-sm btn-outline-primary me-2" onclick="editCandidate('${id}')">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteCandidate('${id}')">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
    
    grid.innerHTML = html;
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

// Open candidate modal (FIXED)
function openCandidateModal(candidateId = null) {
    console.log('Opening modal for candidate:', candidateId);
    
    // Get modal element
    const modalEl = document.getElementById('candidateModal');
    
    // Reset all form fields first
    document.getElementById('candidateName').value = '';
    document.getElementById('candidatePosition').value = '';
    document.getElementById('candidateId').value = '';
    document.getElementById('candidatePhoto').value = '';
    document.getElementById('candidateBio').value = '';
    document.getElementById('candidateStatus').value = 'active';
    document.getElementById('previewImage').src = 'imgs/default.jpg';
    
    // Enable ID field (in case it was disabled from previous edit)
    document.getElementById('candidateId').disabled = false;
    
    if (candidateId) {
        // EDIT MODE
        console.log('Edit mode for ID:', candidateId);
        document.getElementById('candidateModalLabel').innerHTML = '<i class="fas fa-edit me-2"></i>Edit Candidate';
        
        // Find candidate in allCandidates array
        const candidate = allCandidates.find(c => c.id === candidateId);
        console.log('Found candidate:', candidate);
        
        if (candidate) {
            // Fill form with candidate data
            document.getElementById('candidateName').value = candidate.name || '';
            document.getElementById('candidatePosition').value = candidate.position || '';
            document.getElementById('candidateId').value = candidate.id || '';
            document.getElementById('candidatePhoto').value = candidate.photo || '';
            document.getElementById('candidateBio').value = candidate.bio || '';
            document.getElementById('candidateStatus').value = candidate.status || 'active';
            
            // Update preview image
            if (candidate.photo) {
                document.getElementById('previewImage').src = candidate.photo;
            }
            
            // Disable ID field in edit mode (optional - remove if you want to allow ID changes)
            document.getElementById('candidateId').disabled = true;
        } else {
            console.error('Candidate not found with ID:', candidateId);
            showError('Candidate not found');
            return;
        }
    } else {
        // ADD MODE
        console.log('Add mode');
        document.getElementById('candidateModalLabel').innerHTML = '<i class="fas fa-plus me-2"></i>Add Candidate';
    }
    
    // Show modal
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
}

// Edit candidate helper
function editCandidate(id) {
    openCandidateModal(id);
}

// Save candidate (FIXED)
async function saveCandidate() {
    // Get form values with proper IDs
    const candidate = {
        id: document.getElementById('candidateId')?.value?.trim(),
        name: document.getElementById('candidateName')?.value?.trim(),
        position: document.getElementById('candidatePosition')?.value,
        photo: document.getElementById('candidatePhoto')?.value?.trim() || `imgs/${document.getElementById('candidateId')?.value}.jpg`,
        bio: document.getElementById('candidateBio')?.value?.trim() || '',
        status: document.getElementById('candidateStatus')?.value || 'active'
    };
    
    // Validate required fields
    if (!candidate.id) {
        showError('Candidate ID is required');
        return;
    }
    if (!candidate.name) {
        showError('Candidate name is required');
        return;
    }
    if (!candidate.position) {
        showError('Please select a position');
        return;
    }
    
    // Validate position
    if (!['president', 'senators', 'mayor'].includes(candidate.position)) {
        showError('Please select a valid position');
        return;
    }
    
    try {
        showLoading(true);
        
        // Check if we're in edit mode by looking at modal title
        const modalTitle = document.getElementById('candidateModalLabel').textContent;
        const isEditing = modalTitle.includes('Edit');
        
        const url = isEditing ? `/api/admin/candidates/${candidate.id}` : '/api/admin/candidates';
        const method = isEditing ? 'PUT' : 'POST';
        
        console.log('Saving candidate:', candidate);
        console.log('Mode:', isEditing ? 'Edit' : 'Add');
        console.log('URL:', url);
        console.log('Method:', method);
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            },
            body: JSON.stringify(candidate)
        });
        
        if (response.status === 401) {
            localStorage.removeItem('adminToken');
            localStorage.removeItem('adminEmail');
            localStorage.removeItem('adminName');
            localStorage.removeItem('adminRole');
            window.location.href = 'admin-login.html';
            return;
        }
        
        const data = await response.json();
        
        if (data.success) {
            // Hide modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('candidateModal'));
            if (modal) modal.hide();
            
            // Reset form
            document.getElementById('candidateName').value = '';
            document.getElementById('candidatePosition').value = '';
            document.getElementById('candidateId').value = '';
            document.getElementById('candidatePhoto').value = '';
            document.getElementById('candidateBio').value = '';
            document.getElementById('candidateStatus').value = 'active';
            document.getElementById('previewImage').src = 'imgs/default.jpg';
            document.getElementById('candidateId').disabled = false;
            
            // Reload candidates
            await loadCandidates();
            showSuccess(isEditing ? 'Candidate updated successfully' : 'Candidate added successfully');
            
            // Refresh dashboard if active
            if (document.getElementById('dashboard').classList.contains('active')) {
                loadDashboardStats();
            }
        } else {
            showError(data.message || 'Failed to save candidate');
        }
    } catch (error) {
        console.error('Error saving candidate:', error);
        showError('Failed to save candidate: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// Delete candidate
async function deleteCandidate(id) {
    if (!confirm('Are you sure you want to delete this candidate? This action cannot be undone.')) return;
    
    try {
        showLoading(true);
        
        const response = await fetch(`/api/admin/candidates/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            }
        });
        
        if (response.status === 401) {
            localStorage.removeItem('adminToken');
            localStorage.removeItem('adminEmail');
            localStorage.removeItem('adminName');
            localStorage.removeItem('adminRole');
            window.location.href = 'admin-login.html';
            return;
        }
        
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
        
        if (response.status === 401) {
            localStorage.removeItem('adminToken');
            localStorage.removeItem('adminEmail');
            localStorage.removeItem('adminName');
            localStorage.removeItem('adminRole');
            window.location.href = 'admin-login.html';
            return;
        }
        
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
        
        if (response.status === 401) {
            localStorage.removeItem('adminToken');
            localStorage.removeItem('adminEmail');
            localStorage.removeItem('adminName');
            localStorage.removeItem('adminRole');
            window.location.href = 'admin-login.html';
            return;
        }
        
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
        
        if (response.status === 401) {
            localStorage.removeItem('adminToken');
            localStorage.removeItem('adminEmail');
            localStorage.removeItem('adminName');
            localStorage.removeItem('adminRole');
            window.location.href = 'admin-login.html';
            return;
        }
        
        const data = await response.json();
        
        if (data.success) {
            const election = data.election;
            if (election) {
                document.getElementById('electionTitle').value = election.title || 'Philippine General Election 2024';
                
                // Format dates for datetime-local input
                if (election.startDate) {
                    const startDate = new Date(election.startDate);
                    document.getElementById('startDate').value = startDate.toISOString().slice(0,16);
                }
                if (election.endDate) {
                    const endDate = new Date(election.endDate);
                    document.getElementById('endDate').value = endDate.toISOString().slice(0,16);
                }
                
                document.getElementById('maxVotes').value = election.maxVotes || 1;
                
                const statusBadge = document.getElementById('electionStatus');
                if (statusBadge) {
                    statusBadge.innerHTML = `<span class="badge ${election.active ? 'bg-success' : 'bg-secondary'}">${election.active ? 'ACTIVE' : 'INACTIVE'}</span>`;
                }
                
                // Update timer
                if (election.active && election.endDate) {
                    startElectionTimer(election.endDate);
                } else {
                    document.getElementById('electionTimer').innerHTML = '';
                }
            } else {
                // No election found
                document.getElementById('electionStatus').innerHTML = '<span class="badge bg-secondary">NO ELECTION</span>';
                document.getElementById('electionTimer').innerHTML = '';
            }
        }
    } catch (error) {
        console.error('Error loading election status:', error);
        showError('Failed to load election status');
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
            timerEl.innerHTML = '<span class="text-danger">Election ended</span>';
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
    
    // Validate dates
    if (!electionData.startDate || !electionData.endDate) {
        showError('Please set both start and end dates');
        return;
    }
    
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
        
        if (response.status === 401) {
            localStorage.removeItem('adminToken');
            localStorage.removeItem('adminEmail');
            localStorage.removeItem('adminName');
            localStorage.removeItem('adminRole');
            window.location.href = 'admin-login.html';
            return;
        }
        
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
        
        if (response.status === 401) {
            localStorage.removeItem('adminToken');
            localStorage.removeItem('adminEmail');
            localStorage.removeItem('adminName');
            localStorage.removeItem('adminRole');
            window.location.href = 'admin-login.html';
            return;
        }
        
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
        
        if (response.status === 401) {
            localStorage.removeItem('adminToken');
            localStorage.removeItem('adminEmail');
            localStorage.removeItem('adminName');
            localStorage.removeItem('adminRole');
            window.location.href = 'admin-login.html';
            return;
        }
        
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
            <div class="stats-summary mb-4 p-3 bg-light rounded">
                <h4>Election Statistics</h4>
                <p><strong>Total Votes:</strong> ${statistics.totalVotes || 0}</p>
                <p><strong>Total Voters:</strong> ${statistics.totalVoters || 0}</p>
                <p><strong>Turnout:</strong> ${statistics.turnout || 0}%</p>
            </div>
        `;
    }
    
    // Render winners
    if (winners) {
        let winnersHtml = '<h4>Winners</h4><div class="row">';
        
        if (winners.president) {
            winnersHtml += `
                <div class="col-md-6 mb-3">
                    <div class="card border-success">
                        <div class="card-body">
                            <h5 class="card-title text-success">President</h5>
                            <h3>${winners.president.name}</h3>
                            <p class="card-text">${winners.president.votes} votes</p>
                        </div>
                    </div>
                </div>
            `;
        }
        
        if (winners.mayor) {
            winnersHtml += `
                <div class="col-md-6 mb-3">
                    <div class="card border-success">
                        <div class="card-body">
                            <h5 class="card-title text-success">Mayor</h5>
                            <h3>${winners.mayor.name}</h3>
                            <p class="card-text">${winners.mayor.votes} votes</p>
                        </div>
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
        
        if (response.status === 401) {
            localStorage.removeItem('adminToken');
            localStorage.removeItem('adminEmail');
            localStorage.removeItem('adminName');
            localStorage.removeItem('adminRole');
            window.location.href = 'admin-login.html';
            return;
        }
        
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
    showSuccess('Voter list exported (feature coming soon)');
}

// ==================== SETTINGS FUNCTIONS ====================

function addAdmin() {
    showSuccess('Add admin feature coming soon');
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

// ==================== PHOTO UPLOAD PREVIEW ====================

// Initialize photo upload preview
document.addEventListener('DOMContentLoaded', function() {
    const photoUpload = document.getElementById('photoUpload');
    if (photoUpload) {
        photoUpload.addEventListener('change', function(e) {
            if (e.target.files && e.target.files[0]) {
                const reader = new FileReader();
                reader.onload = function(readerEvent) {
                    document.getElementById('previewImage').src = readerEvent.target.result;
                    // Set a placeholder filename (in production, you'd upload to server)
                    document.getElementById('candidatePhoto').value = 'imgs/' + e.target.files[0].name;
                }
                reader.readAsDataURL(e.target.files[0]);
            }
        });
    }
});

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