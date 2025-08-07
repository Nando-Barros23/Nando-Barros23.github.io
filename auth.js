// --- 1. CONEXÃO COM O SUPABASE ---
const { createClient } = supabase;
const SUPABASE_URL = 'https://zslokbeazldiwmblahps.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzbG9rYmVhemxkaXdtYmxhaHBzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0NDA2NDcsImV4cCI6MjA3MDAxNjY0N30.UfTi-SBzIa9Wn_uEnQiW5PAiTECSVimnGGVJ1IFABDQ';
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- 2. ELEMENTOS DO DOM ---
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const googleLoginButton = document.getElementById('google-login-button');
const errorMessageDiv = document.getElementById('error-message');
const successMessageDiv = document.getElementById('success-message');
const passwordToggleIcons = document.querySelectorAll('.password-toggle-icon');

// --- 3. FUNCIONALIDADES ---

// Função para mostrar mensagens de erro/sucesso
function showMessage(element, message) {
    element.textContent = message;
    element.style.display = 'block';
    (element === errorMessageDiv ? successMessageDiv : errorMessageDiv).style.display = 'none';
}

// Função para ver/esconder a senha com ícones de cadeado
passwordToggleIcons.forEach(icon => {
    // Define o ícone inicial como cadeado fechado
    icon.textContent = '🔒';
    icon.style.cursor = 'pointer'; // Garante que o cursor mude para indicar que é clicável

    icon.addEventListener('click', () => {
        const targetInputId = icon.getAttribute('data-target');
        const passwordInput = document.getElementById(targetInputId);

        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            icon.textContent = '🔓'; // Cadeado aberto
        } else {
            passwordInput.type = 'password';
            icon.textContent = '🔒'; // Cadeado fechado
        }
    });
});

// --- 4. LÓGICA DE AUTENTICAÇÃO ---

// LOGIN COM GOOGLE
googleLoginButton.addEventListener('click', async () => {
    const { error } = await supabaseClient.auth.signInWithOAuth({ provider: 'google' });
    if (error) showMessage(errorMessageDiv, `Erro no login com Google: ${error.message}`);
});

// LOGIN COM E-MAIL
loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) showMessage(errorMessageDiv, `Erro no login: ${error.message}`);
});

// CADASTRO COM E-MAIL
registerForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const username = document.getElementById('register-username').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    // Validação de senha
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
    // Fim da validação

    const { error } = await supabaseClient.auth.signUp({
        email: email,
        password: password,
        options: {
            data: {
                username: username // Salva o nome de usuário nos metadados
            }
        }
    });

    if (error) {
        showMessage(errorMessageDiv, `Erro no cadastro: ${error.message}`);
    } else {
        showMessage(successMessageDiv, 'Cadastro realizado com sucesso! Faça o login para continuar.');
        registerForm.reset();
    }
});

// OUVINTE GERAL DE AUTENTICAÇÃO
supabaseClient.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN') {
        window.location.href = 'index.html';
    }
});
