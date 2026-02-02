document.addEventListener('DOMContentLoaded', () => {
    // 1. Get the Candidate ID from the URL (e.g., candidate.html?id=p1)
    const params = new URLSearchParams(window.location.search);
    const candidateId = params.get('id');

    // 2. In a real cloud app, you'd fetch this from your API
    // For now, we'll simulate the data based on your design
    const mockData = {
        "p1": {
            name: "Juan Dela Cruz",
            achievements: ["Authored universal healthcare", "Cleaned up the Pasig River"],
            platform: ["Affordable housing for all", "Free Wi-Fi in public spaces"]
        }
    };

    const data = mockData[candidateId];

    if (data) {
        document.getElementById('candidate-name-header').innerText = data.name;
        
        const achList = document.getElementById('achievements-list');
        data.achievements.forEach(a => achList.innerHTML += `<li>${a}</li>`);
        
        const platList = document.getElementById('platform-list');
        data.platform.forEach(p => platList.innerHTML += `<li>${p}</li>`);
    }

    // 3. Handle the "Vote" button
    document.getElementById('btn-vote-this').addEventListener('click', () => {
        alert("Selection saved! Returning to ballot.");
        window.location.href = 'vote.html';
    });
});