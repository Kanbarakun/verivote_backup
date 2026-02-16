// frontend/js/vote.js

// More robust API URL detection
const API_URL = (function() {
    // If deployed on Render
    if (window.location.hostname.includes('onrender.com')) {
        // The backend is at the same domain but different service
        // Since your frontend and backend are separate services on Render
        return 'https://verivote-backup.onrender.com';
    }
    
    // Fallback 
    return '';
})();

console.log('Using API URL:', API_URL);

// Test the API connection on page load
async function testAPIConnection() {
    try {
        const response = await fetch(`${API_URL}/api/test`);
        if (response.ok) {
            const data = await response.json();
            console.log('API connection successful:', data);
        } else {
            console.error('API test failed with status:', response.status);
        }
    } catch (error) {
        console.error('Cannot connect to API:', error);
    }
}

// Modified checkStatus with better error handling
async function checkStatus() {
    const email = localStorage.getItem('userEmail');
    if (!email) {
        alert("Please log in first.");
        window.location.href = "index.html";
        return;
    }

try {
  const res = await fetch(`${API_URL}/api/vote/submit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ voterEmail: email, selections }),
  });

  // Check if the response is OK (status in the range 200-299)
  if (!res.ok) {
    throw new Error(`HTTP error! status: ${res.status} ${res.statusText}`);
  }

  // Parse JSON safely
  const data = await res.json();
  console.log("Success:", data);
  return data;

} catch (error) {
  if (error.name === "TypeError") {
    console.error("Network error or CORS issue:", error.message);
    // Likely causes: incorrect URL, server down, CORS misconfiguration
  } else {
    console.error("Request failed:", error.message);
  }
}   

// Modified submit function with better error handling
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
        console.log('Submitting vote to:', `${API_URL}/api/vote/submit`);
        
        const res = await fetch(`${API_URL}/api/vote/submit`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ voterEmail: email, selections })
        });

        console.log('Response status:', res.status);

        if (res.status === 404) {
            // Try alternative endpoint without /api prefix
            console.log('Trying alternative endpoint...');
            const altRes = await fetch(`${API_URL}/vote/submit`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ voterEmail: email, selections })
            });
            
            if (altRes.ok) {
                const data = await altRes.json();
                if (data.success) {
                    showSuccess();
                    return;
                }
            }
            
            throw new Error("Server route not found. Please check backend deployment.");
        }

        if (res.status === 403) {
            alert("This email has already cast a ballot. You cannot vote twice!");
            submitBtn.innerText = "DONE VOTING";
            submitBtn.disabled = false;
            return;
        }

        const data = await res.json();
        
        if (data.success) {
            showSuccess();
        } else {
            throw new Error(data.message || "Unknown error");
        }

    } catch (e) {
        console.error('Submission error:', e);
        alert("Submission failed: " + e.message);
        submitBtn.innerText = "SUBMIT VOTE";
        submitBtn.disabled = false;
    }
});

function showSuccess() {
    const modalEl = document.getElementById('successModal');
    if(modalEl) {
        const successPopup = new bootstrap.Modal(modalEl);
        successPopup.show();
    } else {
        alert("Vote Submitted Successfully!");
    }

    setTimeout(() => {
        window.location.href = "results.html";
    }, 1500);
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    testAPIConnection(); // Test API on load
    checkStatus();
    renderColumns();
});
}