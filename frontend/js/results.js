document.addEventListener('DOMContentLoaded', fetchResults);

async function fetchResults() {
    try {
        const response = await fetch('https://verivote-backup.onrender.com/api/vote/results');
        const data = await response.json();

        if (data.success) {
            renderChart('chart-president', data.results.president);
            renderChart('chart-senators', data.results.senators);
            renderChart('chart-mayor', data.results.mayor);
        } else {
            console.error("Failed to load data");
        }
    } catch (error) {
        console.error("Error fetching results:", error);
    }
}

function renderChart(canvasId, votesObj) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    
    // Convert object { "p1": 5, "p2": 3 } into arrays for Chart.js
    // Note: We use IDs (p1, p2) as labels. To show Names, we'd need to map IDs to Names.
    // For now, this shows the raw ID count.
    const labels = Object.keys(votesObj || {});
    const dataPoints = Object.values(votesObj || {});

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Votes',
                data: dataPoints,
                backgroundColor: [
                    '#003366', // Dark Blue
                    '#d65a64', // Red
                    '#748eb8', // Light Blue
                    '#28a745', // Green
                    '#ffc107'  // Yellow
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}