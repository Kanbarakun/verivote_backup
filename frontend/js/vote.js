// --- CANDIDATE DATA ---
const candidatesData = {
    president: [
        { id: "p1", name: "John Doe", photo: "imgs/john.jpg", bio: "Leadership through experience. Focused on digitalization and economic reform." },
        { id: "p2", name: "Jane Smith", photo: "imgs/jane.jpg", bio: "Advocate for public education and universal healthcare access." },
        { id: "p3", name: "Michael Ross", photo: "imgs/michael.jpg", bio: "Dedicated to sustainable infrastructure and small business growth." }
    ],
    senators: [
        { id: "s1", name: "Alice Johnson", photo: "imgs/alice.jpg", bio: "Environmental policy expert fighting for a greener future." },
        { id: "s2", name: "Bob Lee", photo: "imgs/bob.jpg", bio: "Former teacher focused on youth empowerment and school funding." }
    ],
    mayor: [
        { id: "m1", name: "Charlie Brown", photo: "imgs/charlie.jpg", bio: "Committed to urban transit and local community engagement." },
        { id: "m2", name: "Diana Prince", photo: "imgs/diana.jpg", bio: "Focusing on public safety and transparent city management." }
    ]
};

let selectedVotes = { president: null, senators: null, mayor: null };

/**
 * Render all 3 categories into their respective columns
 */
function renderAll() {
    const hoverCard = document.getElementById('hover-info-card');

    Object.keys(candidatesData).forEach(category => {
        const container = document.getElementById(`${category}-list`);
        container.innerHTML = "";

        candidatesData[category].forEach(candidate => {
            const card = document.createElement('div');
            card.className = 'candidate-card';
            card.innerHTML = `<h6 class="mb-0 fw-bold">${candidate.name}</h6>`;

            // --- HOVER PREVIEW ---
            card.addEventListener('mouseenter', () => {
                document.getElementById('hover-photo').src = candidate.photo;
                document.getElementById('hover-name').innerText = candidate.name;
                document.getElementById('hover-platform').innerText = candidate.bio.substring(0, 50) + "...";
                hoverCard.style.display = 'block';
            });

            card.addEventListener('mousemove', (e) => {
                hoverCard.style.left = (e.pageX + 15) + "px";
                hoverCard.style.top = (e.pageY + 15) + "px";
            });

            card.addEventListener('mouseleave', () => hoverCard.style.display = 'none');

            // --- SELECTION & MANIFESTO ---
            card.addEventListener('click', () => {
                // Clear selection in this specific column only
                container.querySelectorAll('.candidate-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                
                selectedVotes[category] = candidate.id;

                // Show detailed info
                document.getElementById('modal-candidate-full-name').innerText = candidate.name;
                document.getElementById('modal-candidate-photo').src = candidate.photo;
                document.getElementById('modal-candidate-bio').innerText = candidate.bio;
                new bootstrap.Modal(document.getElementById('manifestoModal')).show();
            });

            container.appendChild(card);
        });
    });
}

/**
 * Submit the complete ballot
 */
document.getElementById('btn-submit-vote').addEventListener('click', async () => {
    // Ensure one person is picked for every category
    if (!selectedVotes.president || !selectedVotes.senators || !selectedVotes.mayor) {
        alert("Please select a candidate for ALL three positions before submitting!");
        return;
    }

    const voterEmail = localStorage.getItem('userEmail');
    const btn = document.getElementById('btn-submit-vote');
    btn.disabled = true;
    btn.innerText = "SUBMITTING...";

    try {
        const response = await fetch('https://verivote-backup.onrender.com/api/vote/submit', {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ voterEmail, selections: selectedVotes })
        });

        const data = await response.json();
        if (data.success) {
            new bootstrap.Modal(document.getElementById('successModal')).show();
        } else {
            alert("Error: " + data.message);
            btn.disabled = false;
            btn.innerText = "DONE VOTING";
        }
    } catch (err) {
        alert("Server error. Please try again later.");
        btn.disabled = false;
    }
});

document.addEventListener('DOMContentLoaded', renderAll);