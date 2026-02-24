// API URL detection
const API_URL = (function() {
    if (window.location.hostname.includes('onrender.com')) {
        return 'https://verivote-backup.onrender.com';
    }
    return '';
})();

// Check if user is logged in
function checkAuth() {
    const userEmail = localStorage.getItem('userEmail');
    if (!userEmail) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// Show alert message
function showAlert(message, type = 'success') {
    const alertEl = document.getElementById('alertMessage');
    alertEl.className = `alert alert-${type}`;
    alertEl.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'} me-2"></i>${message}`;
    alertEl.style.display = 'block';
    
    setTimeout(() => {
        alertEl.style.display = 'none';
    }, 5000);
}

// Show loading state
function setLoading(button, isLoading, text = 'Save Changes') {
    if (isLoading) {
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Saving...';
    } else {
        button.disabled = false;
        button.innerHTML = `<i class="fas fa-save me-2"></i>${text}`;
    }
}

// Toggle password visibility
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const icon = event.target;
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

// Check password strength
function checkPasswordStrength(password) {
    let strength = 0;
    
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;
    
    return strength;
}

// Update password strength indicator
function updatePasswordStrength(password) {
    const strengthFill = document.getElementById('passwordStrengthFill');
    const strengthText = document.getElementById('passwordStrengthText');
    
    if (!password) {
        strengthFill.style.width = '0';
        strengthFill.className = 'strength-fill';
        strengthText.textContent = '';
        return;
    }
    
    const strength = checkPasswordStrength(password);
    
    strengthFill.className = 'strength-fill';
    
    if (strength <= 2) {
        strengthFill.classList.add('weak');
        strengthText.textContent = 'Weak password';
        strengthText.style.color = '#f44336';
    } else if (strength <= 4) {
        strengthFill.classList.add('medium');
        strengthText.textContent = 'Medium password';
        strengthText.style.color = '#ffc107';
    } else {
        strengthFill.classList.add('strong');
        strengthText.textContent = 'Strong password';
        strengthText.style.color = '#4caf50';
    }
}

// Fetch user's voting status from backend
async function fetchUserVotingStatus(email) {
    try {
        const response = await fetch(`${API_URL}/api/vote/status?email=${encodeURIComponent(email)}`);
        if (!response.ok) {
            throw new Error('Failed to fetch voting status');
        }
        const data = await response.json();
        return data.hasVoted;
    } catch (error) {
        console.error('Error fetching voting status:', error);
        return false;
    }
}

// Fetch user's voting history
async function fetchUserVotingHistory(email) {
    try {
        const response = await fetch(`${API_URL}/api/vote/history?email=${encodeURIComponent(email)}`);
        if (!response.ok) {
            throw new Error('Failed to fetch voting history');
        }
        const data = await response.json();
        return data.votes || [];
    } catch (error) {
        console.error('Error fetching voting history:', error);
        return [];
    }
}

// Load user profile data
async function loadUserProfile() {
    if (!checkAuth()) return;
    
    const email = localStorage.getItem('userEmail');
    
    try {
        // Fetch actual voting status from backend
        const hasVoted = await fetchUserVotingStatus(email);
        localStorage.setItem('hasVoted', hasVoted ? 'true' : 'false');
        
        // For now, we'll use mock user data since we need a profile endpoint
        // In production, you'd fetch from: `${API_URL}/api/auth/profile`
        
        const mockUserData = {
            name: localStorage.getItem('userName') || email.split('@')[0],
            email: email,
            createdAt: '2024-01-15T10:30:00.000Z'
        };
        
        // Update profile display
        document.getElementById('profileName').textContent = mockUserData.name;
        document.getElementById('profileEmail').textContent = mockUserData.email;
        document.getElementById('fullName').value = mockUserData.name;
        document.getElementById('displayEmail').value = mockUserData.email;
        
        // Format date
        const createdDate = new Date(mockUserData.createdAt);
        document.getElementById('accountCreated').value = createdDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        // Update voting status based on ACTUAL backend data
        const statusBadge = document.getElementById('votingStatusBadge');
        if (hasVoted) {
            statusBadge.textContent = '✓ You have voted';
            statusBadge.className = 'badge badge-success';
        } else {
            statusBadge.textContent = '○ You have not voted yet';
            statusBadge.className = 'badge badge-warning';
        }
        
        // Load voting history
        loadVotingHistory(email, hasVoted);
        
    } catch (error) {
        console.error('Error loading profile:', error);
        showAlert('Failed to load profile data', 'danger');
    }
}

// Load voting history
async function loadVotingHistory(email, hasVoted) {
    const historyDiv = document.getElementById('votingHistory');
    
    if (!hasVoted) {
        historyDiv.innerHTML = `
            <div class="no-history">
                <i class="fas fa-vote-yea fa-3x mb-3" style="color: rgba(255,255,255,0.3);"></i>
                <p>You haven't voted in any elections yet.</p>
                <a href="vote.html" class="btn-vote-now mt-3">Vote Now</a>
            </div>
        `;
        return;
    }
    
    // Fetch actual voting history
    const votes = await fetchUserVotingHistory(email);
    
    if (votes.length === 0) {
        historyDiv.innerHTML = `
            <div class="vote-history-item">
                <div class="vote-icon">
                    <i class="fas fa-check-circle"></i>
                </div>
                <div class="vote-details">
                    <p>You have voted in the current election</p>
                    <span class="vote-time">Vote recorded</span>
                </div>
            </div>
        `;
    } else {
        let historyHtml = '';
        votes.forEach(vote => {
            historyHtml += `
                <div class="vote-history-item">
                    <div class="vote-icon">
                        <i class="fas fa-check-circle"></i>
                    </div>
                    <div class="vote-details">
                        <p>Vote Cast</p>
                        <span class="vote-time">${new Date(vote.timestamp).toLocaleString()}</span>
                    </div>
                </div>
            `;
        });
        historyDiv.innerHTML = historyHtml;
    }
}

// Save profile changes
async function saveProfileChanges(event) {
    event.preventDefault();
    
    const saveBtn = document.getElementById('saveInfoBtn');
    const newName = document.getElementById('fullName').value.trim();
    const email = localStorage.getItem('userEmail');
    
    if (!newName) {
        showAlert('Name cannot be empty', 'danger');
        return;
    }
    
    setLoading(saveBtn, true, 'Save Changes');
    
    try {
        // In production: await fetch(`${API_URL}/api/auth/profile`, {...})
        // Mock successful update for now
        
        localStorage.setItem('userName', newName);
        document.getElementById('profileName').textContent = newName;
        
        showAlert('Profile updated successfully!', 'success');
    } catch (error) {
        console.error('Error saving profile:', error);
        showAlert('Failed to update profile', 'danger');
    } finally {
        setLoading(saveBtn, false, 'Save Changes');
    }
}

// Update password
async function updatePassword(event) {
    event.preventDefault();
    
    const saveBtn = document.getElementById('saveSecurityBtn');
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    // Validate
    if (!currentPassword || !newPassword || !confirmPassword) {
        showAlert('All password fields are required', 'danger');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        showAlert('New passwords do not match', 'danger');
        return;
    }
    
    if (newPassword.length < 8) {
        showAlert('Password must be at least 8 characters long', 'danger');
        return;
    }
    
    setLoading(saveBtn, true, 'Update Password');
    
    try {
        // In production: await fetch(`${API_URL}/api/auth/password`, {...})
        
        showAlert('Password updated successfully!', 'success');
        
        // Clear password fields
        document.getElementById('currentPassword').value = '';
        document.getElementById('newPassword').value = '';
        document.getElementById('confirmPassword').value = '';
        updatePasswordStrength('');
        
    } catch (error) {
        console.error('Error updating password:', error);
        showAlert('Failed to update password. Please check your current password.', 'danger');
    } finally {
        setLoading(saveBtn, false, 'Update Password');
    }
}

// Delete account - OPEN MODAL
// Delete account - OPEN MODAL (FIXED)
function deleteAccount() {
    const modal = new bootstrap.Modal(document.getElementById('deleteModal'));
    modal.show();
}

// Confirm delete account 
async function confirmDelete() {
    const modal = bootstrap.Modal.getInstance(document.getElementById('deleteModal'));
    const deleteBtn = document.querySelector('#deleteModal .btn-danger');
    const originalText = deleteBtn.innerHTML;
    
    try {
        // Show loading state
        deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Deleting...';
        deleteBtn.disabled = true;
        
        // Get token from localStorage
        const token = localStorage.getItem('token');
        const userEmail = localStorage.getItem('userEmail');
        
        if (!token) {
            throw new Error('No authentication token found');
        }
        
        console.log(`Deleting account for: ${userEmail}`);
        
        // Call the backend to actually delete the account
        const response = await fetch(`${API_URL}/api/auth/account`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Failed to delete account');
        }
        
        if (data.success) {
            // Clear ALL local storage
            localStorage.clear();
            
            // Hide modal
            modal.hide();
            
            // Show success message
            showAlert('Account deleted successfully. Redirecting...', 'success');
            
            // Redirect to home page
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
        } else {
            throw new Error(data.message || 'Failed to delete account');
        }
        
    } catch (error) {
        console.error('Error deleting account:', error);
        
        // Reset button
        deleteBtn.innerHTML = originalText;
        deleteBtn.disabled = false;
        
        // Show error message
        showAlert('Failed to delete account: ' + error.message, 'danger');
        
        // Hide modal
        modal.hide();
    }
}


// Logout function
function logout() {
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    localStorage.removeItem('token');
    localStorage.removeItem('hasVoted');
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminEmail');
    localStorage.removeItem('adminName');
    localStorage.removeItem('adminRole');
    window.location.href = 'index.html';
}

// Initialize Bootstrap tabs properly
function initializeTabs() {
    // Get all tab buttons
    const tabButtons = document.querySelectorAll('[data-bs-toggle="tab"]');
    
    // Add click event to each tab
    tabButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Remove active class from all tabs
            tabButtons.forEach(btn => {
                btn.classList.remove('active');
                btn.setAttribute('aria-selected', 'false');
            });
            
            // Add active class to clicked tab
            this.classList.add('active');
            this.setAttribute('aria-selected', 'true');
            
            // Hide all tab panes
            document.querySelectorAll('.tab-pane').forEach(pane => {
                pane.classList.remove('show', 'active');
            });
            
            // Show selected tab pane
            const targetId = this.getAttribute('data-bs-target');
            const targetPane = document.querySelector(targetId);
            if (targetPane) {
                targetPane.classList.add('show', 'active');
            }
        });
    });
}

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    // Check authentication
    if (!checkAuth()) return;
    
    // Update navigation
    updateNavAuth();
    
    // Initialize tabs
    initializeTabs();
    
    // Load user profile
    loadUserProfile();
    
    // Setup form submissions
    document.getElementById('profileInfoForm').addEventListener('submit', saveProfileChanges);
    document.getElementById('profileSecurityForm').addEventListener('submit', updatePassword);
    
    // Password strength checker
    document.getElementById('newPassword').addEventListener('input', (e) => {
        updatePasswordStrength(e.target.value);
    });
    
    // Password match checker
    document.getElementById('confirmPassword').addEventListener('input', (e) => {
        const newPass = document.getElementById('newPassword').value;
        const confirmPass = e.target.value;
        const matchEl = document.getElementById('passwordMatch');
        
        if (!confirmPass) {
            matchEl.textContent = '';
            matchEl.className = 'password-match';
        } else if (newPass === confirmPass) {
            matchEl.textContent = '✓ Passwords match';
            matchEl.className = 'password-match valid';
        } else {
            matchEl.textContent = '✗ Passwords do not match';
            matchEl.className = 'password-match invalid';
        }
    });
});

// Make functions global for onclick handlers
window.togglePassword = togglePassword;
window.deleteAccount = deleteAccount;
window.confirmDelete = confirmDelete;
window.logout = logout;