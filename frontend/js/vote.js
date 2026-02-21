// frontend/js/vote.js

// More robust API URL detection
const API_URL = (function() {
    if (window.location.hostname.includes('onrender.com')) {
        return 'https://verivote-backup.onrender.com';
    }
    return '';
})();

console.log('Using API URL:', API_URL);

// Candidate data - will be populated from API
let candidatesData = {
    president: [],
    senators: [],
    mayor: []
};

let selections = { president: null, senators: null, mayor: null };
let electionActive = false;
let electionEndDate = null;

function showNotification(message, type = 'warning', title = 'Notification') {
    const modalEl = document.getElementById('notificationModal');
    if (!modalEl) {
        // Fallback to alert if modal doesn't exist
        alert(message);
        return;
    }

    // Set icon and colors based on type
    const iconEl = document.getElementById('notificationIcon');
    const titleEl = document.getElementById('notificationTitle');
    const messageEl = document.getElementById('notificationMessage');
    
    // Remove existing icon classes
    iconEl.className = 'notification-icon';
    
    // Set appropriate icon and class
    switch(type) {
        case 'warning':
            iconEl.classList.add('warning');
            iconEl.innerHTML = '<i class="fas fa-exclamation-triangle"></i>';
            titleEl.textContent = title || 'Warning';
            break;
        case 'error':
            iconEl.classList.add('error');
            iconEl.innerHTML = '<i class="fas fa-times-circle"></i>';
            titleEl.textContent = title || 'Error';
            break;
        case 'success':
            iconEl.classList.add('success');
            iconEl.innerHTML = '<i class="fas fa-check-circle"></i>';
            titleEl.textContent = title || 'Success';
            break;
        case 'info':
            iconEl.classList.add('info');
            iconEl.innerHTML = '<i class="fas fa-info-circle"></i>';
            titleEl.textContent = title || 'Information';
            break;
        default:
            iconEl.classList.add('info');
            iconEl.innerHTML = '<i class="fas fa-info-circle"></i>';
            titleEl.textContent = title || 'Notification';
    }
    
    messageEl.textContent = message;
    
    // Show the modal
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
}

// Test the API connection on page load
async function testAPIConnection() {
    try {
        const response = await fetch(`${API_URL}/api/test`);
        if (response.ok) {
            const data = await response.json();
            console.log('API connection successful:', data);
        } else {
            console.error('API test failed with status:', response.status);
            showNotification('Cannot connect to voting server. Please check your connection.', 'error');
        }
    } catch (error) {
        console.error('Cannot connect to API:', error);
        showNotification('Network error. Please check your internet connection.', 'error');
    }
}

// Check if election is active
async function checkElectionStatus() {
    try {
        const response = await fetch(`${API_URL}/api/vote/election-status`);
        const data = await response.json();
        
        if (data.success) {
            electionActive = data.isActive;
            electionEndDate = data.election?.endDate || null;
            
            const statusBanner = document.getElementById('electionStatusBanner');
            const submitBtn = document.getElementById('btn-submit-vote');
            
            if (!electionActive) {
                // Show inactive message
                if (!statusBanner) {
                    const banner = document.createElement('div');
                    banner.id = 'electionStatusBanner';
                    banner.className = 'alert alert-warning text-center mb-4';
                    banner.innerHTML = '<i class="fas fa-clock me-2"></i>Voting is currently closed. Please wait for the election to start.';
                    document.querySelector('.container-fluid').insertBefore(banner, document.querySelector('.row'));
                }
                
                // Disable all candidate cards
                document.querySelectorAll('.candidate-card').forEach(card => {
                    card.style.opacity = '0.6';
                    card.style.pointerEvents = 'none';
                    card.style.cursor = 'not-allowed';
                });
                
                // Disable submit button
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.style.opacity = '0.6';
                    submitBtn.title = 'Voting is currently closed';
                }
            } else {
                // Remove banner if exists
                const existingBanner = document.getElementById('electionStatusBanner');
                if (existingBanner) existingBanner.remove();
                
                // Enable cards
                document.querySelectorAll('.candidate-card').forEach(card => {
                    card.style.opacity = '1';
                    card.style.pointerEvents = 'auto';
                    card.style.cursor = 'pointer';
                });
                
                // Enable submit button
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.style.opacity = '1';
                    submitBtn.title = '';
                }
                
                // Show countdown if end date exists
                if (electionEndDate) {
                    startElectionCountdown(electionEndDate);
                }
            }
        }
    } catch (error) {
        console.error('Error checking election status:', error);
    }
}

// Start election countdown
function startElectionCountdown(endDate) {
    const end = new Date(endDate).getTime();
    
    const timerDiv = document.createElement('div');
    timerDiv.id = 'electionTimer';
    timerDiv.className = 'alert alert-info text-center mb-4';
    document.querySelector('.container-fluid').insertBefore(timerDiv, document.querySelector('.row'));
    
    const timer = setInterval(() => {
        const now = new Date().getTime();
        const distance = end - now;
        
        if (distance < 0) {
            clearInterval(timer);
            timerDiv.innerHTML = '<i class="fas fa-hourglass-end me-2"></i>Election has ended';
            checkElectionStatus(); // Re-check status
            return;
        }
        
        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        
        timerDiv.innerHTML = `<i class="fas fa-hourglass-half me-2"></i>Election ends in: ${days}d ${hours}h ${minutes}m`;
    }, 60000);
}

// Fetch candidates from backend
async function fetchCandidates() {
    try {
        console.log('Fetching candidates from API...');
        const response = await fetch(`${API_URL}/api/vote/candidates`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch candidates');
        }
        
        const data = await response.json();
        
        if (data.success) {
            candidatesData = data.candidates;
            console.log('Candidates loaded:', candidatesData);
            
            // Check if any position has no candidates
            if (candidatesData.president.length === 0) {
                showNotification('No president candidates available. Please contact admin.', 'warning');
            }
            if (candidatesData.senators.length === 0) {
                showNotification('No senator candidates available. Please contact admin.', 'warning');
            }
            if (candidatesData.mayor.length === 0) {
                showNotification('No mayor candidates available. Please contact admin.', 'warning');
            }
            
            renderColumns();
            await checkElectionStatus(); // Check status after rendering
        } else {
            console.error('Failed to load candidates');
            showNotification('Failed to load candidates. Please refresh.', 'error');
        }
    } catch (error) {
        console.error('Error fetching candidates:', error);
        showNotification('Error loading candidates. Please try again.', 'error');
    }
}

// Check if user has already voted
async function checkStatus() {
    const email = localStorage.getItem('userEmail');
    if (!email) {
        showNotification('Please log in first.', 'warning', 'Login Required');
        setTimeout(() => {
            window.location.href = "login.html";
        }, 2000);
        return;
    }

    try {
        const res = await fetch(`${API_URL}/api/vote/status?email=${encodeURIComponent(email)}`);
        
        if (!res.ok) {
            console.warn("Status check failed, allowing user to proceed");
            return;
        }

        const data = await res.json();
        console.log("Status check:", data);

        if (data.hasVoted) {
            showNotification('You have already voted. Redirecting to results.', 'info', 'Already Voted');
            setTimeout(() => {
                window.location.href = "results.html";
            }, 2000);
        }
    } catch (error) {
        console.log("Could not verify status:", error.message);
    }
}

// Render candidate columns
function renderColumns() {
    ['president', 'senators', 'mayor'].forEach(category => {
        const container = document.getElementById(`${category}-list`);
        if (!container) {
            console.error(`Container for ${category} not found`);
            return;
        }
        
        container.innerHTML = "";
        
        if (!candidatesData[category] || candidatesData[category].length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'text-center text-muted py-4';
            emptyMessage.innerText = 'No candidates available';
            container.appendChild(emptyMessage);
            return;
        }
        
        candidatesData[category].forEach(candidate => {
            const card = document.createElement('div');
            card.className = 'candidate-card';
            card.innerText = candidate.name;
            card.dataset.id = candidate.id;
            card.dataset.category = category;

            card.addEventListener('click', () => {
                // Check if election is active
                if (!electionActive) {
                    showNotification('Voting is currently closed.', 'warning', 'Election Closed');
                    return;
                }
                
                // Remove selected class from all cards in this category
                container.querySelectorAll('.candidate-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                selections[category] = candidate.id;
                
                // Update Modal Info
                const photoEl = document.getElementById('modal-photo');
                if(photoEl) photoEl.src = candidate.photo || 'imgs/default.jpg';
                
                document.getElementById('modal-name').innerText = candidate.name;
                document.getElementById('modal-bio').innerText = candidate.bio || 'No bio available';
                
                const modalEl = document.getElementById('manifestoModal');
                if(modalEl) {
                    new bootstrap.Modal(modalEl).show();
                }
            });
            container.appendChild(card);
        });
    });
}

// Submit vote function
document.getElementById('btn-submit-vote').addEventListener('click', async () => {
    // Check if election is active
    if (!electionActive) {
        showNotification('Voting is currently closed.', 'warning', 'Election Closed');
        return;
    }
    
    // Check if all categories have selections
    if (!selections.president || !selections.senators || !selections.mayor) {
        const missing = [];
        if (!selections.president) missing.push('President');
        if (!selections.senators) missing.push('Senator');
        if (!selections.mayor) missing.push('Mayor');
        
        showNotification(`Please select a candidate for: ${missing.join(', ')}`, 'warning', 'Incomplete Selection');
        return;
    }

    const email = localStorage.getItem('userEmail');
    if (!email) {
        showNotification('No user email found. Please log in again.', 'error', 'Session Expired');
        setTimeout(() => {
            window.location.href = "login.html";
        }, 2000);
        return;
    }

    const submitBtn = document.getElementById('btn-submit-vote');
    
    submitBtn.innerText = "Submitting...";
    submitBtn.disabled = true;

    try {
        console.log('Submitting vote to:', `${API_URL}/api/vote/submit`);
        console.log('Selections:', selections);
        
        const res = await fetch(`${API_URL}/api/vote/submit`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ voterEmail: email, selections })
        });

        console.log('Response status:', res.status);
        const data = await res.json();

        if (res.status === 403) {
            if (data.message.includes('closed')) {
                showNotification('Voting is currently closed.', 'warning', 'Election Closed');
            } else {
                showNotification('You have already voted.', 'warning', 'Already Voted');
            }
            submitBtn.innerText = "DONE VOTING";
            submitBtn.disabled = false;
            return;
        }

        if (res.status === 404) {
            showNotification('Server route not found. Please check backend deployment.', 'error', 'Connection Error');
            submitBtn.innerText = "DONE VOTING";
            submitBtn.disabled = false;
            return;
        }

        if (data.success) {
            showSuccess();
        } else {
            throw new Error(data.message || "Unknown error");
        }

    } catch (e) {
        console.error('Submission error:', e);
        showNotification('Submission failed: ' + e.message, 'error', 'Vote Failed');
        submitBtn.innerText = "DONE VOTING";
        submitBtn.disabled = false;
    }
});

function showSuccess() {
    const modalEl = document.getElementById('successModal');
    if(modalEl) {
        const successPopup = new bootstrap.Modal(modalEl);
        successPopup.show();
    } else {
        showNotification('Vote Submitted Successfully!', 'success', 'Thank You!');
    }

    setTimeout(() => {
        window.location.href = "results.html";
    }, 1500);
}

// Initialize everything when page loads
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Vote page loaded');
    await testAPIConnection();
    await checkStatus();
    await fetchCandidates(); // This now calls checkElectionStatus after rendering
    
    console.log('Selections object initialized:', selections);
});