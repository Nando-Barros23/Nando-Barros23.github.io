document.addEventListener('DOMContentLoaded', async () => {
    // 1. INICIALIZAÇÃO
    const { createClient } = supabase;
    const SUPABASE_URL = 'https://zslokbeazldiwmblahps.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzbG9rYmVhemxkaXdtYmxhaHBzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0NDA2NDcsImV4cCI6MjA3MDAxNjY0N30.UfTi-SBzIa9Wn_uEnQiW5PAiTECSVimnGGVJ1IFABDQ';
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    let currentUser = null;
    let adventureData = null;
    const adventureId = new URLSearchParams(window.location.search).get('id');
    const userArea = document.getElementById('user-area');
    const mainContainer = document.getElementById('adventure-detail-main');

    async function handleArchiveAdventure() {
        const confirmed = await showCustomConfirm('Tem a certeza de que quer ARQUIVAR esta aventura? Ela irá desaparecer do mural principal, mas continuará visível no seu perfil.');
        if (!confirmed) return;

        const { error } = await supabaseClient
            .from('aventuras')
            .update({ status: 'arquivada' })
            .eq('id', adventureId);

        if (error) { 
            showToast('Erro ao arquivar a aventura.', 'error'); 
        } else {
            showToast('Aventura arquivada com sucesso!');
            setTimeout(() => window.location.href = 'index.html', 1500);
        }
    }

    async function handleDeleteAdventure() {
        const confirmed = await showCustomConfirm('DELETAR PERMANENTEMENTE?\n\nEsta ação é irreversível e apagará todos os dados da aventura. Para apenas a esconder do mural, use a opção "Arquivar".');
        if (!confirmed) return;

        const { error } = await supabaseClient.from('aventuras').delete().eq('id', adventureId);
        if (error) { 
            showToast('Erro ao deletar a aventura.', 'error'); 
        } else {
            showToast('Aventura deletada com sucesso!');
            setTimeout(() => window.location.href = 'index.html', 1500);
        }
    }

    mainContainer.addEventListener('click', (e) => {
        const targetButton = e.target.closest('button, a');
        if (!targetButton) return;
        if (targetButton.matches('.comment-delete-btn')) { handleDeleteComment(targetButton); }
        if (targetButton.matches('#archive-adventure-btn')) { handleArchiveAdventure(); } // ADICIONADO
        if (targetButton.matches('#delete-adventure-btn')) { handleDeleteAdventure(); }
        if (targetButton.matches('#subscribe-btn')) { handleSubscription(); }
    });

    async function renderActionButtons() {
        const titleContainer = document.getElementById('title-container');
        const playerActionArea = document.getElementById('action-buttons-area');
        if (!playerActionArea || !titleContainer) return;

        playerActionArea.innerHTML = '';
        const existingMasterActions = titleContainer.querySelector('.master-actions');
        if (existingMasterActions) existingMasterActions.remove();
        
        if (currentUser && adventureData && currentUser.id === adventureData.user_id) {
            const masterActionsWrapper = document.createElement('div');
            masterActionsWrapper.className = 'master-actions';
            
            // 1. Botão Editar
            const editButton = document.createElement('a');
            editButton.href = `editar-aventura.html?id=${adventureData.id}`;
            editButton.className = 'btn-icon-edit';
            editButton.innerHTML = '<i class="fas fa-pencil-alt"></i>';
            editButton.title = 'Editar Aventura';
            
            // 2. Botão Arquivar
            const archiveButton = document.createElement('button');
            archiveButton.id = 'archive-adventure-btn';
            archiveButton.className = 'btn-icon-archive'; 
            archiveButton.innerHTML = '<i class="fas fa-archive"></i>';
            archiveButton.title = 'Arquivar Aventura';

            // 3. Botão Deletar
            const deleteButton = document.createElement('button');
            deleteButton.id = 'delete-adventure-btn';
            deleteButton.className = 'btn-icon-delete';
            deleteButton.innerHTML = '<i class="fas fa-trash-alt"></i>';
            deleteButton.title = 'Deletar Aventura Permanentemente';
            
            masterActionsWrapper.appendChild(editButton);
            masterActionsWrapper.appendChild(archiveButton);
            masterActionsWrapper.appendChild(deleteButton);
            titleContainer.appendChild(masterActionsWrapper);

        } else if (currentUser && adventureData) {
            const { count } = await supabaseClient.from('inscricoes').select('*', { count: 'exact', head: true }).eq('aventura_id', adventureId);
            const { data: subscription } = await supabaseClient.from('inscricoes').select('id').eq('user_id', currentUser.id).eq('aventura_id', adventureId).single();

            if (subscription) {
                playerActionArea.innerHTML = `<button id="subscribe-btn" class="btn-primario btn-inscricao inscrito">Cancelar Inscrição</button>`;
            } else if (count >= adventureData.vagas) {
                playerActionArea.innerHTML = `<button class="btn-primario btn-inscricao" disabled>Vagas Esgotadas</button>`;
            } else {
                playerActionArea.innerHTML = `<button id="subscribe-btn" class="btn-primario btn-inscricao">Quero Participar!</button>`;
            }
        }
    }
    
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
            await renderActionButtons(); // Adicionado await para garantir a renderização
            renderComments();
            renderCommentForm();
        }
    }
    
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

    supabaseClient.auth.onAuthStateChange(async (_event, session) => {
        const newUser = session?.user;
        if (currentUser?.id !== newUser?.id) {
            currentUser = newUser;
            await initializePage();
        }
    });

    mainContainer.addEventListener('submit', (e) => {
        if (e.target && e.target.id === 'comment-form') {
            handleNewComment(e);
        }
    });
    
    initializePage();

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
        document.getElementById('modality').textContent = data.modalidade || 'Não especificado';
        document.getElementById('game-type').textContent = data.tipo_jogo;
        document.getElementById('level').textContent = data.nivel;
        document.getElementById('slots').textContent = data.vagas;
        document.getElementById('trigger-warning').textContent = data.alerta_gatilho;
        
        const locationContainer = document.getElementById('location-display-container');
        if (data.modalidade === 'Presencial' && data.localizacao) {
            document.getElementById('location').textContent = data.localizacao;
            locationContainer.style.display = 'block';
        } else {
            locationContainer.style.display = 'none';
        }

        const descriptionElement = document.getElementById('adventure-description');
        if (data.descricao && window.marked) {
            descriptionElement.innerHTML = marked.parse(data.descricao);
        } else {
            descriptionElement.textContent = data.descricao || 'Nenhuma descrição fornecida.';
        }
    }
    
    async function renderComments() {
        const commentsList = document.getElementById('comments-list');
        if (!commentsList) return;
        commentsList.innerHTML = '<p>Carregando comentários...</p>';

        const { data: comments, error: commentsError } = await supabaseClient.from('comentarios').select('*, profiles (id, username, avatar_url)').eq('aventura_id', adventureId).order('created_at', { ascending: true });
        if (commentsError) {
            console.error("Erro ao buscar comentários:", commentsError);
            commentsList.innerHTML = '<p style="color: red;">Não foi possível carregar os comentários.</p>';
            return;
        }
        if (comments.length === 0) {
            commentsList.innerHTML = '<p>Ainda não há comentários. Seja o primeiro a comentar!</p>';
            return;
        }
        
        commentsList.innerHTML = '';
        comments.forEach(comment => {
            const commentEl = document.createElement('div');
            commentEl.className = 'comment';
            const authorProfile = comment.profiles;
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
        } else {
            container.innerHTML = '<p>Você precisa estar <a href="login.html">logado</a> para comentar.</p>';
        }
    }

    async function handleSubscription() {
        const btn = document.getElementById('subscribe-btn');
        if (!btn) return;
        const isSubscribed = btn.classList.contains('inscrito');
        if (isSubscribed) {
            const { error } = await supabaseClient.from('inscricoes').delete().match({ user_id: currentUser.id, aventura_id: adventureId });
            if (error) { showToast('Erro ao cancelar inscrição.', 'error'); } else { showToast('Inscrição cancelada.'); await renderActionButtons(); }
        } else {
            const { error } = await supabaseClient.from('inscricoes').insert({ user_id: currentUser.id, aventura_id: adventureId });
            if (error) { showToast('Erro ao se inscrever.', 'error'); } else { showToast('Inscrição realizada com sucesso!', 'success'); await renderActionButtons(); }
        }
    }

    async function handleNewComment(e) {
        e.preventDefault();
        const content = document.getElementById('comment-text').value;
        if (!content.trim()) return;
        const formButton = e.target.querySelector('button');
        formButton.disabled = true;
        const { error } = await supabaseClient.from('comentarios').insert({ user_id: currentUser.id, aventura_id: adventureId, content: content });
        if (error) {
            showToast('Erro ao enviar comentário.', 'error');
        } else {
            document.getElementById('comment-text').value = '';
            renderComments();
        }
        formButton.disabled = false;
    }
    
    async function handleDeleteComment(button) {
        const commentId = button.dataset.commentId;
        const confirmed = await showCustomConfirm('Tem certeza que deseja deletar este comentário?');
        if (!confirmed) return;
        const { error } = await supabaseClient.from('comentarios').delete().eq('id', commentId);
        if (error) { showToast('Erro ao deletar comentário.', 'error'); } else { showToast('Comentário deletado.'); renderComments(); }
    }
    
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
