document.addEventListener('DOMContentLoaded', () => {
    // 1. INICIALIZAÇÃO E VARIÁVEIS
    const { createClient } = supabase;
    const SUPABASE_URL = 'https://zslokbeazldiwmblahps.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzbG9rYmVhemxkaXdtYmxhaHBzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0NDA2NDcsImV4cCI6MjA3MDAxNjY0N30.UfTi-SBzIa9Wn_uEnQiW5PAiTECSVimnGGVJ1IFABDQ';
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const adventuresGrid = document.getElementById('adventures-grid');
    const adventureForm = document.getElementById('adventure-form');
    const userArea = document.getElementById('user-area');
    const publishSection = document.querySelector('.painel-lateral');
    const searchBar = document.getElementById('search-bar');

    let currentUser = null;
    let allAdventures = [];

    // 2. FUNÇÕES PRINCIPAIS

    /**
     * NOVA FUNÇÃO: Mostra uma notificação toast na tela.
     * @param {string} message - A mensagem a ser exibida.
     * @param {string} type - O tipo de toast ('success' ou 'error').
     */
    function showToast(message, type = 'success') {
        const toastContainer = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`; // e.g., 'toast success'
        toast.textContent = message;

        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('show');
        }, 10);

        setTimeout(() => {
            toast.classList.remove('show');
            toast.addEventListener('transitionend', () => toast.remove());
        }, 3000); // O toast some depois de 3 segundos
    }

    function renderAdventures(adventures) {
        adventuresGrid.innerHTML = '';
        if (adventures.length === 0) {
            // Se a barra de pesquisa estiver vazia, significa que não há aventuras. Senão, é um resultado de busca.
            adventuresGrid.innerHTML = searchBar.value 
                ? '<p>Nenhuma aventura encontrada com este termo.</p>'
                : '<p>Ainda não há nenhuma aventura publicada. Seja o primeiro!</p>';
        }
        adventures.forEach(adventure => {
            const card = document.createElement('div');
            card.classList.add('adventure-card');
            const placeholderImg = 'https://i.imgur.com/Q3j5eH0.png';
            card.innerHTML = `
                <img src="${adventure.image_url || placeholderImg}" alt="Imagem da Aventura" class="adventure-card-image">
                <div class="adventure-card-content">
                    <h4>${adventure.titulo}</h4>
                    <p><strong>Mestre:</strong> ${adventure.nome_mestre}</p>
                    <p><strong>Sistema:</strong> ${adventure.sistema_rpg}</p>
                    <p><strong>Tipo:</strong> ${adventure.tipo_jogo}</p>
                    <p><strong>Nível:</strong> ${adventure.nivel}</p>
                    <p><strong>Vagas:</strong> ${adventure.vagas}</p>
                    <p><strong>Alerta de Gatilho ⚠️:</strong> ${adventure.alerta_gatilho}</p>
                    <br>
                    <p>${adventure.descricao}</p>
                </div>
            `;
            adventuresGrid.appendChild(card);
        });
    }

    async function loadAdventures() {
        // A mensagem "Carregando..." já está no HTML.
        const { data, error } = await supabaseClient.from('aventuras').select('*').order('created_at', { ascending: false });
        if (error) {
            console.error('Erro ao buscar aventuras:', error);
            adventuresGrid.innerHTML = '<p style="color: red;">Erro ao carregar as aventuras. Tente recarregar a página.</p>';
            return;
        }
        allAdventures = data;
        renderAdventures(allAdventures);
    }

    async function updateUI(user) {
        if (user) {
            const { data: profile, error } = await supabaseClient.from('profiles').select('username, role').eq('id', user.id).single();
            if (error && error.code !== 'PGRST116') { console.error("Erro ao buscar perfil:", error); }
            const displayName = profile?.username || user.email.split('@')[0];
            userArea.innerHTML = `
                <a href="profile.html" class="btn-primario">Olá, ${displayName}</a>
                <button id="logout-button" class="btn-primario">Sair</button>
            `;
            document.getElementById('logout-button').addEventListener('click', () => { supabaseClient.auth.signOut(); });
            if (profile && profile.role === 'master') {
                publishSection.style.display = 'block';
            } else {
                publishSection.style.display = 'none';
            }
        } else {
            userArea.innerHTML = `<a href="login.html" class="btn-primario">Login / Cadastrar</a>`;
            publishSection.style.display = 'none';
        }
    }

    // 3. EVENT LISTENERS
    
    searchBar.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filteredAdventures = allAdventures.filter(adventure => {
            const includesTitle = adventure.titulo.toLowerCase().includes(searchTerm);
            const includesSystem = adventure.sistema_rpg.toLowerCase().includes(searchTerm);
            const includesMaster = adventure.nome_mestre.toLowerCase().includes(searchTerm);
            return includesTitle || includesSystem || includesMaster;
        });
        renderAdventures(filteredAdventures);
    });

    adventureForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!currentUser) {
            showToast('Você precisa estar logado para publicar.', 'error'); // MUDANÇA: alert -> showToast
            return;
        }
        const formButton = adventureForm.querySelector('button');
        formButton.disabled = true;
        formButton.textContent = 'Publicando...';
        const imageFile = document.getElementById('adventure-image').files[0];
        let imageUrl = null;
        if (imageFile) {
            const filePath = `${currentUser.id}/${Date.now()}-${imageFile.name}`;
            const { error: uploadError } = await supabaseClient.storage.from('adventure-images').upload(filePath, imageFile);
            if (uploadError) {
                console.error('Erro no upload:', uploadError);
                showToast('Houve um erro ao enviar a imagem.', 'error'); // MUDANÇA: alert -> showToast
                formButton.disabled = false; formButton.textContent = 'Publicar Aventura';
                return;
            }
            const { data: publicUrlData } = supabaseClient.storage.from('adventure-images').getPublicUrl(filePath);
            imageUrl = publicUrlData.publicUrl;
        }
        const formData = new FormData(adventureForm);
        const newAdventure = {
            titulo: formData.get('titulo'), sistema_rpg: formData.get('sistema_rpg'), nome_mestre: formData.get('nome_mestre'), vagas: parseInt(formData.get('vagas')), descricao: formData.get('descricao'), alerta_gatilho: formData.get('alerta_gatilho'), tipo_jogo: formData.get('tipo_jogo'), nivel: formData.get('nivel'), user_id: currentUser.id, image_url: imageUrl
        };
        const { error } = await supabaseClient.from('aventuras').insert([newAdventure]);
        if (error) {
            console.error('Erro ao inserir aventura:', error);
            showToast('Ocorreu um erro ao publicar sua aventura.', 'error'); // MUDANÇA: alert -> showToast
        } else {
            showToast('Aventura publicada com sucesso!', 'success'); // MUDANÇA: alert -> showToast
            adventureForm.reset();
            loadAdventures();
        }
        formButton.disabled = false; formButton.textContent = 'Publicar Aventura';
    });

    // 4. INICIALIZAÇÃO DA PÁGINA
    supabaseClient.auth.onAuthStateChange((event, session) => {
        currentUser = session?.user || null;
        updateUI(currentUser);
    });

    loadAdventures();
});
