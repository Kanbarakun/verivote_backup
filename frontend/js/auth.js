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
                    window.location.href = 'index.html'; 
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

            // Basic Validation
            if (!email || !password) {
                alert("Please enter both email and password!");
                return;
            }

            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                
                const result = await response.json();
                if (result.success) {
                    // Save the user's name so we can use it on the voting page
                    localStorage.setItem('userName', result.user.name);
                    localStorage.setItem('userEmail', result.user.email);
                    window.location.href = 'dashboard.html';
                } else {
                    alert(result.message);
                }
            } catch (error) {
                console.error("Login failed:", error);
            }
        });
    }
});