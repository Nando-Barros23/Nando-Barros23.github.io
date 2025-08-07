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

// --- 3. FUNÇÕES DE AUTENTICAÇÃO ---

// Função para mostrar mensagens
function showMessage(element, message) {
    element.textContent = message;
    element.style.display = 'block';
    // Esconde a outra mensagem
    (element === errorMessageDiv ? successMessageDiv : errorMessageDiv).style.display = 'none';
}

// LOGIN COM GOOGLE
googleLoginButton.addEventListener('click', async () => {
    const { error } = await supabaseClient.auth.signInWithOAuth({
        provider: 'google',
    });
    if (error) {
        showMessage(errorMessageDiv, `Erro no login com Google: ${error.message}`);
    }
});

// LOGIN COM E-MAIL E SENHA
loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    const { error } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password,
    });

    if (error) {
        showMessage(errorMessageDiv, `Erro no login: ${error.message}`);
    }
});

// CADASTRO COM E-MAIL E SENHA
registerForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;

    const { error } = await supabaseClient.auth.signUp({
        email: email,
        password: password,
    });

    if (error) {
        showMessage(errorMessageDiv, `Erro no cadastro: ${error.message}`);
    } else {
        showMessage(successMessageDiv, 'Cadastro realizado com sucesso! Faça o login para continuar.');
        registerForm.reset();
    }
});


// OUVINTE DE AUTENTICAÇÃO: Redireciona após login bem-sucedido
supabaseClient.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN') {
        window.location.href = 'index.html';
    }
});
