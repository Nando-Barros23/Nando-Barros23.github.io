document.addEventListener('DOMContentLoaded', async () => {
    // 1. INICIALIZAÇÃO
    const { createClient } = supabase;
    const SUPABASE_URL = 'https://zslokbeazldiwmblahps.supabase.co';
    
    // ATENÇÃO: COLE A CHAVE CORRETA QUE VOCÊ COPIOU DO PAINEL DO SUPABASE AQUI DENTRO DAS ASPAS
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzbG9rYmVhemxkaXdtYmxhaHBzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0NDA2NDcsImV4cCI6MjA3MDAxNjY0N30.UfTi-SBzIa9Wn_uEnQiW5PAiTECSVimnGGVJ1IFABDQ'; 

    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const userArea = document.getElementById('user-area');
    const adventureId = new URLSearchParams(window.location.search).get('id');
    let currentUser = null;
    let adventureData = null;

    // 2. FUNÇÕES DE RENDERIZAÇÃO E LÓGICA

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
        if (!currentUser || !adventureData) return;
        
        const titleContainer = document.getElementById('title-container');
        const playerActionArea = document.getElementById('action-buttons-area');
        
        playerActionArea.innerHTML = '';
        const existingDeleteBtn = document.getElementById('delete-adventure-btn');
        if(existingDeleteBtn) existingDeleteBtn.remove();
        
        if (currentUser.id === adventureData.user_id) {
            const deleteButton = document.createElement('button');
            deleteButton.id = 'delete-adventure-btn';
            deleteButton.className = 'btn-icon-delete';
            deleteButton.innerHTML = '<i class="fas fa-trash-alt"></i>';
            deleteButton.title = 'Deletar Aventura';
            titleContainer.appendChild(deleteButton);
            deleteButton.addEventListener('click', handleDeleteAdventure);
        } else {
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
            const canDelete = currentUser && (currentUser.id === comment.user_id || currentUser.id === adventureData.user_id);
            
            commentEl.innerHTML = `
                <div class="comment-avatar">
                    <img src="${authorAvatar}" alt="Avatar de ${authorName}">
                </div>
                <div class="comment-body">
                    <div class="comment-header">
                        <span class="comment-author">${authorName}</span>
                        ${canDelete ? `<button class="comment-delete-btn" data-comment-id="${comment.id}" title="Deletar Comentário"><i class="fas fa-trash-alt"></i></button>` : ''}
                    </div>
                    <p class="comment-content">${comment.content}</p>
                </div>
            `;
            commentsList.appendChild(commentEl);
        });
        document.querySelectorAll('.comment-delete-btn').forEach(btn => btn.addEventListener('click', handleDeleteComment));
    }

    function renderCommentForm() {
        const container = document.getElementById('comment-form-container');
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

    async function handleSubscription() {
        // ... (código sem alterações)
    }

    async function handleNewComment(e) {
        // ... (código sem alterações)
    }
    
    async function handleDeleteComment(e) {
        // ... (código sem alterações)
    }

    async function handleDeleteAdventure() {
        // ... (código sem alterações)
    }
    
    async function updateHeaderUI(user) {
        // ... (código sem alterações)
    }

    // 3. INICIALIZAÇÃO DA PÁGINA
    const { data: { session } } = await supabaseClient.auth.getSession();
    await updateHeaderUI(session?.user);

    if (adventureId) {
        adventureData = await fetchAdventureDetails();
        if (adventureData) {
            displayAdventureDetails(adventureData);
            await renderActionButtons();
            await renderComments();
            renderCommentForm();
        }
    } else {
        document.getElementById('adventure-detail-main').innerHTML = '<h2>Nenhuma aventura especificada.</h2>';
    }
    
    supabaseClient.auth.onAuthStateChange(async (_event, session) => {
        await updateHeaderUI(session?.user);
        if (adventureData) {
            await renderActionButtons();
            await renderComments();
            renderCommentForm();
        }
    });
});
// Para não sobrecarregar, omiti o conteúdo das funções que não mudam.
// O importante é que você copie e cole o bloco de código inteiro para garantir
// que a estrutura e as chamadas de função estejam corretas, e principalmente
// para corrigir a SUPABASE_ANON_KEY no topo do arquivo.
