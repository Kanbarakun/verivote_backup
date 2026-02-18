// frontend/js/vote.js

// More robust API URL detection
const API_URL = (function() {
    // If deployed on Render
    if (window.location.hostname.includes('onrender.com')) {
        return 'https://verivote-backup.onrender.com';
    }
    // Fallback 
    return '';
})();

console.log('Using API URL:', API_URL);

// Candidate data - this is what populates the columns
const candidatesData = {
    president: [
        { id: "p1", name: "Maria Santos", photo: "imgs/john.jpg", bio: "Leading with vision." },
        { id: "p2", name: "Jose Reyes", photo: "imgs/jane.jpg", bio: "Focus on growth." }
    ],
    senators: [
        { id: "s1", name: "Carla Villanueva", photo: "imgs/alice.jpg", bio: "Economic reform." },
        { id: "s2", name: "Ramon Lopez", photo: "imgs/bob.jpg", bio: "Public safety." }
    ],
    mayor: [
        { id: "m1", name: "Tonyo Fernandez", photo: "imgs/charlie.jpg", bio: "Urban transit." },
        { id: "m2", name: "Elena Castillo", photo: "imgs/diana.jpg", bio: "Community focused." }
    ]
};

let selections = { president: null, senators: null, mayor: null };

// Custom notification function
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
        
        candidatesData[category].forEach(candidate => {
            const card = document.createElement('div');
            card.className = 'candidate-card';
            card.innerText = candidate.name;
            card.dataset.id = candidate.id;
            card.dataset.category = category;

            card.addEventListener('click', () => {
                // Remove selected class from all cards in this category
                container.querySelectorAll('.candidate-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                selections[category] = candidate.id;
                
                // Update Modal Info
                const photoEl = document.getElementById('modal-photo');
                if(photoEl) photoEl.src = candidate.photo;
                
                document.getElementById('modal-name').innerText = candidate.name;
                document.getElementById('modal-bio').innerText = candidate.bio;
                
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
    if (!selections.president || !selections.senators || !selections.mayor) {
        showNotification('Please select one candidate from each column!', 'warning', 'Incomplete Selection');
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

        if (res.status === 404) {
            // Try alternative endpoint without /api prefix
            console.log('Trying alternative endpoint...');
            const altRes = await fetch(`${API_URL}/vote/submit`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ voterEmail: email, selections })
            });
            
            if (altRes.ok) {
                const data = await altRes.json();
                if (data.success) {
                    showSuccess();
                    return;
                }
            }
            
            showNotification('Server route not found. Please check backend deployment.', 'error', 'Connection Error');
            submitBtn.innerText = "DONE VOTING";
            submitBtn.disabled = false;
            return;
        }

        if (res.status === 403) {
            showNotification('This email has already cast a ballot. You cannot vote twice!', 'warning', 'Already Voted');
            submitBtn.innerText = "DONE VOTING";
            submitBtn.disabled = false;
            return;
        }

        const data = await res.json();
        
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
document.addEventListener('DOMContentLoaded', () => {
    console.log('Vote page loaded');
    testAPIConnection();
    checkStatus();
    renderColumns();
    
    // Log the selections object to verify it's working
    console.log('Selections object initialized:', selections);
});