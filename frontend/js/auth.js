document.getElementById('btn-login').addEventListener('click', async () => {
    const name = document.getElementById('reg-name').value;
    const password = document.getElementById('reg-password').value;
    const email = document.getElementById('reg-email').value;
   

    // 1. Basic Validation
    if (!name || !password || !email) {
        alert("Please fill in all fields!");
        return;
    }

    // 2. Prepare the data
    const userData = { name, password, email };

    // 3. Send to Backend
    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });

        const result = await response.json();

        if (result.success) {
            alert("Registration Successful!");
            window.location.href = 'index.html'; // Redirect to login page
        } else {
            alert("Error: " + result.message);
        }
    } catch (error) {
        console.error("Connection failed:", error);
    }
    
});

 const registerBtn = document.getElementById('btn-register')
// --- REGISTRATION LOGIC ---
if (registerBtn) {
    registerBtn.addEventListener('click', async () => {
        const name = document.getElementById('reg-name').value;
        const email = document.getElementById('reg-email').value;
        const password = document.getElementById('reg-password').value;

        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });
        const result = await response.json();
        if (result.success) alert("Account Created!");
    });
}

// --- LOGIN LOGIC ---
const loginBtn = document.getElementById('btn-login');
if (loginBtn) {
    loginBtn.addEventListener('click', async () => {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const result = await response.json();
        if (result.success) {
            window.location.href = 'vote.html'; // Redirect to the voting page
        } else {
            alert(result.message);
        }
    });
}