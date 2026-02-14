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

// NEW: Check if user is allowed to be here
async function checkStatus() {
    const email = localStorage.getItem('userEmail');
    if (!email) {
        alert("Please log in first.");
        window.location.href = "index.html";
        return;
    }

    try {
        const res = await fetch(`https://verivote-backup.onrender.com/api/vote/status?email=${email}`);
        const data = await res.json();

        if (data.hasVoted) {
            alert("You have already voted in this election. Redirecting to results.");
            window.location.href = "results.html";
        }
    } catch (error) {
        console.log("Could not verify status, proceeding...", error);
    }
}

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
                
                // Show info modal
                document.getElementById('modal-photo').src = candidate.photo;
                document.getElementById('modal-name').innerText = candidate.name;
                document.getElementById('modal-bio').innerText = candidate.bio;
                new bootstrap.Modal(document.getElementById('manifestoModal')).show();
            });
            container.appendChild(card);
        });
    });
}

document.getElementById('btn-submit-vote').addEventListener('click', async () => {
    if (!selections.president || !selections.senators || !selections.mayor) {
        alert("Please pick one candidate in every column!");
        return;
    }

    const email = localStorage.getItem('userEmail');
    const submitBtn = document.getElementById('btn-submit-vote');
    submitBtn.innerText = "Submitting...";
    submitBtn.disabled = true;

    try {
        const res = await fetch('https://verivote-backup.onrender.com/api/vote/submit', {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ voterEmail: email, selections })
        });

        if (res.status === 403) {
            alert("This email has already cast a ballot. You cannot vote twice!");
            submitBtn.innerText = "DONE VOTING";
            submitBtn.disabled = false;
            return;
        }

        const data = await res.json();
        if (data.success) {
            const successPopup = new bootstrap.Modal(document.getElementById('successModal'));
            successPopup.show();
        }
    } catch (e) {
        alert("Server error. Please check your connection.");
        submitBtn.innerText = "DONE VOTING";
        submitBtn.disabled = false;
    }
});

document.addEventListener('DOMContentLoaded', () => {
    checkStatus(); // Run check immediately
    renderColumns();
});