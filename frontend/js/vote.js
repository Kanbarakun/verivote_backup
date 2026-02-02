// STEP 3: Multi-position voting system

const positions = [
  {
    title: "PRESIDENT",
    candidates: [
      { id: 1, name: "Candidate A" },
      { id: 2, name: "Candidate B" }
    ]
  },
  {
    title: "SENATORS",
    candidates: [
      { id: 3, name: "Candidate C" },
      { id: 4, name: "Candidate D" }
    ]
  },
  {
    title: "MAYOR",
    candidates: [
      { id: 5, name: "Candidate E" },
      { id: 6, name: "Candidate F" }
    ]
  }
];

let currentPositionIndex = 0;
let selectedVotes = {}; // { PRESIDENT: {...}, SENATORS: {...}, MAYOR: {...} }

const titleEl = document.getElementById("position-title");
const candidateList = document.getElementById("candidate-list");
const nextBtn = document.getElementById("nextBtn");

let selectedCandidate = null;

function renderPosition() {
  const position = positions[currentPositionIndex];
  titleEl.textContent = `Vote for ${position.title}`;
  candidateList.innerHTML = "";
  selectedCandidate = null;

  position.candidates.forEach(candidate => {
    const div = document.createElement("div");
    div.classList.add("candidate");
    div.textContent = candidate.name;

    div.addEventListener("click", () => {
      document.querySelectorAll(".candidate").forEach(c => {
        c.classList.remove("selected");
      });

      div.classList.add("selected");
      selectedCandidate = candidate;
    });

    candidateList.appendChild(div);
  });
}

nextBtn.addEventListener("click", () => {
  if (!selectedCandidate) {
    alert("Please select a candidate first.");
    return;
  }

  const position = positions[currentPositionIndex].title;
  selectedVotes[position] = selectedCandidate;

  currentPositionIndex++;

if (currentPositionIndex >= positions.length) {
  console.log("FINAL VOTES:", votes);

  // Save votes temporarily (frontend only)
  localStorage.setItem("votes", JSON.stringify(votes));

  // Redirect to confirmation page
  window.location.href = "confirm.html";
  return;
}

});

document.querySelectorAll(".vote-btn").forEach(btn => {
  btn.addEventListener("click", async () => {
    const candidateId = btn.dataset.id;
    const position = btn.dataset.position;

    const res = await fetch("http://localhost:3000/api/vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ candidateId, position })
    });

    const data = await res.json();
    alert(data.message);
  });
});


// Initial render
renderPosition();

document.addEventListener('DOMContentLoaded', () => {
    const voteButtons = document.querySelectorAll('.btn-outline-primary'); // Assuming this is your button class

    voteButtons.forEach(button => {
        button.addEventListener('click', async (e) => {
            const candidateName = e.target.innerText;
            
            // For now, let's just confirm the choice
            const confirmed = confirm(`Are you sure you want to vote for ${candidateName}?`);
            
            if (confirmed) {
                try {
                    const response = await fetch('/api/vote/cast', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            userId: "user123", // We will make this dynamic later
                            category: "president",
                            candidateId: candidateName 
                        })
                    });

                    const result = await response.json();
                    if (result.success) {
                        alert("Thank you for voting!");
                        window.location.href = 'confirm.html'; // Move to your confirmation screen
                    }
                } catch (error) {
                    console.error("Voting failed:", error);
                }
            }
        });
    });
});

// Router to hand vote casting and results.
router.get('/results', (req, res) => {
    const category = req.query.category;
    const votes = fileHandler.read('votes.json'); //
    
    // This is a simple count. In a real app, you'd filter by category first.
    // For now, let's send some "Mock" data so your charts look cool.
    const mockResults = {
        president: [
            { name: "Candidate A", votes: 120, percentage: 98 },
            { name: "Candidate B", votes: 80, percentage: 78 }
        ],
        senators: [
            { name: "Senator 1", votes: 50, percentage: 45 },
            { name: "Senator 2", votes: 30, percentage: 25 }
        ],
        mayor: [
            { name: "Mayor 1", votes: 100, percentage: 90 }
        ]
    };

    res.json({ results: mockResults[category] || [] });
});