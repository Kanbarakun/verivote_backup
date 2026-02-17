document.addEventListener('DOMContentLoaded', fetchResults);

// Candidate name mappings - UPDATE THESE with your actual candidate names!
const candidateNames = {
    // President candidates (update with actual names)
    'p1': 'Maria Santos',
    'p2': 'Jose Reyes',
    'p3': 'Ana Gonzales',
    'p4': 'Miguel Cruz',
    
    // Senator candidates (update with actual names)
    's1': 'Carla Villanueva',
    's2': 'Ramon Lopez',
    's3': 'Luzviminda Garcia',
    's4': 'Pedro Marcos',
    's5': 'Sofia Ortega',
    's6': 'Ricardo Ramos',
    
    // Mayor candidates (update with actual names)
    'm1': 'Tonyo Fernandez',
    'm2': 'Elena Castillo',
    'm3': 'Benito Aquino',
    'm4': 'Lorna Santos'
};

// Default registered voters count - UPDATE THIS with your actual total registered voters
const TOTAL_REGISTERED_VOTERS = 4; // Change this to your actual number
const TOTAL_PRECINCTS = 180; // Change this to your actual number of precincts

async function fetchResults() {
    try {
        const response = await fetch('https://verivote-backup.onrender.com/api/vote/results');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('API Response:', data); // Debug log

        if (data.success && data.results) {
            // Render charts
            renderChart('chart-president', data.results.president || {}, 'President');
            renderChart('chart-senators', data.results.senators || {}, 'Senators');
            renderChart('chart-mayor', data.results.mayor || {}, 'Mayor');
            
            // Calculate and update live statistics
            updateLiveStatistics(data.results);
        } else {
            console.error("Failed to load data:", data.message || 'Unknown error');
            showErrorMessage();
        }
    } catch (error) {
        console.error("Error fetching results:", error);
        showErrorMessage();
    }
}

function renderChart(canvasId, votesObj, title) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    
    // Convert object into arrays for Chart.js
    const candidateIds = Object.keys(votesObj || {});
    const dataPoints = Object.values(votesObj || {});
    
    // Map IDs to names (if available), otherwise use IDs
    const labels = candidateIds.map(id => candidateNames[id] || id.toUpperCase());

    // Destroy existing chart if it exists
    const existingChart = Chart.getChart(canvasId);
    if (existingChart) {
        existingChart.destroy();
    }

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Number of Votes',
                data: dataPoints,
                backgroundColor: [
                    '#003366', // Dark Blue
                    '#ce1126', // Philippine Red
                    '#4a7db5', // Light Blue
                    '#28a745', // Green
                    '#ffc107', // Yellow
                    '#dc3545', // Red
                    '#6c757d', // Gray
                    '#17a2b8'  // Teal
                ],
                borderWidth: 1,
                borderRadius: 5,
                barPercentage: 0.7
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1,
                        callback: function(value) {
                            return value + ' votes';
                        }
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        maxRotation: 45,
                        minRotation: 45,
                        font: {
                            size: 11
                        }
                    }
                }
            },
            plugins: {
                legend: { 
                    display: false 
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${context.raw}`;
                        }
                    }
                }
            },
            layout: {
                padding: {
                    bottom: 10
                }
            }
        }
    });
}

function updateLiveStatistics(results) {
    // Calculate total votes across all positions
    let totalVotes = 0;
    let votesPerCandidate = {};
    
    for (let position in results) {
        const votesObj = results[position];
        for (let candidateId in votesObj) {
            const voteCount = votesObj[candidateId];
            totalVotes += voteCount;
            votesPerCandidate[candidateId] = voteCount;
        }
    }
    
    // Find leading candidate (candidate with most votes)
    let leadingCandidate = '';
    let maxVotes = 0;
    
    for (let candidateId in votesPerCandidate) {
        if (votesPerCandidate[candidateId] > maxVotes) {
            maxVotes = votesPerCandidate[candidateId];
            leadingCandidate = candidateNames[candidateId] || candidateId;
        }
    }
    
    // Calculate voter turnout percentage
    const voterTurnout = Math.round((totalVotes / TOTAL_REGISTERED_VOTERS) * 100);
    
    // Simulate precincts reporting (you can modify this based on your actual data)
    // For now, we'll assume precincts are reporting proportionally to votes cast
    const reportedPrecincts = Math.round((totalVotes / TOTAL_REGISTERED_VOTERS) * TOTAL_PRECINCTS);
    
    // Update DOM elements
    const totalVotersEl = document.getElementById('total-voters');
    const turnoutEl = document.getElementById('voter-turnout');
    const precinctsEl = document.getElementById('precincts');
    const leadingCandidateEl = document.getElementById('leading-candidate');
    
    if (totalVotersEl) {
        // Animate the number counting up
        animateNumber(totalVotersEl, 0, totalVotes, 1000);
    }
    
    if (turnoutEl) {
        animateNumber(turnoutEl, 0, voterTurnout, 1000, '%');
    }
    
    if (precinctsEl) {
        animateNumber(precinctsEl, 0, reportedPrecincts, 1000);
    }
    
    if (leadingCandidateEl && leadingCandidate) {
        leadingCandidateEl.textContent = leadingCandidate;
    }
    
    // Update last updated time
    const lastUpdatedEl = document.getElementById('last-updated');
    if (lastUpdatedEl) {
        const now = new Date();
        const timeString = now.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            second: '2-digit'
        });
        lastUpdatedEl.innerHTML = `<i class="fas fa-clock me-1"></i> Last updated: ${timeString}`;
    }
}

// Animation function for counting numbers
function animateNumber(element, start, end, duration, suffix = '') {
    const range = end - start;
    const increment = range / (duration / 10);
    let current = start;
    
    const timer = setInterval(() => {
        current += increment;
        if (current >= end) {
            current = end;
            clearInterval(timer);
        }
        element.textContent = Math.round(current).toLocaleString() + suffix;
    }, 10);
}

function showErrorMessage() {
    // Display error message to users
    const containers = document.querySelectorAll('.chart-container');
    containers.forEach(container => {
        container.innerHTML = '<p class="text-danger text-center">Failed to load results. Please try again later.</p>';
    });
    
    // Update stats with error message
    document.getElementById('total-voters').textContent = '--';
    document.getElementById('voter-turnout').textContent = '--%';
    document.getElementById('precincts').textContent = '--';
}

// Refresh data every 30 seconds
setInterval(fetchResults, 30000);