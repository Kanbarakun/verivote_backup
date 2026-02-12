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
        // Fetch real data from your Express backend
        const response = await fetch(`/api/vote/results?category=${category}`);
        const data = await response.json();

        const chartArea = document.getElementById('chart-area');
        const labelArea = document.getElementById('label-area');
        
        chartArea.innerHTML = ''; // Clear old data
        labelArea.innerHTML = '';

        data.results.forEach(item => {
            // Create the name label on the right
            const label = document.createElement('div');
            label.className = 'candidate-label';
            label.innerText = item.name;
            labelArea.appendChild(label);

            // Create the animated blue bar on the left
            const bar = document.createElement('div');
            bar.className = 'vote-bar';
            bar.style.width = '0%'; // Start at 0 for animation
            bar.innerHTML = `<span>${item.percentage}% &nbsp;&nbsp; ${item.votes} Votes</span>`;
            chartArea.appendChild(bar);
            
            // Trigger the animation
            setTimeout(() => { 
                bar.style.width = item.percentage + '%'; 
            }, 100);
        });
    } catch (err) {
        console.error("Failed to load real-time results:", err);
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

async function fetchResults() {
    try {
        const response = await fetch('https://verivote-backup.onrender.com/api/vote/results');
        const data = await response.json();

        if (data.success) {
            renderChart('chart-president', 'President', data.results.president);
            renderChart('chart-senators', 'Senators', data.results.senators);
            renderChart('chart-mayor', 'Mayor', data.results.mayor);
        }
    } catch (error) {
        console.error("Error fetching results:", error);
    }
}

function renderChart(canvasId, label, chartData) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    
    // Extract names and vote counts
    const labels = Object.keys(chartData);
    const votes = Object.values(chartData);

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Votes',
                data: votes,
                backgroundColor: ['#003366', '#d65a64', '#748eb8'], // Patriotic colors
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
            plugins: { legend: { display: false } }
        }
    });
}

document.addEventListener('DOMContentLoaded', fetchResults);

loadResults();