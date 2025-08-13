// Arquivo: script.js (Código Completo com Posição do Ícone Corrigida)

document.addEventListener('DOMContentLoaded', () => {
    // 1. INICIALIZAÇÃO E VARIÁVEIS
    const { createClient } = supabase;
    const SUPABASE_URL = 'https://zslokbeazldiwmblahps.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzbG9rYmVhemxkaXdtYmxhaHBzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0NDA2NDcsImV4cCI6MjA3MDAxNjY0N30.UfTi-SBzIa9Wn_uEnQiW5PAiTECSVimnGGVJ1IFABDQ';
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Seletores de elementos do HTML
    const adventuresGrid = document.getElementById('adventures-grid');
    const adventureForm = document.getElementById('adventure-form');
    const userArea = document.getElementById('user-area');
    const publishSection = document.querySelector('.painel-lateral');
    const searchBar = document.getElementById('search-bar');

    // Variáveis globais
    let currentUser = null;
    let allAdventures = [];

    // 2. FUNÇÕES PRINCIPAIS

    /**
     * Renderiza um array de aventuras na tela.
     * @param {Array} adventures - O array de aventuras a ser exibido.
     */
    function renderAdventures(adventures) {
        adventuresGrid.innerHTML = '';
        if (adventures.length === 0) {
            adventuresGrid.innerHTML = '<p>Nenhuma aventura encontrada.</p>';
        }
        adventures.forEach(adventure => {
            const card = document.createElement('div');
            card.classList.add('adventure-card');
            const placeholderImg = 'https://i.imgur.com/Q3j5eH0.png';
            
            // A ÚNICA MUDANÇA ESTÁ AQUI DENTRO, NA LINHA DO ALERTA DE GATILHO
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

    /**
     * Carrega as aventuras do banco de dados e as exibe.
     */
    async function loadAdventures() {
        const { data, error } = await supabaseClient.from('aventuras').select('*').order('created_at', { ascending: false });
        if (error) {
            console.error('Erro ao buscar aventuras:', error);
            return;
        }
        allAdventures = data;
        renderAdventures(allAdventures);
    }

    /**
     * Atualiza a interface do usuário com base no estado de login.
     */
    async function updateUI(user) {
        if (user) {
            const { data: profile, error } = await supabaseClient.from('profiles').select('username, role').eq('id', user.id).single();
            if (error && error.code !== 'PGRST116') {
                console.error("Erro ao buscar perfil:", error);
            }
            const displayName = profile?.username || user.email.split('@')[0];
            userArea.innerHTML = `
                <a href="profile.html" class="btn-primario">Olá, ${displayName}</a>
                <button id="logout-button" class="btn-primario">Sair</button>
            `;
            document.getElementById('logout-button').addEventListener('click', () => {
                supabaseClient.auth.signOut();
            });
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

    /**
     * Listener para o campo de pesquisa. Filtra as aventuras em tempo real.
     */
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

    /**
     * Listener para o formulário de publicação de aventura.
     */
    adventureForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!currentUser) {
            alert('Você precisa estar logado para publicar.');
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
                alert('Houve um erro ao enviar a imagem.');
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
            alert('Ocorreu um erro ao publicar sua aventura.');
        } else {
            alert('Aventura publicada com sucesso!');
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
