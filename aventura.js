document.addEventListener('DOMContentLoaded', () => {
    // 1. INICIALIZAÇÃO
    const { createClient } = supabase;
    const SUPABASE_URL = 'https://zslokbeazldiwmblahps.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzbG9rYmVhemxkaXdtYmxhaHBzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0NDA2NDcsImV4cCI6MjA3MDAxNjY0N30.UfTi-SBzIa9Wn_uEnQiW5PAiTECSVimnGGVJ1IFABDQ'; // Lembre-se de usar sua chave correta aqui
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Variáveis globais que serão preenchidas pela função de inicialização
    let currentUser = null;
    let adventureData = null;
    const adventureId = new URLSearchParams(window.location.search).get('id');

    // ==================================================================
    // FUNÇÃO PRINCIPAL DE INICIALIZAÇÃO (LÓGICA REESTRUTURADA)
    // ==================================================================
    async function initializePage() {
        // Passo 1: Buscar a sessão do usuário ATUALIZADA
        const { data: { session } } = await supabaseClient.auth.getSession();
        currentUser = session?.user; // Define o usuário atual globalmente

        // Passo 2: Atualizar o cabeçalho imediatamente
        updateHeaderUI(currentUser);

        // Passo 3: Buscar os dados da aventura
        if (!adventureId) {
            document.getElementById('adventure-detail-main').innerHTML = '<h2>Nenhuma aventura especificada.</h2>';
            return;
        }
        adventureData = await fetchAdventureDetails();

        // Passo 4: Se a aventura foi encontrada, renderizar os componentes que dependem dos dados
        if (adventureData) {
            displayAdventureDetails(adventureData);
            renderActionButtons();
            renderComments();
            renderCommentForm(); // Agora esta função será chamada com a certeza de quem é o currentUser
        }
    }

    // O onAuthStateChange agora simplesmente reinicializa a página para refletir o novo estado de login
    supabaseClient.auth.onAuthStateChange((_event, session) => {
        // Se o usuário mudou (login/logout), reinicializa a página
        if (currentUser?.id !== session?.user?.id) {
            initializePage();
        }
    });

    // Inicia tudo
    initializePage();

    // ==================================================================
    // Funções auxiliares (a maioria sem alterações)
    // ==================================================================
    
    const userArea = document.getElementById('user-area');

    function showToast(message, type = 'success') {
        const toastContainer = document.getElementById('toast-container');
        if (!toastContainer) return;
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        toastContainer.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            toast.addEventListener('transitionend', () => toast.remove());
        }, 3000);
    }

    async function fetchAdventureDetails() {
        const { data, error } = await supabaseClient.from('aventuras').select('*').eq('id', adventureId).single();
        if (error || !data) {
            console.error('Erro ao buscar a aventura:', error);
            document.getElementById('adventure-detail-main').innerHTML = '<h2>Aventura não encontrada.</h2><p>O link pode estar quebrado ou a aventura foi removida.</p>';
            return null;
        }
        return data;
    }

    function displayAdventureDetails(data) {
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

    async function renderActionButtons() {
        const titleContainer = document.getElementById('title-container');
        const playerActionArea = document.getElementById('action-buttons-area');
        if (!playerActionArea || !titleContainer) return;

        playerActionArea.innerHTML = '';
        const existingDeleteBtn = document.getElementById('delete-adventure-btn');
        if (existingDeleteBtn) existingDeleteBtn.remove();
        
        if (currentUser && adventureData && currentUser.id === adventureData.user_id) {
            const deleteButton = document.createElement('button');
            deleteButton.id = 'delete-adventure-btn';
            deleteButton.className = 'btn-icon-delete';
            deleteButton.innerHTML = '<i class="fas fa-trash-alt"></i>';
            deleteButton.title = 'Deletar Aventura';
            titleContainer.appendChild(deleteButton);
            deleteButton.addEventListener('click', handleDeleteAdventure);
        } else if (currentUser && adventureData) {
            const { data: subscription } = await supabaseClient.from('inscricoes').select('id').eq('user_id', currentUser.id).eq('aventura_id', adventureId).single();
            if (subscription) {
                playerActionArea.innerHTML = `<button id="subscribe-btn" class="btn-primario btn-inscricao inscrito">Cancelar Inscrição</button>`;
            } else {
                playerActionArea.innerHTML = `<button id="subscribe-btn" class="btn-primario btn-inscricao">Quero Participar!</button>`;
            }
            document.getElementById('subscribe-btn').addEventListener('click', handleSubscription);
        }
    }

    async function renderComments() {
        const commentsList = document.getElementById('comments-list');
        if (!commentsList) return;
        commentsList.innerHTML = '<p>Carregando comentários...</p>';

        const { data: comments, error: commentsError } = await supabaseClient.from('comentarios').select('*').eq('aventura_id', adventureId).order('created_at', { ascending: true });
        if (commentsError) {
            console.error("Erro ao buscar comentários:", commentsError);
            commentsList.innerHTML = '<p style="color: red;">Não foi possível carregar os comentários.</p>';
            return;
        }
        if (comments.length === 0) {
            commentsList.innerHTML = '<p>Ainda não há comentários. Seja o primeiro a comentar!</p>';
            return;
        }
        const userIds = [...new Set(comments.map(comment => comment.user_id))];
        const { data: profiles, error: profilesError } = await supabaseClient.from('profiles').select('id, username, avatar_url').in('id', userIds);
        if (profilesError) { console.error("Erro ao buscar perfis:", profilesError); }

        const profileMap = new Map();
        if (profiles) { profiles.forEach(profile => { profileMap.set(profile.id, profile); }); }

        commentsList.innerHTML = '';
        comments.forEach(comment => {
            const commentEl = document.createElement('div');
            commentEl.className = 'comment';
            const authorProfile = profileMap.get(comment.user_id);
            const authorName = authorProfile?.username || 'Usuário';
            const authorAvatar = authorProfile?.avatar_url || 'https://i.imgur.com/V4Rcl9o.png';
            const canDelete = currentUser && (currentUser.id === comment.user_id || (adventureData && currentUser.id === adventureData.user_id));
            commentEl.innerHTML = `
                <div class="comment-avatar"><img src="${authorAvatar}" alt="Avatar de ${authorName}"></div>
                <div class="comment-body">
                    <div class="comment-header">
                        <span class="comment-author">${authorName}</span>
                        ${canDelete ? `<button class="comment-delete-btn" data-comment-id="${comment.id}" title="Deletar Comentário"><i class="fas fa-trash-alt"></i></button>` : ''}
                    </div>
                    <p class="comment-content">${comment.content}</p>
                </div>`;
            commentsList.appendChild(commentEl);
        });
        document.querySelectorAll('.comment-delete-btn').forEach(btn => btn.addEventListener('click', handleDeleteComment));
    }

    function renderCommentForm() {
        const container = document.getElementById('comment-form-container');
        if (!container) return;
        if (currentUser) {
            container.innerHTML = `
                <form id="comment-form">
                    <textarea id="comment-text" placeholder="Escreva seu comentário..." required rows="3"></textarea>
                    <button type="submit" class="btn-primario">Comentar</button>
                </form>
            `;
            document.getElementById('comment-form').addEventListener('submit', handleNewComment);
        } else {
            container.innerHTML = '<p>Você precisa estar <a href="login.html">logado</a> para comentar.</p>';
        }
    }

    async function handleSubscription() { /* Sem alterações */ }
    async function handleNewComment(e) { /* Sem alterações */ }
    async function handleDeleteComment(e) { /* Sem alterações */ }
    async function handleDeleteAdventure() { /* Sem alterações */ }

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
});
