document.addEventListener('DOMContentLoaded', async () => {
    // 1. INICIALIZAÇÃO
    const { createClient } = supabase;
    const SUPABASE_URL = 'https://zslokbeazldiwmblahps.supabase.co';
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
        const actionArea = document.getElementById('action-buttons-area');
        
        if (currentUser.id === adventureData.user_id) {
            // É o mestre da aventura
            actionArea.innerHTML = `<button id="delete-adventure-btn" class="btn-primario btn-delete-adventure">Deletar Aventura</button>`;
            document.getElementById('delete-adventure-btn').addEventListener('click', handleDeleteAdventure);
        } else {
            // É um jogador
            const { data: subscription, error } = await supabaseClient.from('inscricoes').select('id').eq('user_id', currentUser.id).eq('aventura_id', adventureId).single();
            if (subscription) {
                actionArea.innerHTML = `<button id="subscribe-btn" class="btn-primario btn-inscricao inscrito">Cancelar Inscrição</button>`;
            } else {
                actionArea.innerHTML = `<button id="subscribe-btn" class="btn-primario btn-inscricao">Quero Participar!</button>`;
            }
            document.getElementById('subscribe-btn').addEventListener('click', handleSubscription);
        }
    }
    
    async function renderComments() {
        const commentsList = document.getElementById('comments-list');
        const { data: comments, error } = await supabaseClient
            .from('comentarios')
            .select('*, profile:profiles(username)') // Pega o username do perfil junto com o comentário
            .eq('aventura_id', adventureId)
            .order('created_at', { ascending: true });
        
        if(error) { console.error("Erro ao buscar comentários:", error); return; }

        commentsList.innerHTML = '';
        if (comments.length > 0) {
            comments.forEach(comment => {
                const commentEl = document.createElement('div');
                commentEl.className = 'comment';
                const authorName = comment.profile?.username || 'Usuário Anônimo';
                const canDelete = currentUser && (currentUser.id === comment.user_id || currentUser.id === adventureData.user_id);
                
                commentEl.innerHTML = `
                    <div class="comment-header">
                        <span class="comment-author">${authorName}</span>
                        ${canDelete ? `<button class="comment-delete-btn" data-comment-id="${comment.id}">Deletar</button>` : ''}
                    </div>
                    <p class="comment-content">${comment.content}</p>
                `;
                commentsList.appendChild(commentEl);
            });
            document.querySelectorAll('.comment-delete-btn').forEach(btn => btn.addEventListener('click', handleDeleteComment));
        } else {
            commentsList.innerHTML = '<p>Ainda não há comentários. Seja o primeiro a comentar!</p>';
        }
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
        const btn = document.getElementById('subscribe-btn');
        const isSubscribed = btn.classList.contains('inscrito');

        if (isSubscribed) {
            // Cancelar inscrição
            const { error } = await supabaseClient.from('inscricoes').delete().match({ user_id: currentUser.id, aventura_id: adventureId });
            if (error) {
                showToast('Erro ao cancelar inscrição.', 'error');
            } else {
                showToast('Inscrição cancelada.');
                renderActionButtons();
            }
        } else {
            // Realizar inscrição
            const { error } = await supabaseClient.from('inscricoes').insert({ user_id: currentUser.id, aventura_id: adventureId });
            if (error) {
                showToast('Erro ao se inscrever.', 'error');
            } else {
                showToast('Inscrição realizada com sucesso!', 'success');
                renderActionButtons();
            }
        }
    }

    async function handleNewComment(e) {
        e.preventDefault();
        const content = document.getElementById('comment-text').value;
        if (!content.trim()) return;

        const { error } = await supabaseClient.from('comentarios').insert({
            user_id: currentUser.id,
            aventura_id: adventureId,
            content: content
        });
        if (error) {
            showToast('Erro ao enviar comentário.', 'error');
        } else {
            document.getElementById('comment-text').value = '';
            renderComments();
        }
    }
    
    async function handleDeleteComment(e) {
        const commentId = e.target.dataset.commentId;
        if (!confirm('Tem certeza que deseja deletar este comentário?')) return;
        
        const { error } = await supabaseClient.from('comentarios').delete().eq('id', commentId);
        if (error) {
            showToast('Erro ao deletar comentário.', 'error');
        } else {
            showToast('Comentário deletado.');
            renderComments();
        }
    }

    async function handleDeleteAdventure() {
        if (!confirm('Você tem certeza que deseja DELETAR esta aventura? Esta ação é irreversível.')) return;
        
        const { error } = await supabaseClient.from('aventuras').delete().eq('id', adventureId);
        if (error) {
            showToast('Erro ao deletar a aventura.', 'error');
        } else {
            showToast('Aventura deletada com sucesso!');
            setTimeout(() => window.location.href = 'index.html', 1500);
        }
    }
    
    async function updateHeaderUI(user) {
        currentUser = user;
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

    // 3. INICIALIZAÇÃO DA PÁGINA
    
    // Primeiro, verifica quem é o usuário logado
    const { data: { session } } = await supabaseClient.auth.getSession();
    await updateHeaderUI(session?.user);

    // Depois, carrega os dados da aventura e o resto da página
    if (adventureId) {
        adventureData = await fetchAdventureDetails();
        if (adventureData) {
            displayAdventureDetails(adventureData);
            renderActionButtons();
            renderComments();
            renderCommentForm();
        }
    } else {
        document.getElementById('adventure-detail-main').innerHTML = '<h2>Nenhuma aventura especificada.</h2>';
    }
    
    // Ouve por mudanças de login para atualizar a UI dinamicamente
    supabaseClient.auth.onAuthStateChange((_event, session) => {
        updateHeaderUI(session?.user);
        renderActionButtons();
        renderComments();
        renderCommentForm();
    });
});
