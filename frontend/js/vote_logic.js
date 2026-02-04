let selectedCandidateId = null;

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Fetch Candidates from the "candidates" bin
    const response = await fetch('/api/admin/status'); // We use the status route we built earlier
    const data = await response.json();
    
    const list = document.getElementById('candidate-list');
    list.innerHTML = ''; // Clear spinner

    data.candidates.forEach(cand => {
        list.innerHTML += `
            <div class="col-md-4 mb-4">
                <div class="card h-100 shadow-sm">
                    <div class="card-body text-center">
                        <h5 class="card-title">${cand.name}</h5>
                        <p class="text-primary font-weight-bold">${cand.party}</p>
                        <button onclick="prepareVote('${cand.id}', '${cand.name}')" 
                                class="btn btn-outline-primary w-100">Select</button>
                    </div>
                </div>
            </div>
        `;
    });
});

function prepareVote(id, name) {
    selectedCandidateId = id;
    document.getElementById('confirm-text').innerText = `Are you sure you want to vote for ${name}?`;
    const modal = new bootstrap.Modal(document.getElementById('vote-modal'));
    modal.show();
}

document.getElementById('btn-submit-vote').addEventListener('click', async () => {
    const voterEmail = localStorage.getItem('userEmail'); // Retrieved from login

// Inside your click listener for the submit button
const response = await fetch('/api/vote/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ voterEmail, candidateId: selectedCandidateId })
});

const result = await response.json();

if (result.success) {
    // Show the professional success modal
    const successModal = new bootstrap.Modal(document.getElementById('successModal'));
    successModal.show();
} else {
    alert("Error: " + result.message);
}
});