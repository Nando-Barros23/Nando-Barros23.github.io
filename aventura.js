document.addEventListener('DOMContentLoaded', () => {
    // 1. INICIALIZAÇÃO
    const { createClient } = supabase;
    const SUPABASE_URL = 'https://zslokbeazldiwmblahps.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzbG9rYmVhemxkaXdtYmxhaHBzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0NDA2NDcsImV4cCI6MjA3MDAxNjY0N30.UfTi-SBzIa9Wn_uEnQiW5PAiTECSVimnGGVJ1IFABDQ'; // Lembre-se de usar sua chave
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Seletores de Elementos
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
    
    // Seletores da nova seção do mestre
    const myAdventuresSection = document.getElementById('my-adventures-section');
    const myAdventuresList = document.getElementById('my-adventures-list');

    let currentUser = null;

    // 2. FUNÇÕES PRINCIPAIS
    
    // Mostra mensagens de feedback
    function showMessage(message, isError = false) {
        if (!messageArea) return;
        messageArea.textContent = message;
        messageArea.style.backgroundColor = isError ? '#f8d7da' : '#d4edda';
        messageArea.style.color = isError ? '#721c24' : '#155724';
        messageArea.style.display = 'block';
        setTimeout(() => { messageArea.style.display = 'none'; }, 3000);
    }
    
    // Carrega os dados principais do perfil
    async function loadProfileData(user) {
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
            
            // Lógica para mostrar as seções corretas
            if (data.role === 'master') {
                masterApplicationSection.style.display = 'none'; // Esconde candidatura
                myAdventuresSection.style.display = 'block'; // Mostra painel do mestre
                loadMyAdventures(user); // Carrega suas aventuras
            } else {
                masterApplicationSection.style.display = 'block'; // Mostra candidatura
                myAdventuresSection.style.display = 'none'; // Esconde painel do mestre
                checkMasterApplicationStatus(user);
            }
        }
    }

    // Carrega as aventuras publicadas pelo mestre
    async function loadMyAdventures(user) {
        const { data: adventures, error } = await supabaseClient
            .from('aventuras')
            .select('id, titulo')
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
            item.innerHTML = `
                <div class="my-adventure-header" data-adventure-id="${adventure.id}">
                    <span>${adventure.titulo}</span>
                    <i class="fas fa-chevron-down"></i>
                </div>
                <div class="subscribers-list" id="subscribers-${adventure.id}"></div>
            `;
            myAdventuresList.appendChild(item);
        });
    }
    
    // Carrega e mostra/esconde os inscritos de uma aventura
    async function toggleSubscribers(adventureId, headerElement) {
        const listDiv = document.getElementById(`subscribers-${adventureId}`);
        const icon = headerElement.querySelector('i');

        if (listDiv.style.display === 'block') {
            listDiv.style.display = 'none';
            icon.style.transform = 'rotate(0deg)';
            return;
        }

        listDiv.innerHTML = '<p>Carregando inscritos...</p>';
        listDiv.style.display = 'block';
        icon.style.transform = 'rotate(180deg)';

        const { data: subscribers, error } = await supabaseClient
            .from('inscricoes')
            .select('profiles (id, username, avatar_url)')
            .eq('aventura_id', adventureId);

        if (error) {
            listDiv.innerHTML = '<p style="color: red;">Erro ao carregar inscritos.</p>';
            return;
        }
        
        if (subscribers.length === 0) {
            listDiv.innerHTML = '<p>Ainda não há jogadores inscritos.</p>';
            return;
        }

        listDiv.innerHTML = '';
        subscribers.forEach(sub => {
            const profile = sub.profiles;
            if (!profile) return; // Pula caso o perfil seja nulo
            const avatarUrl = profile.avatar_url || 'https://i.imgur.com/V4Rcl9o.png';
            const subscriberEl = document.createElement('div');
            subscriberEl.className = 'subscriber-item';
            subscriberEl.innerHTML = `
                <img src="${avatarUrl}" alt="Avatar">
                <span>${profile.username || 'Usuário sem nome'}</span>
            `;
            listDiv.appendChild(subscriberEl);
        });
    }
    
    // Funções de candidatura a mestre (código que já existia)
    async function checkMasterApplicationStatus(user) {
        // ... (código sem alterações)
    }

    function renderMasterApplicationForm(user) {
        // ... (código sem alterações)
    }


    // 3. EVENT LISTENERS
    
    myAdventuresList.addEventListener('click', (e) => {
        const header = e.target.closest('.my-adventure-header');
        if (header) {
            const adventureId = header.dataset.adventureId;
            toggleSubscribers(adventureId, header);
        }
    });

    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newUsername = usernameInput.value;
        const { error } = await supabaseClient.from('profiles').update({ username: newUsername, updated_at: new Date() }).eq('id', currentUser.id);
        if (error) {
            showMessage('Erro ao atualizar o perfil: ' + error.message, true);
        } else {
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
        if (uploadError) {
            showMessage('Erro ao enviar a imagem.', true);
            return;
        }
        const { data: { publicUrl } } = supabaseClient.storage.from('avatars').getPublicUrl(filePath);
        const { error: updateError } = await supabaseClient.from('profiles').update({ avatar_url: publicUrl }).eq('id', currentUser.id);
        if (updateError) {
            showMessage('Erro ao salvar o avatar no perfil.', true);
        } else {
            avatarImg.src = publicUrl;
            showMessage('Avatar atualizado!');
        }
    });


    // 4. INICIALIZAÇÃO
    supabaseClient.auth.onAuthStateChange((_event, session) => {
        currentUser = session?.user;
        if (currentUser) {
            // Atualiza o cabeçalho
            const { data: profile } = await supabaseClient.from('profiles').select('username').eq('id', currentUser.id).single();
            const displayName = profile?.username || currentUser.email.split('@')[0];
            userArea.innerHTML = `
                <a href="index.html" class="btn-primario" style="text-decoration: none; width: auto; padding: 0.5rem 1rem;">Página Principal</a> 
                <button id="logout-button" class="btn-primario" style="width: auto; padding: 0.5rem 1rem;">Sair</button>
            `;
            document.getElementById('logout-button').addEventListener('click', () => supabaseClient.auth.signOut());
            
            // Carrega o conteúdo principal da página de perfil
            loadProfileData(currentUser);
        } else {
            window.location.href = 'login.html';
        }
    });
});
