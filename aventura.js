document.addEventListener('DOMContentLoaded', async () => {
    // 1. INICIALIZAÇÃO
    const { createClient } = supabase;
    const SUPABASE_URL = 'https://zslokbeazldiwmblahps.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzbG9rYmVhemxkaXdtYmxhaHBzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0NDA2NDcsImV4cCI6MjA3MDAxNjY0N30.UfTi-SBzIa9Wn_uEnQiW5PAiTECSVimnGGVJ1IFABDQ';
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const adventureId = new URLSearchParams(window.location.search).get('id');
    const mainContainer = document.getElementById('adventure-detail-main');
    const userArea = document.getElementById('user-area');

    // Função principal que orquestra o carregamento da página
    async function initializePage() {
        try {
            const { data: { session } } = await supabaseClient.auth.getSession();
            const currentUser = session?.user;
            await updateHeaderUI(currentUser);

            if (!adventureId) {
                mainContainer.innerHTML = '<h2>Nenhuma aventura especificada.</h2>';
                return;
            }
            
            const adventureData = await fetchAdventureDetails();

            if (adventureData) {
                displayAdventureDetails(adventureData);
                // CORREÇÃO: Passando os dados necessários para as funções
                await renderActionButtons(currentUser, adventureData);
                await renderComments(currentUser, adventureData);
                renderCommentForm(currentUser);
            }
        } catch (error) {
            console.error("Ocorreu um erro crítico ao inicializar a página:", error);
            mainContainer.innerHTML = `<h2 style="color: red;">Ocorreu um Erro ao Carregar a Página</h2><p>Não foi possível carregar os detalhes da aventura. Por favor, tente recarregar a página.</p>`;
        }
    }

    // Busca os detalhes da aventura no Supabase
    async function fetchAdventureDetails() {
        const { data, error } = await supabaseClient.from('aventuras').select('*').eq('id', adventureId).single();
        if (error || !data) {
            console.error('Erro ao buscar a aventura:', error);
            mainContainer.innerHTML = '<h2>Aventura não encontrada.</h2><p>O link pode estar quebrado ou a aventura foi removida.</p>';
            return null;
        }
        return data;
    }
    
    // Atualiza o cabeçalho com informações do usuário
    async function updateHeaderUI(user) {
        if (user) {
            const { data: profile } = await supabaseClient.from('profiles').select('username').eq('id', user.id).single();
            const displayName = profile?.username || user.email.split('@')[0];
            userArea.innerHTML = `<a href="profile.html" class="btn-primario">Olá, ${displayName}</a><button id="logout-button" class="btn-primario">Sair</button>`;
            document.getElementById('logout-button').addEventListener('click', () => supabaseClient.auth.signOut());
        } else {
            userArea.innerHTML = `<a href="login.html" class="btn-primario">Login / Cadastrar</a>`;
        }
    }

    // Renderiza os botões de ação (Mestre: Editar/Arquivar/Deletar, Jogador: Inscrever/Cancelar)
    async function renderActionButtons(currentUser, adventureData) {
        const titleContainer = document.getElementById('title-container');
        const playerActionArea = document.getElementById('action-buttons-area');
        if (!playerActionArea || !titleContainer) return;

        playerActionArea.innerHTML = '';
        const existingMasterActions = titleContainer.querySelector('.master-actions');
        if (existingMasterActions) existingMasterActions.remove();
        
        if (currentUser && adventureData && currentUser.id === adventureData.user_id) {
            const masterActionsWrapper = document.createElement('div');
            masterActionsWrapper.className = 'master-actions';
            masterActionsWrapper.innerHTML = `
                <a href="editar-aventura.html?id=${adventureData.id}" class="btn-icon-edit" title="Editar Aventura"><i class="fas fa-pencil-alt"></i></a>
                <button id="archive-adventure-btn" class="btn-icon-archive" title="Arquivar Aventura"><i class="fas fa-archive"></i></button>
                <button id="delete-adventure-btn" class="btn-icon-delete" title="Deletar Aventura Permanentemente"><i class="fas fa-trash-alt"></i></button>
            `;
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

    // Preenche os detalhes da aventura na página
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
    
    // Renderiza a lista de comentários
    async function renderComments(currentUser, adventureData) {
        const commentsList = document.getElementById('comments-list');
        if (!commentsList) return;
        commentsList.innerHTML = '<p>Carregando comentários...</p>';
        const { data: comments, error } = await supabaseClient.from('comentarios').select('*, profiles (id, username, avatar_url)').eq('aventura_id', adventureId).order('created_at', { ascending: true });
        
        if (error) { console.error("Erro ao buscar comentários:", error); return; }
        
        if (comments.length === 0) {
            commentsList.innerHTML = '<p>Ainda não há comentários. Seja o primeiro a comentar!</p>';
            return;
        }
        commentsList.innerHTML = '';
        comments.forEach(comment => {
            const commentEl = document.createElement('div');
            commentEl.className = 'comment';
            const canDelete = currentUser && (currentUser.id === comment.user_id || (adventureData && currentUser.id === adventureData.user_id));
            commentEl.innerHTML = `
                <div class="comment-avatar"><img src="${comment.profiles?.avatar_url || 'https://i.imgur.com/V4Rcl9o.png'}" alt="Avatar"></div>
                <div class="comment-body">
                    <div class="comment-header">
                        <span>${comment.profiles?.username || 'Usuário'}</span>
                        ${canDelete ? `<button class="comment-delete-btn" data-comment-id="${comment.id}" title="Deletar Comentário"><i class="fas fa-trash-alt"></i></button>` : ''}
                    </div>
                    <p>${comment.content}</p>
                </div>`;
            commentsList.appendChild(commentEl);
        });
    }

    // Renderiza o formulário para adicionar novos comentários
    function renderCommentForm(currentUser) {
        const container = document.getElementById('comment-form-container');
        if (!container) return;
        if (currentUser) {
            container.innerHTML = `<form id="comment-form"><textarea id="comment-text" placeholder="Escreva seu comentário..." required rows="3"></textarea><button type="submit" class="btn-primario">Comentar</button></form>`;
        } else {
            container.innerHTML = '<p>Você precisa estar <a href="login.html">logado</a> para comentar.</p>';
        }
    }

    // --- Funções de Handler (Lógica das Ações) ---

    async function handleSubscription() {
        const { data: { session } } = await supabaseClient.auth.getSession();
        const currentUser = session?.user;
        const adventureData = await fetchAdventureDetails();
        if(!currentUser || !adventureData) return;

        const { data: existingSubscription } = await supabaseClient.from('inscricoes').select('id').eq('user_id', currentUser.id).eq('aventura_id', adventureId).single();
        if (existingSubscription) {
            await supabaseClient.from('inscricoes').delete().match({ user_id: currentUser.id, aventura_id: adventureId });
            showToast('Inscrição cancelada.');
        } else {
            await supabaseClient.from('inscricoes').insert({ user_id: currentUser.id, aventura_id: adventureId });
            showToast('Inscrição realizada!', 'success');
        }
        await renderActionButtons(currentUser, adventureData);
    }
    
    async function handleNewComment(e) {
        e.preventDefault();
        const { data: { session } } = await supabaseClient.auth.getSession();
        const currentUser = session?.user;
        const adventureData = await fetchAdventureDetails();
        if(!currentUser || !adventureData) return;

        const contentEl = document.getElementById('comment-text');
        const content = contentEl.value;
        if (!content.trim()) return;
        const formButton = document.querySelector('#comment-form button');
        formButton.disabled = true;
        
        await supabaseClient.from('comentarios').insert({ user_id: currentUser.id, aventura_id: adventureId, content: content });
        
        contentEl.value = '';
        await renderComments(currentUser, adventureData);
        formButton.disabled = false;
    }
    
    async function handleDeleteComment(button) {
        const { data: { session } } = await supabaseClient.auth.getSession();
        const currentUser = session?.user;
        const adventureData = await fetchAdventureDetails();
        if(!currentUser || !adventureData) return;

        const commentId = button.dataset.commentId;
        const confirmed = await showCustomConfirm('Tem certeza que deseja deletar este comentário?');
        if (confirmed) {
            await supabaseClient.from('comentarios').delete().eq('id', commentId);
            await renderComments(currentUser, adventureData);
        }
    }

    async function handleArchiveAdventure() {
        const confirmed = await showCustomConfirm('Tem a certeza de que quer ARQUIVAR esta aventura? Ela irá desaparecer do mural principal, mas continuará visível no seu perfil.');
        if (confirmed) {
            await supabaseClient.from('aventuras').update({ status: 'arquivada' }).eq('id', adventureId);
            showToast('Aventura arquivada com sucesso!');
            setTimeout(() => window.location.href = 'index.html', 1500);
        }
    }
    
    async function handleDeleteAdventure() {
        const confirmed = await showCustomConfirm('DELETAR PERMANENTEMENTE?\n\nEsta ação é irreversível e apagará todos os dados da aventura. Para apenas a esconder do mural, use a opção "Arquivar".');
        if (confirmed) {
            await supabaseClient.from('aventuras').delete().eq('id', adventureId);
            showToast('Aventura deletada com sucesso!');
            setTimeout(() => window.location.href = 'index.html', 1500);
        }
    }
    
    // --- Funções de Suporte 
    function showToast(message, type = 'success') { const toastContainer = document.getElementById('toast-container'); if (!toastContainer) return; const toast = document.createElement('div'); toast.className = `toast ${type}`; toast.textContent = message; toastContainer.appendChild(toast); setTimeout(() => { toast.classList.add('show'); }, 10); setTimeout(() => { toast.classList.remove('show'); toast.addEventListener('transitionend', () => toast.remove()); }, 3000); }
    function showCustomConfirm(message) { return new Promise((resolve) => { const overlay = document.getElementById('custom-confirm-overlay'); const messageEl = document.getElementById('confirm-message'); const btnYes = document.getElementById('confirm-btn-yes'); const btnNo = document.getElementById('confirm-btn-no'); messageEl.textContent = message; overlay.classList.remove('hidden'); const close = (value) => { overlay.classList.add('hidden'); btnYes.onclick = null; btnNo.onclick = null; resolve(value); }; btnYes.onclick = () => close(true); btnNo.onclick = () => close(false); }); }

    // --- Listeners de Eventos ---
    mainContainer.addEventListener('click', (e) => {
        const button = e.target.closest('button');
        if (!button) return;
        if (button.matches('.comment-delete-btn')) handleDeleteComment(button);
        if (button.matches('#subscribe-btn')) handleSubscription();
        if (button.matches('#archive-adventure-btn')) handleArchiveAdventure();
        if (button.matches('#delete-adventure-btn')) handleDeleteAdventure();
    });

    mainContainer.addEventListener('submit', (e) => {
        if (e.target.matches('#comment-form')) {
            e.preventDefault();
            handleNewComment(e);
        }
    });

    supabaseClient.auth.onAuthStateChange(async (_event, session) => {
        const { data: currentSessionData } = await supabaseClient.auth.getSession();
        const currentUserId = currentSessionData.session?.user?.id;
        const newUserId = session?.user?.id;
        if (currentUserId !== newUserId) {
            initializePage();
        }
    });

    initializePage();
});
