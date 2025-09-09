document.addEventListener('DOMContentLoaded', async () => {
    const userArea = document.getElementById('user-area');
    const usernameDisplay = document.getElementById('username-display');
    const emailDisplay = document.getElementById('email-display');
    const roleDisplay = document.getElementById('role-display');
    const avatarImg = document.getElementById('avatar-img');
    const btnChangeAvatar = document.getElementById('btn-change-avatar');
    const avatarUpload = document.getElementById('avatar-upload');
    const profileForm = document.getElementById('profile-form');
    const usernameInput = document.getElementById('username-input');
    const messageArea = document.getElementById('message-area');
    const masterApplicationContent = document.getElementById('master-application-content');
    const masterApplicationSection = document.getElementById('master-application-section');
    const myAdventuresSection = document.getElementById('my-adventures-section');
    const myAdventuresList = document.getElementById('my-adventures-list');
    let currentUser = null;

    
    async function toggleSubscribers(adventureId, headerElement) {
        const listDiv = document.getElementById(`subscribers-${adventureId}`);
        const icon = headerElement.querySelector('i');

        if (listDiv.style.display === 'block') {
            listDiv.style.display = 'none';
            icon.style.transform = 'rotate(0deg)';
            return;
        }

        listDiv.innerHTML = `
            <form class="subscriber-search-form" data-adventure-id="${adventureId}" style="display: flex; gap: 10px; margin-bottom: 1rem;">
                <input type="search" placeholder="Pesquisar por nome..." style="flex-grow: 1; padding: 0.5rem;">
                <button type="submit" class="btn-primario" style="padding: 0.5rem 1rem;">Buscar</button>
            </form>
            <div class="subscriber-items-container">
                <p>Carregando candidatos...</p>
            </div>
        `;
        listDiv.style.display = 'block';
        icon.style.transform = 'rotate(180deg)';

        const { data: subscribers, error } = await supabaseClient
            .from('inscricoes')
            .select('id, user_id, status, profiles (id, username, avatar_url)')
            .eq('aventura_id', adventureId);
            
        if (error) {
            listDiv.querySelector('.subscriber-items-container').innerHTML = '<p style="color: red;">Erro ao carregar inscritos.</p>';
            console.error(error);
            return;
        }
        
        const pending = subscribers.filter(s => s.status === 'pendente');
        const approved = subscribers.filter(s => s.status === 'aprovado');

        const itemsContainer = listDiv.querySelector('.subscriber-items-container');
        itemsContainer.innerHTML = `
            <div class="subscriber-section">
                <h4>Candidaturas Pendentes (${pending.length})</h4>
                <div id="pending-list-${adventureId}"></div>
            </div>
            <div class="subscriber-section">
                <h4>Jogadores Aprovados (${approved.length})</h4>
                <div id="approved-list-${adventureId}"></div>
            </div>
        `;

        renderApplicantList(pending, document.getElementById(`pending-list-${adventureId}`));
        renderApplicantList(approved, document.getElementById(`approved-list-${adventureId}`));
    }
    
    function renderApplicantList(list, container) {
        if (list.length === 0) {
            container.innerHTML = '<p>Nenhum jogador nesta categoria.</p>';
            return;
        }

        container.innerHTML = '';
        list.forEach(sub => {
            const profile = sub.profiles;
            if (!profile) return;
            const avatarUrl = profile.avatar_url || 'https://i.imgur.com/V4Rcl9o.png';
            
            const applicantEl = document.createElement('div');
            applicantEl.className = 'subscriber-item';
            applicantEl.id = `inscricao-${sub.id}`;

            let buttons = '';
            if (sub.status === 'pendente') {
                buttons = `
                    <div class="applicant-actions">
                        <button class="btn-applicant-action approve" data-inscricao-id="${sub.id}" data-action="aprovado">Aprovar</button>
                        <button class="btn-applicant-action reject" data-inscricao-id="${sub.id}" data-action="recusado">Recusar</button>
                    </div>
                `;
            } else if (sub.status === 'aprovado') {
                buttons = `
                    <div class="applicant-actions">
                        <button class="btn-applicant-action reject" data-inscricao-id="${sub.id}" data-action="removido">Remover</button>
                    </div>
                `;
            }

            applicantEl.innerHTML = `
                <img src="${avatarUrl}" alt="Avatar de ${profile.username}">
                <span>${profile.username || 'Usuário sem nome'}</span>
                ${buttons}
            `;
            container.appendChild(applicantEl);
        });
    }
    
    async function handleApplicationAction(inscricaoId, action, headerElement) {
        let newStatus = action;
        if (action === 'removido') newStatus = 'recusado';
        
        const { error } = await supabaseClient
            .from('inscricoes')
            .update({ status: newStatus })
            .eq('id', inscricaoId);

        if (error) {
            alert('Erro ao processar a ação: ' + error.message);
        } else {
            const adventureId = headerElement.dataset.adventureId;
            await toggleSubscribers(adventureId, headerElement); 
            await toggleSubscribers(adventureId, headerElement); 
        }
    }

    
    async function handleAdventureStatusChange(adventureId, newStatus) {
        const { error } = await supabaseClient
            .from('aventuras')
            .update({ status: newStatus })
            .eq('id', adventureId);
        if (error) {
            alert('Erro ao atualizar o status da aventura: ' + error.message);
        } else {
            loadMyAdventures(currentUser); 
        }
    }

    async function handlePermanentDelete(adventureId) {
        const confirmed = confirm('TEM A CERTEZA?\n\nEsta ação vai apagar permanentemente a aventura e todos os seus dados (inscrições, comentários, etc.). Isto é irreversível.');
        if (!confirmed) return;

        const { error } = await supabaseClient
            .from('aventuras')
            .delete()
            .eq('id', adventureId);
        if (error) {
            alert('Erro ao apagar a aventura: ' + error.message);
        } else {
            alert('Aventura apagada com sucesso.');
            loadMyAdventures(currentUser); 
        }
    }

    
    async function loadMyAdventures(user) {
        const { data: adventures, error } = await supabaseClient
            .from('aventuras')
            .select('id, titulo, status')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });
            
        if (error) { console.error('Erro ao buscar aventuras do mestre:', error); return; }

        myAdventuresList.innerHTML = '';
        if (adventures.length === 0) {
            myAdventuresList.innerHTML = '<p>Você ainda não publicou nenhuma aventura.</p>';
            return;
        }

        adventures.forEach(adventure => {
            const item = document.createElement('div');
            item.className = 'my-adventure-item';
            
            let statusTag = '';
            let actionButtonsHTML = '';

            const statusInfo = {
                ativa: { text: '[Ativa]', class: 'active' },
                em_andamento: { text: '[Em Andamento]', class: 'in-progress' },
                finalizada: { text: '[Finalizada]', class: 'finished' },
                arquivada: { text: '[Arquivada]', class: 'archived' }
            };
            
            if (adventure.status && statusInfo[adventure.status]) {
                statusTag = `<span class="status-tag ${statusInfo[adventure.status].class}">${statusInfo[adventure.status].text}</span>`;
            }

            switch (adventure.status) {
                case 'em_andamento':
                    actionButtonsHTML = `<button class="btn-adventure-action finalize" data-adventure-id="${adventure.id}">Finalizar</button>`;
                    break;
                case 'finalizada':
                    actionButtonsHTML = `<button class="btn-adventure-action delete-permanent" data-adventure-id="${adventure.id}">Apagar de Vez</button>`;
                    break;
                case 'arquivada':
                    actionButtonsHTML = `
                        <button class="btn-adventure-action unarchive" data-adventure-id="${adventure.id}">Desarquivar</button>
                        <button class="btn-adventure-action delete-permanent" data-adventure-id="${adventure.id}">Apagar de Vez</button>
                    `;
                    break;
            }

            item.innerHTML = `
                <div class="my-adventure-header" data-adventure-id="${adventure.id}">
                    <div class="adventure-title-status">
                        <span>${adventure.titulo}</span>
                        ${statusTag}
                    </div>
                    <div class="adventure-actions">
                        ${actionButtonsHTML}
                        <i class="fas fa-chevron-down"></i>
                    </div>
                </div>
                <div class="subscribers-list" id="subscribers-${adventure.id}" style="display: none;"></div>
            `;
            myAdventuresList.appendChild(item);
        });
    }

    async function initializeProfilePage() {
        const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
        if (sessionError || !session) {
            console.error('Erro ao buscar sessão:', sessionError);
            window.location.href = 'login.html';
            return;
        }
        currentUser = session.user;
        await loadProfileData(currentUser);
    }
    
    supabaseClient.auth.onAuthStateChange((_event, session) => {
        if (!session) {
            window.location.href = 'login.html';
        } else if (currentUser && session.user.id !== currentUser.id) {
            initializeProfilePage();
        }
    });

    function showMessage(message, isError = false) {
        if (!messageArea) return;
        messageArea.textContent = message;
        messageArea.style.backgroundColor = isError ? '#f8d7da' : '#d4edda';
        messageArea.style.color = isError ? '#721c24' : '#155724';
        messageArea.style.display = 'block';
        setTimeout(() => { messageArea.style.display = 'none'; }, 3000);
    }
    
    async function loadProfileData(user) {
        const { data: profileForHeader } = await supabaseClient.from('profiles').select('username').eq('id', user.id).single();
        const displayName = profileForHeader?.username || user.email.split('@')[0];
        userArea.innerHTML = `
            <a href="index.html" class="btn-primario" style="text-decoration: none; width: auto; padding: 0.5rem 1rem;">Página Principal</a> 
            <button id="logout-button" class="btn-primario" style="width: auto; padding: 0.5rem 1rem;">Sair</button>
        `;
        document.getElementById('logout-button').addEventListener('click', () => supabaseClient.auth.signOut());
        const { data, error } = await supabaseClient.from('profiles').select('*').eq('id', user.id).single();
        if (error && error.code !== 'PGRST116') { 
            console.error('Erro ao buscar perfil:', error); 
            return; 
        }
        if (data) {
            usernameDisplay.textContent = data.username || 'Sem nome de usuário';
            emailDisplay.textContent = user.email;
            roleDisplay.textContent = data.role;
            usernameInput.value = data.username;
            if (data.avatar_url) { avatarImg.src = data.avatar_url; }
            if (data.role && data.role.trim().toLowerCase() === 'master') {
                masterApplicationSection.style.display = 'none';
                myAdventuresSection.style.display = 'block';
                loadMyAdventures(user);
            } else {
                masterApplicationSection.style.display = 'block';
                myAdventuresSection.style.display = 'none';
                checkMasterApplicationStatus(user);
            }
        }
    }

    async function handleSearchSubscribers(adventureId, searchTerm) {
        const listDiv = document.getElementById(`subscribers-${adventureId}`);
        const itemsContainer = listDiv.querySelector('.subscriber-items-container');
        itemsContainer.innerHTML = `<p>Pesquisando por "${searchTerm}"...</p>`;
        let query = supabaseClient
            .from('inscricoes')
            .select('id, user_id, status, profiles (id, username, avatar_url)')
            .eq('aventura_id', adventureId);
        if (searchTerm) {
            query = query.ilike('profiles.username', `%${searchTerm}%`);
        }
        const { data: subscribers, error } = await query;
        if (error) {
            itemsContainer.innerHTML = '<p style="color: red;">Erro ao realizar a pesquisa.</p>';
            return;
        }
        const pending = subscribers.filter(s => s.status === 'pendente');
        const approved = subscribers.filter(s => s.status === 'aprovado');
        renderApplicantList(pending, document.getElementById(`pending-list-${adventureId}`));
        renderApplicantList(approved, document.getElementById(`approved-list-${adventureId}`));
    }

    async function checkMasterApplicationStatus(user) {
        const { data, error } = await supabaseClient.from('master_applications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1);
        if(error) {
            console.error("Erro ao checar candidatura: ", error);
            if (error.code === '42P01') { renderMasterApplicationForm(user); }
            return;
        }
        const statusTranslations = { pending: 'Pendente', approved: 'Aprovada', rejected: 'Rejeitada' };
        if (data && data.length > 0) {
            const lastApp = data[0];
            const translatedStatus = statusTranslations[lastApp.status] || lastApp.status;
            masterApplicationContent.innerHTML = `<p>Sua última candidatura está com o status: <strong>${translatedStatus}</strong></p>`;
        } else {
            renderMasterApplicationForm(user);
        }
    }

    function renderMasterApplicationForm(user) {
        // Lógica do formulário de candidatura a mestre...
    }

    
    myAdventuresList.addEventListener('click', (e) => {
        const header = e.target.closest('.my-adventure-header');
        const actionButton = e.target.closest('.btn-applicant-action, .btn-adventure-action');
        const chevron = e.target.closest('.fa-chevron-down');

        if (actionButton) {
            e.stopPropagation(); 
            const adventureId = actionButton.dataset.adventureId;

           
            if (actionButton.classList.contains('btn-adventure-action')) {
                if (actionButton.classList.contains('finalize')) {
                    handleAdventureStatusChange(adventureId, 'finalizada');
                } else if (actionButton.classList.contains('unarchive')) {
                    handleAdventureStatusChange(adventureId, 'ativa');
                } else if (actionButton.classList.contains('delete-permanent')) {
                    handlePermanentDelete(adventureId);
                }
                return;
            }
            
            if (actionButton.classList.contains('btn-applicant-action')) {
                const inscricaoId = actionButton.dataset.inscricaoId;
                const action = actionButton.dataset.action;
                const adventureHeader = actionButton.closest('.my-adventure-item').querySelector('.my-adventure-header');
                handleApplicationAction(inscricaoId, action, adventureHeader);
                return;
            }
        }
        
        if (header && chevron) {
            const adventureId = header.dataset.adventureId;
            toggleSubscribers(adventureId, header);
        }
    });

    myAdventuresList.addEventListener('submit', (e) => {
        if (e.target.matches('.subscriber-search-form')) {
            e.preventDefault();
            const adventureId = e.target.dataset.adventureId;
            const searchTerm = e.target.querySelector('input[type="search"]').value.trim();
            handleSearchSubscribers(adventureId, searchTerm);
        }
    });

    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newUsername = usernameInput.value;
        const { error } = await supabaseClient.from('profiles').update({ username: newUsername, updated_at: new Date() }).eq('id', currentUser.id);
        if (error) { showMessage('Erro ao atualizar o perfil: ' + error.message, true); } else {
            showMessage('Perfil atualizado com sucesso!');
            usernameDisplay.textContent = newUsername;
        }
    });

    btnChangeAvatar.addEventListener('click', () => { avatarUpload.click(); });

    avatarUpload.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file || !currentUser) return;
        const filePath = `${currentUser.id}/${Date.now()}`;
        const { error: uploadError } = await supabaseClient.storage.from('avatars').upload(filePath, file);
        if (uploadError) { showMessage('Erro ao enviar a imagem.', true); return; }
        const { data: { publicUrl } } = supabaseClient.storage.from('avatars').getPublicUrl(filePath);
        const { error: updateError } = await supabaseClient.from('profiles').update({ avatar_url: publicUrl }).eq('id', currentUser.id);
        if (updateError) { showMessage('Erro ao salvar o avatar no perfil.', true); } else {
            avatarImg.src = publicUrl;
            showMessage('Avatar atualizado!');
        }
    });

    initializeProfilePage();
});