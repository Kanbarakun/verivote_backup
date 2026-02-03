// Load current state when page opens
document.addEventListener('DOMContentLoaded', async () => {
    fetchStatus();
});

async function fetchStatus() {
    const response = await fetch('/api/admin/status');
    const data = await response.json();
    
    // Update the UI Badge
    const statusBadge = document.getElementById('current-status');
    statusBadge.innerText = data.election.status.toUpperCase();
    statusBadge.className = data.election.status === 'open' ? 'badge bg-success' : 'badge bg-danger';
}

// Toggle Election (Core Feature #7)
async function toggleElection(newStatus) {
    const response = await fetch('/api/admin/toggle-election', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
    });
    const result = await response.json();
    if (result.success) {
        alert(`Election is now ${newStatus}`);
        fetchStatus();
    }
}

// Add Candidate (Core Feature #7)
async function addCandidate() {
    const name = document.getElementById('cand-name').value;
    const party = document.getElementById('cand-party').value;

    if (!name || !party) return alert("Fill in candidate details!");

    const response = await fetch('/api/admin/add-candidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, party })
    });
    
    if (response.ok) {
        alert("Candidate added successfully!");
        document.getElementById('cand-name').value = '';
        document.getElementById('cand-party').value = '';
    }
}