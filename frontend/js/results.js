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