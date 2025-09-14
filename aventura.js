document.addEventListener('DOMContentLoaded', async () => {
    let currentUser = null;
    let adventureData = null;
    const adventureId = new URLSearchParams(window.location.search).get('id');
    const userArea = document.getElementById('user-area');
    const mainContainer = document.getElementById('adventure-detail-main');

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
            
            const { data: subscription } = await supabaseClient
                .from('inscricoes')
                .select('status')
                .eq('user_id', currentUser?.id) // Adicionado '?' para segurança se não houver user
                .eq('aventura_id', adventureId)
                .single();

            await renderActionButtons(subscription);
            await renderComments();
            renderCommentForm();
            await renderSchedulingPanel(subscription);
        }
    }

    async function fetchAdventureDetails() {
        const { data, error } = await supabaseClient.from('aventuras').select('*').eq('id', adventureId).single();
        if (error || !data) {
            mainContainer.innerHTML = '<h2>Aventura não encontrada.</h2><p>O link pode estar quebrado ou a aventura foi removida.</p>';
            return null;
        }
        return data;
    }
    
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

    // --- FUNÇÃO renderActionButtons ATUALIZADA ---
    async function renderActionButtons(subscription) {
        const titleContainer = document.getElementById('title-container');
        const playerActionArea = document.getElementById('action-buttons-area');
        if (!playerActionArea || !titleContainer) return;

        playerActionArea.innerHTML = '';
        const existingMasterActions = titleContainer.querySelector('.master-actions');
        if (existingMasterActions) existingMasterActions.remove();
        
        // Lógica para o Mestre
        if (currentUser && adventureData && currentUser.id === adventureData.user_id) {
            const masterActionsWrapper = document.createElement('div');
            masterActionsWrapper.className = 'master-actions';
            masterActionsWrapper.innerHTML = `
                <a href="editar-aventura.html?id=${adventureData.id}" class="btn-icon-edit" title="Editar Aventura" aria-label="Editar Aventura"><i class="fas fa-pencil-alt"></i></a>
                <button id="archive-adventure-btn" class="btn-icon-archive" title="Arquivar Aventura" aria-label="Arquivar Aventura"><i class="fas fa-archive"></i></button>
                <button id="delete-adventure-btn" class="btn-icon-delete" title="Deletar Aventura Permanentemente" aria-label="Deletar Aventura Permanentemente"><i class="fas fa-trash-alt"></i></button>
            `;
            titleContainer.appendChild(masterActionsWrapper);

            // --- ADICIONADO: Botão para mudar o status da aventura ---
            if (adventureData.status === 'ativa') {
                playerActionArea.innerHTML = `<button id="start-scheduling-btn" class="btn-primario">Encerrar Inscrições e Agendar</button>`;
            } else if (adventureData.status === 'em_andamento') {
                playerActionArea.innerHTML = `<p style="font-weight: bold; color: green;">Esta aventura está em andamento.</p>`;
            }

        } 
        // Lógica para o Jogador
        else if (currentUser && adventureData) {
            if (subscription) {
                switch (subscription.status) {
                    case 'aprovado': playerActionArea.innerHTML = `<p style="color: green; font-weight: bold;">✅ Você foi aprovado para esta aventura!</p><button id="subscribe-btn" class="btn-primario btn-inscricao inscrito">Sair da Mesa</button>`; break;
                    case 'pendente': playerActionArea.innerHTML = `<p style="font-weight: bold;">⏳ Sua candidatura está pendente de aprovação.</p><button id="subscribe-btn" class="btn-primario btn-inscricao inscrito">Cancelar Candidatura</button>`; break;
                    case 'recusado': playerActionArea.innerHTML = `<p style="color: red; font-weight: bold;">❌ A sua candidatura não foi aceite pelo mestre.</p>`; break;
                    default: playerActionArea.innerHTML = `<button id="subscribe-btn" class="btn-primario btn-inscricao inscrito">Cancelar Candidatura</button>`;
                }
            } else {
                // --- ALTERADO: O botão "Quero Participar" só aparece se a aventura estiver 'ativa' ---
                if (adventureData.status === 'ativa') {
                    const { data: approvedSubs } = await supabaseClient.from('inscricoes').select('id').eq('aventura_id', adventureId).eq('status', 'aprovado');
                    const approvedCount = approvedSubs ? approvedSubs.length : 0;
                    if (approvedCount >= adventureData.vagas) {
                        playerActionArea.innerHTML = `<button class="btn-primario btn-inscricao" disabled>Vagas Esgotadas</button>`;
                    } else {
                        playerActionArea.innerHTML = `<button id="subscribe-btn" class="btn-primario btn-inscricao">Quero Participar!</button>`;
                    }
                } else {
                    playerActionArea.innerHTML = `<p style="font-weight: bold;">As inscrições para esta aventura estão encerradas.</p>`;
                }
            }
        }
    }
    
    function displayAdventureDetails(data) {
        document.title = `${data.titulo} - Dados & Calangos`;
        document.getElementById('adventure-title').textContent = data.titulo;
        document.getElementById('adventure-image').src = data.image_url || 'https://i.imgur.com/Q3j5eH0.png';
        document.getElementById('adventure-image').loading = 'lazy';
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
            descriptionElement.innerHTML = DOMPurify.sanitize(marked.parse(data.descricao));
        } else {
            descriptionElement.textContent = data.descricao || 'Nenhuma descrição fornecida.';
        }
        const pageUrl = window.location.href;
        const descriptionSnippet = data.descricao ? data.descricao.substring(0, 155).trim() + '...' : 'Veja os detalhes desta aventura de RPG de mesa.';
        const imageUrl = data.image_url || 'https://i.imgur.com/SzXWxJe.png';

            document.getElementById('og-title').setAttribute('content', data.titulo);
            document.getElementById('og-description').setAttribute('content', descriptionSnippet);
            document.getElementById('og-image').setAttribute('content', imageUrl);
            document.getElementById('og-url').setAttribute('content', pageUrl);
            document.getElementById('twitter-title').setAttribute('content', data.titulo);
            document.getElementById('twitter-description').setAttribute('content', descriptionSnippet);
            document.getElementById('twitter-image').setAttribute('content', imageUrl);
            document.getElementById('twitter-url').setAttribute('content', pageUrl);
    }

    async function renderComments() {
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

            const sanitizedContent = DOMPurify.sanitize(comment.content);

            commentEl.innerHTML = `
                <div class="comment-avatar"><img src="${comment.profiles?.avatar_url || 'https://i.imgur.com/V4Rcl9o.png'}" alt="Avatar" loading="lazy"></div>
                <div class="comment-body">
                    <div class="comment-header">
                        <span>${comment.profiles?.username || 'Usuário'}</span>
                        ${canDelete ? `<button class="comment-delete-btn" data-comment-id="${comment.id}" title="Deletar Comentário"><i class="fas fa-trash-alt"></i></button>` : ''}
                    </div>
                    <p>${sanitizedContent}</p>
                </div>`;
            commentsList.appendChild(commentEl);
        });
    }

    function renderCommentForm() {
        const container = document.getElementById('comment-form-container');
        if (!container) return;
        if (currentUser) {
            container.innerHTML = `<form id="comment-form"><textarea id="comment-text" placeholder="Escreva seu comentário..." required rows="3"></textarea><button type="submit" class="btn-primario">Comentar</button></form>`;
        } else {
            container.innerHTML = '<p>Você precisa estar <a href="login.html">logado</a> para comentar.</p>';
        }
    }
    function mostrarConfirmacaoDelete(btn) {
    const comment = btn.closest(".comment");
    const box = comment.querySelector(".delete-confirmation");
    box.style.display = "block";
    }

    document.addEventListener("click", function(e) {
    if (e.target.classList.contains("btn-cancel")) {
        e.target.closest(".delete-confirmation").style.display = "none";
    }
    });


    // --- FUNÇÃO DO PAINEL DE AGENDAMENTO ATUALIZADA ---
    async function renderSchedulingPanel(subscription) {
        const panel = document.getElementById('scheduling-panel');
        const content = document.getElementById('scheduling-content');
        if (!panel || !content) return;

        const isMaster = currentUser && currentUser.id === adventureData.user_id;
        const isApprovedPlayer = subscription && subscription.status === 'aprovado';

        // --- ALTERADO: Painel só aparece se a aventura estiver 'em_andamento'
        if (adventureData.status !== 'em_andamento' || (!isMaster && !isApprovedPlayer)) {
            panel.style.display = 'none';
            return;
        }

        panel.style.display = 'block';
        content.innerHTML = '<p>A carregar sessões...</p>';

        const { data: sessoes, error: sessoesError } = await supabaseClient
            .from('sessoes_propostas')
            .select(`*, votos_sessoes ( user_id )`)
            .eq('aventura_id', adventureData.id)
            .order('data_hora_proposta', { ascending: true });

        if (sessoesError) {
            content.innerHTML = '<p style="color: red;">Erro ao carregar sessões.</p>';
            return;
        }
        
        let html = '';
        if (isMaster) {
            html += `
                <form id="propose-session-form" class="form-grupo">
                    <label for="session-datetime">Propor Nova Data e Hora</label>
                    <input type="datetime-local" id="session-datetime" required style="margin-bottom: 0.5rem; width: auto;">
                    <textarea id="session-notes" placeholder="Notas (opcional, ex: Sessão Zero)" rows="2" style="width:100%"></textarea>
                    <button type="submit" class="btn-primario" style="width: auto; margin-top: 0.5rem;">Propor Data</button>
                </form>
                <hr style="margin: 2rem 0;">
            `;
        }
        
        if (sessoes.length === 0) {
            html += '<p>O mestre ainda não propôs nenhuma data para a próxima sessão.</p>';
        } else {
            sessoes.forEach(sessao => {
                const dataFormatada = new Date(sessao.data_hora_proposta).toLocaleString('pt-BR', { dateStyle: 'full', timeStyle: 'short' });
                const totalVotos = sessao.votos_sessoes.length;
                const userHasVoted = sessao.votos_sessoes.some(voto => voto.user_id === currentUser.id);

                html += `<div class="session-proposal" style="background: #fff; padding: 1rem; border-radius: 4px; margin-bottom: 1rem; display: flex; justify-content: space-between; align-items: center;">`;
                html += `
                    <div class="session-info">
                        <strong>${dataFormatada}</strong>
                        <p style="font-size: 0.9rem; margin: 0;">Status: ${sessao.status} | Votos: ${totalVotos}</p>
                        ${sessao.notas_mestre ? `<p style="font-size: 0.9rem; color: #555; margin: 0;">Nota: ${sessao.notas_mestre}</p>` : ''}
                    </div>
                `;
                if (isApprovedPlayer && sessao.status === 'votacao') {
                    if (userHasVoted) {
                        html += `<button class="btn-secundario session-vote-btn" data-sessao-id="${sessao.id}" data-action="remove">❌ Remover Voto</button>`;
                    } else {
                        html += `<button class="btn-primario session-vote-btn" data-sessao-id="${sessao.id}" data-action="add">✅ Votar</button>`;
                    }
                }
                html += '</div>';
            });
        }
        content.innerHTML = html; 
    }

    async function handleProposeSession() {
        const datetimeInput = document.getElementById('session-datetime');
        const notesInput = document.getElementById('session-notes');
        if (!datetimeInput.value) return alert('Por favor, escolha uma data e hora.');
        await supabaseClient.from('sessoes_propostas').insert({ aventura_id: adventureId, data_hora_proposta: datetimeInput.value, notas_mestre: notesInput.value });
        const { data: sub } = await supabaseClient.from('inscricoes').select('status').eq('user_id', currentUser.id).eq('aventura_id', adventureId).single();
        await renderSchedulingPanel(sub);
    }

    async function handleSessionVote(sessaoId, action) {
        if (action === 'add') {
            await supabaseClient.from('votos_sessoes').insert({ sessao_proposta_id: sessaoId, user_id: currentUser.id });
        } else if (action === 'remove') {
            await supabaseClient.from('votos_sessoes').delete().match({ sessao_proposta_id: sessaoId, user_id: currentUser.id });
        }
        const { data: sub } = await supabaseClient.from('inscricoes').select('status').eq('user_id', currentUser.id).eq('aventura_id', adventureId).single();
        await renderSchedulingPanel(sub);
    }
    
    async function handleSubscription() {
        const { data: existingSubscription } = await supabaseClient.from('inscricoes').select('id').eq('user_id', currentUser.id).eq('aventura_id', adventureId).single();
        if (existingSubscription) {
            await supabaseClient.from('inscricoes').delete().match({ user_id: currentUser.id, aventura_id: adventureId });
            showToast('Candidatura cancelada.');
        } else {
            await supabaseClient.from('inscricoes').insert({ user_id: currentUser.id, aventura_id: adventureId });
            showToast('Candidatura enviada com sucesso!', 'success');
        }
        await initializePage();
    }
    
    async function handleNewComment(e) {
        e.preventDefault();
        const contentEl = document.getElementById('comment-text');
        const content = contentEl.value;
        if (!content.trim()) return;
        const formButton = document.querySelector('#comment-form button');
        formButton.disabled = true;
        await supabaseClient.from('comentarios').insert({ user_id: currentUser.id, aventura_id: adventureId, content: content });
        contentEl.value = '';
        await renderComments();
        formButton.disabled = false;
    }
    
    async function handleDeleteComment(button) {
        const commentId = button.dataset.commentId;
        const confirmed = await showCustomConfirm('Tem certeza que deseja deletar este comentário?');
        if (confirmed) {
            await supabaseClient.from('comentarios').delete().eq('id', commentId);
            await renderComments();
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
    
    // --- NOVA FUNÇÃO ADICIONADA ---
    async function handleStartScheduling() {
        const confirmed = await showCustomConfirm('Tem a certeza de que quer encerrar as inscrições e iniciar o agendamento? Novos jogadores não poderão mais se candidatar.');
        if (confirmed) {
            const { error } = await supabaseClient
                .from('aventuras')
                .update({ status: 'em_andamento' })
                .eq('id', adventureId);

            if (error) {
                showToast('Erro ao iniciar o agendamento.', 'error');
            } else {
                showToast('Inscrições encerradas! O painel de agendamento está agora visível para os jogadores aprovados.');
                // Recarrega a página para mostrar o novo estado
                location.reload();
            }
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
    
    function showToast(message, type = 'success') { const toastContainer = document.getElementById('toast-container'); if (!toastContainer) return; const toast = document.createElement('div'); toast.className = `toast ${type}`; toast.textContent = message; toastContainer.appendChild(toast); setTimeout(() => { toast.classList.add('show'); }, 10); setTimeout(() => { toast.classList.remove('show'); toast.addEventListener('transitionend', () => toast.remove()); }, 3000); }
    function showCustomConfirm(message) { return new Promise((resolve) => { const overlay = document.getElementById('custom-confirm-overlay'); const messageEl = document.getElementById('confirm-message'); const btnYes = document.getElementById('confirm-btn-yes'); const btnNo = document.getElementById('confirm-btn-no'); messageEl.textContent = message; overlay.classList.remove('hidden'); const close = (value) => { overlay.classList.add('hidden'); btnYes.onclick = null; btnNo.onclick = null; resolve(value); }; btnYes.onclick = () => close(true); btnNo.onclick = () => close(false); }); }

    // --- EVENT LISTENER DE CLICK ATUALIZADO ---
    mainContainer.addEventListener('click', (e) => {
        const button = e.target.closest('button');
        if (!button) return;
        
        // Adicionada a nova ação
        if (button.matches('#start-scheduling-btn')) {
            handleStartScheduling();
            return;
        }

        if (button.matches('.session-vote-btn')) {
            const sessaoId = button.dataset.sessaoId;
            const action = button.dataset.action;
            handleSessionVote(sessaoId, action);
            return;
        }

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
        if (e.target.matches('#propose-session-form')) {
            e.preventDefault();
            handleProposeSession();
        }
    });

    supabaseClient.auth.onAuthStateChange(async (_event, session) => {
        const newUserId = session?.user?.id;
        if (currentUser?.id !== newUserId) {
            initializePage();
        }
    });

    initializePage();
});