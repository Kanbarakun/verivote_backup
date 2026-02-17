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

// Test the API connection on page load
async function testAPIConnection() {
    try {
        const response = await fetch(`${API_URL}/api/test`);
        if (response.ok) {
            const data = await response.json();
            console.log('API connection successful:', data);
        } else {
            console.error('API test failed with status:', response.status);
        }
    } catch (error) {
        console.error('Cannot connect to API:', error);
    }
}

// Check if user has already voted
async function checkStatus() {
    const email = localStorage.getItem('userEmail');
    if (!email) {
        alert("Please log in first.");
        window.location.href = "index.html";
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
            alert("You have already voted. Redirecting to results.");
            window.location.href = "results.html";
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
        alert("Please pick one candidate in every column!");
        return;
    }

    const email = localStorage.getItem('userEmail');
    if (!email) {
        alert("No user email found. Please log in again.");
        window.location.href = "index.html";
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
            
            throw new Error("Server route not found. Please check backend deployment.");
        }

        if (res.status === 403) {
            alert("This email has already cast a ballot. You cannot vote twice!");
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
        alert("Submission failed: " + e.message);
        submitBtn.innerText = "SUBMIT VOTE";
        submitBtn.disabled = false;
    }
});

function showSuccess() {
    const modalEl = document.getElementById('successModal');
    if(modalEl) {
        const successPopup = new bootstrap.Modal(modalEl);
        successPopup.show();
    } else {
        alert("Vote Submitted Successfully!");
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