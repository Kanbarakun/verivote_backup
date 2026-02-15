// 1. SMART URL HANDLER
// If you are on localhost (testing), it uses your local backend.
// If you are on the internet (Render/GitHub), it uses the Render backend.
const API_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:3000' 
    : 'https://verivote-backup.onrender.com';

const candidatesData = {
    president: [
        { id: "p1", name: "John Doe", photo: "imgs/john.jpg", bio: "Leading with vision." },
        { id: "p2", name: "Jane Smith", photo: "imgs/jane.jpg", bio: "Focus on growth." }
    ],
    senators: [
        { id: "s1", name: "Alice Johnson", photo: "imgs/alice.jpg", bio: "Economic reform." },
        { id: "s2", name: "Bob Lee", photo: "imgs/bob.jpg", bio: "Public safety." }
    ],
    mayor: [
        { id: "m1", name: "Charlie Brown", photo: "imgs/charlie.jpg", bio: "Urban transit." },
        { id: "m2", name: "Diana Prince", photo: "imgs/diana.jpg", bio: "Community focused." }
    ]
};

let selections = { president: null, senators: null, mayor: null };

// 2. CHECK STATUS (Fixed to use API_URL)
async function checkStatus() {
    const email = localStorage.getItem('userEmail');
    if (!email) {
        alert("Please log in first.");
        window.location.href = "index.html";
        return;
    }

    try {
        // We use API_URL here so it goes to the right server
        const res = await fetch(`${API_URL}/api/vote/status?email=${email}`);
        if (!res.ok) {
            const data = await res.json();
            if (data.hasVoted){
                alert("You have already voted.");
                window.location.href = "results.html";
            }
            console.warn("Server status check failed, allowing user to proceed.");
            return;
        }

        const data = await res.json();

        if (data.hasVoted) {
            alert("You have already voted. Redirecting to results.");
            window.location.href = "results.html";
        }
    } catch (error) {
        console.log("Could not verify status (Server might be sleeping), proceeding...", error);
    }
}

// 3. RENDER COLUMNS (No changes needed here)
function renderColumns() {
    ['president', 'senators', 'mayor'].forEach(category => {
        const container = document.getElementById(`${category}-list`);
        container.innerHTML = "";
        
        candidatesData[category].forEach(candidate => {
            const card = document.createElement('div');
            card.className = 'candidate-card';
            card.innerText = candidate.name;

            card.addEventListener('click', () => {
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

// 4. SUBMIT VOTE (Fixed to use API_URL)
document.getElementById('btn-submit-vote').addEventListener('click', async () => {
    // Validate selections
    if (!selections.president || !selections.senators || !selections.mayor) {
        alert("Please pick one candidate in every column!");
        return;
    }

    const email = localStorage.getItem('userEmail');
    const submitBtn = document.getElementById('btn-submit-vote');
    
    // Disable button to prevent double clicks
    submitBtn.innerText = "Submitting...";
    submitBtn.disabled = true;

    try {
        // USE API_URL HERE TO FIX 404
        const res = await fetch(`${API_URL}/api/vote/submit`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ voterEmail: email, selections })
        });

        // Handle specific server errors
        if (res.status === 404) {
             throw new Error("Server route not found. Backend might need an update.");
        }
        if (res.status === 403) {
            alert("This email has already cast a ballot. You cannot vote twice!");
            submitBtn.innerText = "DONE VOTING";
            // Don't re-enable button if they already voted
            return;
        }

        const data = await res.json();
        
        if (data.success) {
            // Show Success Modal
            const modalEl = document.getElementById('successModal');
            if(modalEl) {
                const successPopup = new bootstrap.Modal(modalEl);
                successPopup.show();
            } else {
                alert("Vote Submitted Successfully!");
            }

            // Redirect after 1.5 seconds
            setTimeout(() => {
                // Ensure confirm.html exists, otherwise change to results.html
                window.location.href = "results.html"; 
            }, 1500);
        } else {
            throw new Error(data.message || "Unknown error");
        }

    } catch (e) {
        console.error(e);
        alert("Submission failed: " + e.message);
        submitBtn.innerText = "SUBMIT VOTE"; // Reset text
        submitBtn.disabled = false; // Allow retry
    }
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkStatus();
    renderColumns();
});