document.addEventListener('DOMContentLoaded', async () => {
    // 1. INICIALIZAÇÃO
    const { createClient } = supabase;
    const SUPABASE_URL = 'https://zslokbeazldiwmblahps.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzbG9rYmVhemxkaXdtYmxhaHBzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0NDA2NDcsImV4cCI6MjA3MDAxNjY0N30.UfTi-SBzIa9Wn_uEnQiW5PAiTECSVimnGGVJ1IFABDQ';
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Variáveis globais
    let currentUser = null;
    let adventureData = null;
    const adventureId = new URLSearchParams(window.location.search).get('id');

    // Seletores de Elementos
    const userArea = document.getElementById('user-area');
    const mainContainer = document.getElementById('adventure-detail-main');

    // ==================================================================
    // FUNÇÃO DA CAIXA DE CONFIRMAÇÃO PERSONALIZADA
    // ==================================================================
    function showCustomConfirm(message) {
        return new Promise((resolve) => {
            const overlay = document.getElementById('custom-confirm-overlay');
            const messageEl = document.getElementById('confirm-message');
            const btnYes = document.getElementById('confirm-btn-yes');
            const btnNo = document.getElementById('confirm-btn-no');

            messageEl.textContent = message;
            overlay.classList.remove('hidden');

            const close = (value) => {
                overlay.classList.add('hidden');
                btnYes.onclick = null;
                btnNo.onclick = null;
                resolve(value);
            };

            btnYes.onclick = () => close(true);
            btnNo.onclick = () => close(false);
        });
    }

    // ==================================================================
    // FUNÇÃO PRINCIPAL DE INICIALIZAÇÃO
    // ==================================================================
    async function initializePage() {
        const { data: { session } } = await supabaseClient.auth.getSession();
        currentUser = session?.user;
        updateHeaderUI(currentUser);

        if (!adventureId) {
            mainContainer.innerHTML = '<h2>Nenhuma aventura especificada.</h2>';
            return;
        }
        adventureData = await fetchAdventureDetails();

        if (adventureData) {
            displayAdventureDetails(adventureData);
            renderActionButtons();
            renderComments();
            renderCommentForm();
        }
    }

    supabaseClient.auth.onAuthStateChange((_event, session) => {
        if (currentUser?.id !== session?.user?.id) {
            initializePage();
        }
    });

    mainContainer.addEventListener('submit', (e) => {
        if (e.target && e.target.id === 'comment-form') {
            handleNewComment(e);
        }
    });
    
    mainContainer.addEventListener('click', (e) => {
        const targetButton = e.target.closest('button, a');
        if (!targetButton) return;
        if (targetButton.matches('.comment-delete-btn')) { handleDeleteComment(targetButton); }
        if (targetButton.matches('#delete-adventure-btn')) { handleDeleteAdventure(); }
        if (targetButton.matches('#subscribe-btn')) { handleSubscription(); }
        if (targetButton.matches('#edit-adventure-btn')) {
            window.location.href = `editar-aventura.html?id=${adventureId}`;
        }
    });

    initializePage();

    // ==================================================================
    // Funções auxiliares (Handlers e Renderizadores)
    // ==================================================================
    function showToast(message, type = 'success') {
        const toastContainer = document.getElementById('toast-container');
        if (!toastContainer) return;
        const toast = document.createElement('div');
        toast.className = `toast ${type}`; toast.textContent = message;
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
            mainContainer.innerHTML = '<h2>Aventura não encontrada.</h2><p>O link pode estar quebrado ou a aventura foi removida.</p>';
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
        const descriptionElement = document.getElementById('adventure-description');
        if (data.descricao && window.marked) {
            descriptionElement.innerHTML = marked.parse(data.descricao);
        } else {
            descriptionElement.textContent = data.descricao || 'Nenhuma descrição fornecida.';
        }
    }

    async function renderActionButtons() {
        const titleContainer = document.getElementById('title-container');
        const playerActionArea = document.getElementById('action-buttons-area');
        if (!playerActionArea || !titleContainer) return;

        playerActionArea.innerHTML = '';
        titleContainer.querySelectorAll('.master-action').forEach(el => el.remove());
        
        if (currentUser && adventureData && currentUser.id === adventureData.user_id) {
            const masterActionsWrapper = document.createElement('div');
            masterActionsWrapper.className = 'master-actions';
            
            const editButton = document.createElement('a');
            editButton.id = 'edit-adventure-btn';
            editButton.href = `editar-aventura.html?id=${adventureData.id}`;
            editButton.className = 'btn-icon-edit master-action';
            editButton.innerHTML = '<i class="fas fa-pencil-alt"></i>';
            editButton.title = 'Editar Aventura';
            
            const deleteButton = document.createElement('button');
            deleteButton.id = 'delete-adventure-btn';
            deleteButton.className = 'btn-icon-delete master-action';
            deleteButton.innerHTML = '<i class="fas fa-trash-alt"></i>';
            deleteButton.title = 'Deletar Aventura';
            
            masterActionsWrapper.appendChild(editButton);
            masterActionsWrapper.appendChild(deleteButton);
            titleContainer.appendChild(masterActionsWrapper);
        } else if (currentUser && adventureData) {
            const { data: subscription } = await supabaseClient.from('inscricoes').select('id').eq('user_id', currentUser.id).eq('aventura_id', adventureId).single();
            if (subscription) {
                playerActionArea.innerHTML = `<button id="subscribe-btn" class="btn-primario btn-inscricao inscrito">Cancelar Inscrição</button>`;
            } else {
                playerActionArea.innerHTML = `<button id="subscribe-btn" class="btn-primario btn-inscricao">Quero Participar!</button>`;
            }
        }
    }

    // ==================================================================
    // FUNÇÃO DE COMENTÁRIOS CORRIGIDA E ROBUSTA
    // ==================================================================
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
        if (profiles) {
            profiles.forEach(profile => {
                profileMap.set(profile.id, profile);
            });
        }
        
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
    }

    function renderCommentForm() { /* ... (código existente sem alterações) ... */ }
    async function handleSubscription() { /* ... (código existente sem alterações) ... */ }
    async function handleNewComment(e) { /* ... (código existente sem alterações) ... */ }
    async function handleDeleteComment(button) { /* ... (código existente sem alterações) ... */ }
    async function handleDeleteAdventure() { /* ... (código existente sem alterações) ... */ }
    async function updateHeaderUI(user) { /* ... (código existente sem alterações) ... */ }
});
