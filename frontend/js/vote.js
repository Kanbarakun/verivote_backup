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
function renderPosition() {
    const position = positions[currentPositionIndex];
    if (titleEl) titleEl.textContent = `Vote for ${position.title}`;
    
    candidateList.innerHTML = "";
    selectedCandidate = null;

    position.candidates.forEach(candidate => {
        const div = document.createElement("div");
        div.className = "col-md-5 mb-3";
        div.innerHTML = `
            <div class="card p-3 shadow-sm candidate-card" style="cursor:pointer; border: 2px solid transparent;">
                <div class="text-center">
                    <h5 class="mb-0">${candidate.name}</h5>
                </div>
            </div>
        `;

        // Handle candidate selection
        div.addEventListener("click", () => {
            document.querySelectorAll(".candidate-card").forEach(c => c.style.borderColor = "transparent");
            div.querySelector(".card").style.borderColor = "#007bff";
            selectedCandidate = candidate;
            
            // Show confirmation modal
            const confirmText = document.getElementById("confirm-text");
            confirmText.innerText = `You are voting for ${candidate.name} as ${position.title}`;
            const confirmModal = new bootstrap.Modal(document.getElementById('vote-modal'));
            confirmModal.show();
        });

        candidateList.appendChild(div);
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