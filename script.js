// --- 1. CONEXÃO COM O SUPABASE ---
const { createClient } = supabase;
const SUPABASE_URL = 'https://zslokbeazldiwmblahps.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzbG9rYmVhemxkaXdtYmxhaHBzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0NDA2NDcsImV4cCI6MjA3MDAxNjY0N30.UfTi-SBzIa9Wn_uEnQiW5PAiTECSVimnGGVJ1IFABDQ';
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- 2. ELEMENTOS DO DOM ---
const adventuresGrid = document.getElementById('adventures-grid');
const adventureForm = document.getElementById('adventure-form');
const userArea = document.getElementById('user-area');
const publishSection = document.querySelector('.painel-lateral');

// --- 3. FUNÇÕES DE UI E AUTENTICAÇÃO ---

/**
 * Atualiza o cabeçalho para mostrar o estado do usuário (logado ou não)
 */
function updateUserUI(user) {
    if (user) {
        // Usuário está logado
        userArea.innerHTML = `
            <span>Olá, ${user.email.split('@')[0]}</span>
            <button id="logout-button" class="btn-primario" style="width: auto; padding: 0.5rem 1rem;">Sair</button>
        `;
        publishSection.style.display = 'block'; // Mostra o formulário de publicação

        document.getElementById('logout-button').addEventListener('click', async () => {
            await supabaseClient.auth.signOut();
            window.location.reload(); // Recarrega a página após o logout
        });
    } else {
        // Usuário não está logado
        userArea.innerHTML = `
            <a href="login.html" class="btn-primario" style="text-decoration: none;">Login / Cadastrar</a>
        `;
        publishSection.style.display = 'none'; // Esconde o formulário de publicação
    }
}

/**
 * Verifica a sessão do usuário ao carregar a página
 */
async function checkUserSession() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    updateUserUI(user);
}

// --- 4. FUNÇÕES DE AVENTURA ---

/**
 * Carrega as aventuras do banco de dados e as exibe na tela.
 */
async function loadAdventures() {
    const { data, error } = await supabaseClient
        .from('aventuras')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Erro ao buscar aventuras:', error);
        return;
    }
    adventuresGrid.innerHTML = '';
    data.forEach(adventure => {
        const card = document.createElement('div');
        card.classList.add('adventure-card');
        card.innerHTML = `
            <div class="adventure-card-content">
                <h4>${adventure.titulo}</h4>
                <p><strong>Mestre:</strong> ${adventure.nome_mestre}</p>
                <p><strong>Sistema:</strong> ${adventure.sistema_rpg}</p>
                <p><strong>Tipo:</strong> ${adventure.tipo_jogo}</p>
                <p><strong>Nível:</strong> ${adventure.nivel}</p>
                <p><strong>Vagas:</strong> ${adventure.vagas}</p>
                <p><strong>Alerta de Gatilho:</strong> ${adventure.alerta_gatilho}</p>
                <br>
                <p>${adventure.descricao}</p>
            </div>
        `;
        adventuresGrid.appendChild(card);
    });
}

/**
 * Lida com o envio do formulário para criar uma nova aventura.
 */
adventureForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    // 1. Pega o usuário logado
    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!user) {
        alert('Você precisa estar logado para publicar uma aventura.');
        return;
    }

    const form = event.target;
    const formData = new FormData(form);

    // 2. Monta o objeto da aventura, incluindo o user_id
    const newAdventure = {
        titulo: formData.get('titulo'),
        sistema_rpg: formData.get('sistema_rpg'),
        nome_mestre: formData.get('nome_mestre'),
        vagas: parseInt(formData.get('vagas')),
        descricao: formData.get('descricao'),
        alerta_gatilho: formData.get('alerta_gatilho'),
        tipo_jogo: formData.get('tipo_jogo'),
        nivel: formData.get('nivel'),
        user_id: user.id // Adiciona o ID do usuário ao post
    };

    // 3. Envia os dados para o Supabase
    const { data: insertData, error } = await supabaseClient
        .from('aventuras')
        .insert([newAdventure]);
        
    if (error) {
        console.error('Erro ao inserir aventura:', error);
        alert('Ocorreu um erro ao publicar sua aventura. Verifique o console (F12).');
    } else {
        alert('⚠️ Aventura publicada com sucesso!');
        form.reset();
        loadAdventures();
    }
});


// --- 5. INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
    checkUserSession(); // Verifica o status do usuário
    loadAdventures(); // Carrega as aventuras
});
