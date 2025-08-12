// Cole este código completo no seu arquivo auth.js

document.addEventListener('DOMContentLoaded', () => {
    const { createClient } = supabase;
    const SUPABASE_URL = 'https://zslokbeazldiwmblahps.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzbG9rYmVhemxkaXdtYmxhaHBzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0NDA2NDcsImV4cCI6MjA3MDAxNjY0N30.UfTi-SBzIa9Wn_uEnQiW5PAiTECSVimnGGVJ1IFABDQ';
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const googleLoginButton = document.getElementById('google-login-button');
    const errorMessageDiv = document.getElementById('error-message');
    const successMessageDiv = document.getElementById('success-message');
    const passwordToggleIcons = document.querySelectorAll('.password-toggle-icon');

    function showMessage(element, message) {
        element.textContent = message;
        element.style.display = 'block';
        (element === errorMessageDiv ? successMessageDiv : errorMessageDiv).style.display = 'none';
    }

    passwordToggleIcons.forEach(icon => {
        icon.textContent = '🔒';
        icon.style.cursor = 'pointer';
        icon.addEventListener('click', () => {
            const targetInputId = icon.getAttribute('data-target');
            const passwordInput = document.getElementById(targetInputId);
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                icon.textContent = '🔓';
            } else {
                passwordInput.type = 'password';
                icon.textContent = '🔒';
            }
        });
    });

    googleLoginButton.addEventListener('click', async () => {
        const { error } = await supabaseClient.auth.signInWithOAuth({ provider: 'google' });
        if (error) showMessage(errorMessageDiv, `Erro no login com Google: ${error.message}`);
    });

    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) showMessage(errorMessageDiv, `Erro no login: ${error.message}`);
    });

    registerForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const username = document.getElementById('register-username').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        if (password !== confirmPassword) {
            showMessage(errorMessageDiv, 'As senhas não conferem.');
            return;
        }
        const hasNumber = /\d/.test(password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
        if (!hasNumber || !hasSpecialChar) {
            showMessage(errorMessageDiv, 'A senha precisa conter pelo menos um número e um caractere especial.');
            return;
        }
        const { error } = await supabaseClient.auth.signUp({
            email: email,
            password: password,
            options: { data: { username: username } }
        });
        if (error) {
            showMessage(errorMessageDiv, `Erro no cadastro: ${error.message}`);
        } else {
            showMessage(successMessageDiv, 'Cadastro realizado com sucesso! Faça o login para continuar.');
            registerForm.reset();
        }
    });

    supabaseClient.auth.onAuthStateChange((event, session) => {
        if (session && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
            if (window.location.pathname.includes('login.html')) {
                window.location.href = 'index.html';
            }
        }
    });
});
