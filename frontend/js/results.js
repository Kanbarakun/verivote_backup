document.addEventListener('DOMContentLoaded', fetchResults);

// API URL detection
const API_URL = (function() {
    if (window.location.hostname.includes('onrender.com')) {
        return 'https://verivote-backup.onrender.com';
    }
    return '';
})();

// Store candidate names for reference
let candidateNames = {};

// Default registered voters count - UPDATE THIS with your actual total registered voters
const TOTAL_REGISTERED_VOTERS = 1000; // Change this to your actual number
const TOTAL_PRECINCTS = 180; // Change this to your actual number of precincts

// Fetch candidates first to get names, then fetch results
async function fetchResults() {
    try {
        // First, fetch candidates to get names
        await fetchCandidates();
        
        // Then fetch results
        const response = await fetch(`${API_URL}/api/vote/results`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Results API Response:', data); // Debug log

        if (data.success && data.results) {
            // Render charts with the results data
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

// Fetch candidates to get names
async function fetchCandidates() {
    try {
        const response = await fetch(`${API_URL}/api/vote/candidates`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch candidates');
        }
        
        const data = await response.json();
        
        if (data.success) {
            // Build a map of candidate IDs to names
            const allCandidates = [
                ...(data.candidates.president || []),
                ...(data.candidates.senators || []),
                ...(data.candidates.mayor || [])
            ];
            
            allCandidates.forEach(candidate => {
                if (candidate && candidate.id) {
                    candidateNames[candidate.id] = candidate.name;
                }
            });
            
            console.log('Candidate names loaded:', candidateNames);
        }
    } catch (error) {
        console.error('Error fetching candidates:', error);
        // Fallback to using IDs as names
    }
}

function renderChart(canvasId, votesObj, title) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) {
        console.error(`Canvas ${canvasId} not found`);
        return;
    }
    
    const ctx2d = ctx.getContext('2d');
    
    // Convert object into arrays for Chart.js
    const candidateIds = Object.keys(votesObj || {});
    const dataPoints = Object.values(votesObj || {});
    
    // Map IDs to names from our candidateNames object
    const labels = candidateIds.map(id => {
        // Try to get name from our map, otherwise use ID
        return candidateNames[id] || id;
    });

    // Destroy existing chart if it exists
    const existingChart = Chart.getChart(canvasId);
    if (existingChart) {
        existingChart.destroy();
    }

    // If no data, show empty chart with message
    if (candidateIds.length === 0) {
        new Chart(ctx2d, {
            type: 'bar',
            data: {
                labels: ['No Votes Yet'],
                datasets: [{
                    label: 'Number of Votes',
                    data: [0],
                    backgroundColor: ['#cccccc'],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    title: { 
                        display: true, 
                        text: `${title} - No votes recorded` 
                    }
                }
            }
        });
        return;
    }

    new Chart(ctx2d, {
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
                },
                title: {
                    display: true,
                    text: title
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
    const voterTurnout = Math.min(100, Math.round((totalVotes / TOTAL_REGISTERED_VOTERS) * 100));
    
    // Calculate precincts reporting (simulated based on votes)
    const reportedPrecincts = Math.min(TOTAL_PRECINCTS, Math.round((totalVotes / TOTAL_REGISTERED_VOTERS) * TOTAL_PRECINCTS));
    
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
    const totalVotersEl = document.getElementById('total-voters');
    const turnoutEl = document.getElementById('voter-turnout');
    const precinctsEl = document.getElementById('precincts');
    
    if (totalVotersEl) totalVotersEl.textContent = '--';
    if (turnoutEl) turnoutEl.textContent = '--%';
    if (precinctsEl) precinctsEl.textContent = '--';
}

// Refresh data every 30 seconds
setInterval(fetchResults, 30000);