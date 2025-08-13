document.addEventListener('DOMContentLoaded', () => {
    // 1. INICIALIZAÇÃO
    const { createClient } = supabase;
    const SUPABASE_URL = 'https://zslokbeazldiwmblahps.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzbG9rYmVhemxkaXdtYmxhaHBzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0NDA2NDcsImV4cCI6MjA3MDAxNjY0N30.UfTi-SBzIa9Wn_uEnQiW5PAiTECSVimnGGVJ1IFABDQ';
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const userArea = document.getElementById('user-area');
    
    // 2. LÓGICA DA PÁGINA

    /**
     * Pega o ID da aventura da URL da página.
     * @returns {string|null} O ID da aventura ou nulo se não for encontrado.
     */
    function getAdventureIdFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('id');
    }

    /**
     * Busca os dados da aventura no Supabase e preenche a página.
     * @param {string} adventureId - O ID da aventura a ser buscada.
     */
    async function fetchAndDisplayAdventure(adventureId) {
        const { data, error } = await supabaseClient
            .from('aventuras')
            .select('*')
            .eq('id', adventureId)
            .single(); // .single() pega um único registro ou retorna erro se não achar

        if (error || !data) {
            console.error('Erro ao buscar a aventura:', error);
            document.getElementById('adventure-detail-main').innerHTML = '<h2>Aventura não encontrada.</h2><p>O link pode estar quebrado ou a aventura foi removida.</p>';
            return;
        }

        // Preenche os elementos do HTML com os dados
        document.title = `${data.titulo} - Dados & Calangos`;
        document.getElementById('adventure-title').textContent = data.titulo;
        document.getElementById('adventure-image').src = data.image_url || 'https://i.imgur.com/Q3j5eH0.png';
        document.getElementById('master-name').textContent = data.nome_mestre;
        document.getElementById('system-name').textContent = data.sistema_rpg;
        document.getElementById('game-type').textContent = data.tipo_jogo;
        document.getElementById('level').textContent = data.nivel;
        document.getElementById('slots').textContent = data.vagas;
        document.getElementById('trigger-warning').textContent = data.alerta_gatilho;
        document.getElementById('adventure-description').textContent = data.descricao;
    }

    /**
     * Atualiza o cabeçalho para mostrar o status do usuário (logado/deslogado).
     */
    async function updateHeaderUI(user) {
        if (user) {
            const { data: profile } = await supabaseClient.from('profiles').select('username').eq('id', user.id).single();
            const displayName = profile?.username || user.email.split('@')[0];
            userArea.innerHTML = `
                <a href="profile.html" class="btn-primario">Olá, ${displayName}</a>
                <button id="logout-button" class="btn-primario">Sair</button>
            `;
            document.getElementById('logout-button').addEventListener('click', () => supabaseClient.auth.signOut());
        } else {
            userArea.innerHTML = `<a href="login.html" class="btn-primario">Login / Cadastrar</a>`;
        }
    }

    // 3. INICIALIZAÇÃO
    
    const adventureId = getAdventureIdFromUrl();
    if (adventureId) {
        fetchAndDisplayAdventure(adventureId);
    } else {
        document.getElementById('adventure-detail-main').innerHTML = '<h2>Nenhuma aventura especificada.</h2>';
    }

    supabaseClient.auth.onAuthStateChange((event, session) => {
        updateHeaderUI(session?.user);
    });
});
