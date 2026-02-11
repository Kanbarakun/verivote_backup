// Data structure for the voting process
const positions = [
    { title: "PRESIDENT", category: "president", candidates: [{ id: "p1", name: "Candidate A" }, { id: "p2", name: "Candidate B" }] },
    { title: "SENATORS", category: "senators", candidates: [{ id: "s1", name: "Candidate C" }, { id: "s2", name: "Candidate D" }] },
    { title: "MAYOR", category: "mayor", candidates: [{ id: "m1", name: "Candidate E" }, { id: "m2", name: "Candidate F" }] }
];

let currentPositionIndex = 0;
let selectedVotes = {}; // Stores final selections
let selectedCandidate = null;

// UI Elements
const titleEl = document.getElementById("position-title"); // Ensure this ID exists in your HTML
const candidateList = document.getElementById("candidate-list");
const nextBtn = document.getElementById("btn-submit-vote"); // The button in your Confirm Modal

// 1. Render the current voting category
// 1. Your updated data structure
const candidatesData = {
    president: [
        { id: "p1", name: "John Doe", photo: "imgs/john.jpg", bio: "Leading with integrity and vision for a better future." },
        { id: "p2", name: "Jane Smith", photo: "imgs/jane.jpg", bio: "Commitment to community growth and sustainable education." }
    ],
    // Add other categories...
};

function renderPosition(category) {
    const list = document.getElementById('candidate-list');
    const hoverCard = document.getElementById('hover-info-card');
    list.innerHTML = ""; 

    candidatesData[category].forEach(candidate => {
        const col = document.createElement('div');
        col.className = 'col-md-4';
        col.innerHTML = `
            <div class="card p-4 candidate-card text-center" data-id="${candidate.id}">
                <h5 class="mt-2">${candidate.name}</h5>
            </div>
        `;

        const card = col.querySelector('.candidate-card');

        // --- HOVER LOGIC ---
        card.addEventListener('mouseenter', () => {
            document.getElementById('hover-photo').src = candidate.photo;
            document.getElementById('hover-name').innerText = candidate.name;
            document.getElementById('hover-platform').innerText = candidate.bio;
            hoverCard.style.display = 'block';
        });

        card.addEventListener('mousemove', (e) => {
            hoverCard.style.left = (e.pageX + 15) + 'px';
            hoverCard.style.top = (e.pageY + 15) + 'px';
        });

        card.addEventListener('mouseleave', () => {
            hoverCard.style.display = 'none';
        });

        // --- CLICK (SELECTION) LOGIC ---
        card.addEventListener('click', () => {
            // Remove previous green highlight in this category
            document.querySelectorAll('.candidate-card').forEach(c => c.classList.remove('selected'));
            
            // Apply new green highlight
            card.classList.add('selected');
            
            // Save selection (Example)
            userSelections[category] = candidate.id;
            console.log(`Selected ${candidate.name} for ${category}`);
        });

        list.appendChild(col);
    });
}

// 2. Handle the "Submit Ballot" button inside the Confirmation Modal
nextBtn.addEventListener("click", async () => {
    if (!selectedCandidate) return;

    // Record selection for current position
    const currentPos = positions[currentPositionIndex];
    selectedVotes[currentPos.category] = selectedCandidate.id;

    // Close the confirmation modal
    const confirmModal = bootstrap.Modal.getInstance(document.getElementById('vote-modal'));
    confirmModal.hide();

    // Check if there are more positions to vote for
    if (currentPositionIndex < positions.length - 1) {
        currentPositionIndex++;
        renderPosition();
    } else {
        // FINAL STEP: Submit all votes to the backend
        await submitFinalBallot();  
    }
});

// 3. Final submission to the Server
async function submitFinalBallot() {
    const voterEmail = localStorage.getItem('userEmail');

    try {
        const response = await fetch('/api/vote/submit', {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                voterEmail: voterEmail,
                selections: selectedVotes // Sends {president: "p1", senators: "s1"...}
            })
        });

        const data = await response.json();

        if (data.success) {
            // SHOW THE ANIMATED SUCCESS MODAL WE CREATED
            const successModal = new bootstrap.Modal(document.getElementById('successModal'));
            successModal.show();
        } else {
            alert("Voting Error: " + data.message);
        }
    } catch (err) {
        console.error("Submission failed:", err);
        alert("Server error. Please try again.");
    }
}

// Initial render
document.addEventListener('DOMContentLoaded', renderPosition);