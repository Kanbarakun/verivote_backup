document.addEventListener('DOMContentLoaded', () => {
    const userName = localStorage.getItem('userName');
    
    if (!userName) {
        alert("Please log in first!");
        window.location.href = 'index.html';
        return;
    }
    
    // Display the user's name if you have a "Welcome" spot in your UI
    const welcomeText = document.getElementById('user-welcome');
    if (welcomeText) welcomeText.innerText = `Welcome, ${userName}`;
});

let categories = ['president', 'senators', 'mayor'];
let currentIndex = 0;

async function loadResults() {
    const category = categories[currentIndex];
    document.getElementById('result-title').innerText = `Result For ${category.charAt(0).toUpperCase() + category.slice(1)}`;

    try {
        // In the future, this fetch comes from your backend /api/vote/results
        const response = await fetch(`/api/vote/results?category=${category}`);
        const data = await response.json();

        const chartArea = document.getElementById('chart-area');
        const labelArea = document.getElementById('label-area');
        
        chartArea.innerHTML = '';
        labelArea.innerHTML = '';

        data.results.forEach(item => {
            // Create the blue bar
            const bar = document.createElement('div');
            bar.className = 'vote-bar';
            bar.style.width = '0%'; // Start at 0 for animation
            bar.innerHTML = `<span>${item.percentage}% &nbsp;&nbsp; ${item.votes} Votes</span>`;
            chartArea.appendChild(bar);
            
            // Animate to actual percentage
            setTimeout(() => { bar.style.width = item.percentage + '%'; }, 100);

            // Create the name label
            const label = document.createElement('div');
            label.className = 'candidate-label';
            label.innerText = item.name;
            labelArea.appendChild(label);
        });
    } catch (err) {
        console.error("Failed to load results:", err);
    }
}

document.getElementById('btn-next').addEventListener('click', () => {
    currentIndex = (currentIndex + 1) % categories.length;
    loadResults();
});

document.getElementById('btn-prev').addEventListener('click', () => {
    currentIndex = (currentIndex - 1 + categories.length) % categories.length;
    loadResults();
});

loadResults();