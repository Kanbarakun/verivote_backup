// frontend/js/auth.js

// Wrap everything in a DOMContentLoaded listener to ensure the HTML is loaded first
document.addEventListener('DOMContentLoaded', () => {

    // --- REGISTRATION LOGIC ---
    const registerBtn = document.getElementById('btn-register');
    if (registerBtn) {
        registerBtn.addEventListener('click', async () => {
            const name = document.getElementById('reg-name').value;
            const email = document.getElementById('reg-email').value;
            const password = document.getElementById('reg-password').value;

            // Basic Validation
            if (!name || !email || !password) {
                alert("Please fill in all fields!");
                return;
            }

            try {
                const response = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email, password })
                });
                
                const result = await response.json();
                if (result.success) {
                    alert("Account Created! Redirecting to login...");
                    window.location.href = 'login.html'; 
                } else {
                    alert("Error: " + result.message);
                }
            } catch (error) {
                console.error("Registration failed:", error);
            }
        });
    }

    // --- LOGIN LOGIC ---
    const loginBtn = document.getElementById('btn-login');
    if (loginBtn) {
        loginBtn.addEventListener('click', async () => {
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;

            if (!email || !password) {
                alert("Please enter both email and password!");
                return;
            }

            try {
                console.log('Attempting login for:', email);
                
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                
                const result = await response.json();
                console.log('Login response:', result);
                
                if (result.success) {
                    // Save ALL user data to localStorage
                    localStorage.setItem('userEmail', result.email);
                    localStorage.setItem('userName', result.userName);
                    localStorage.setItem('token', result.token); // THIS IS CRITICAL
                    localStorage.setItem('hasVoted', result.hasVoted ? 'true' : 'false');
                    
                    console.log('Saved to localStorage:', { 
                        email: result.email, 
                        userName: result.userName,
                        token: result.token ? '✓ Token saved' : '✗ No token'
                    });

                    window.location.href = 'dashboard.html';
                } else {
                    alert(result.message);
                }
            } catch (error) {
                console.error("Login failed:", error);
                alert("Login failed. Please try again.");
            }
        });
    }
    
    // Optional: Add a logout function
    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('userEmail');
            localStorage.removeItem('userName');
            localStorage.removeItem('token');
            localStorage.removeItem('hasVoted');
            window.location.href = 'index.html';
        });
    }
});