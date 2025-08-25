document.addEventListener('DOMContentLoaded', async () => {
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

    // INICIALIZA O EDITOR DE MARKDOWN NA CAIXA DE DESCRIÇÃO
    const easyMDE = new EasyMDE({
        element: document.getElementById('descricao'),
        toolbar: ["bold", "italic", "heading", "|", "quote", "unordered-list", "ordered-list", "|", "preview"],
        placeholder: "Use Markdown para formatar sua aventura...\n# Título Principal\n## Subtítulo\n**Texto em negrito**",
        spellChecker: false,
        status: false,
    });

    // 2. FUNÇÕES PRINCIPAIS
    function showToast(message, type = 'success') {
        const toastContainer = document.getElementById('toast-container');
        if (!toastContainer) return;
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        toastContainer.appendChild(toast);
        setTimeout(() => { toast.classList.add('show'); }, 10);
        setTimeout(() => {
            toast.classList.remove('show');
            toast.addEventListener('transitionend', () => toast.remove());
        }, 3000);
    }

    function renderAdventures(adventures) {
        adventuresGrid.innerHTML = '';
        if (adventures.length === 0) {
            adventuresGrid.innerHTML = searchBar.value
                ? '<p>Nenhuma aventura encontrada com este termo.</p>'
                : '<p>Ainda não há nenhuma aventura publicada. Seja o primeiro!</p>';
        }
        adventures.forEach(adventure => {
            const cardLink = document.createElement('a');
            cardLink.href = `aventura.html?id=${adventure.id}`;
            cardLink.classList.add('adventure-card-link');
            const card = document.createElement('div');
            card.classList.add('adventure-card');
            const placeholderImg = 'https://i.imgur.com/Q3j5eH0.png';
            card.innerHTML = `
                <img src="${adventure.image_url || placeholderImg}" alt="Imagem da Aventura" class="adventure-card-image">
                <div class="adventure-card-content">
                    <h4>${adventure.titulo}</h4>
                    <p><strong>Mestre:</strong> ${adventure.nome_mestre}</p>
                    <p><strong>Sistema:</strong> ${adventure.sistema_rpg}</p>
                    <p><strong>Alerta de Gatilho ⚠️:</strong> ${adventure.alerta_gatilho}</p>
                </div>
            `;
            cardLink.appendChild(card);
            adventuresGrid.appendChild(cardLink);
        });
    }

    async function loadAdventures() {
        adventuresGrid.innerHTML = '<p>Carregando aventuras...</p>';
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
            const { data: profile } = await supabaseClient.from('profiles').select('username, role').eq('id', user.id).single();
            const displayName = profile?.username || user.email.split('@')[0];
            userArea.innerHTML = `
                <a href="profile.html" class="btn-primario">Olá, ${displayName}</a>
                <button id="logout-button" class="btn-primario">Sair</button>
            `;
            document.getElementById('logout-button').addEventListener('click', () => { supabaseClient.auth.signOut(); });
            
            if (profile && profile.role && profile.role.trim().toLowerCase() === 'master') {
                publishSection.style.display = 'block';
            } else {
                publishSection.style.display = 'none';
            }
        } else {
            userArea.innerHTML = `<a href="login.html" class="btn-primario">Login / Cadastrar</a>`;
            publishSection.style.display = 'none';
        }
    }
    
    searchBar.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filteredAdventures = allAdventures.filter(adventure => 
            adventure.titulo.toLowerCase().includes(searchTerm) ||
            adventure.sistema_rpg.toLowerCase().includes(searchTerm) ||
            adventure.nome_mestre.toLowerCase().includes(searchTerm)
        );
        renderAdventures(filteredAdventures);
    });

    adventureForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!currentUser) {
            showToast('Você precisa estar logado para publicar.', 'error');
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
                showToast('Houve um erro ao enviar a imagem.', 'error');
                formButton.disabled = false; formButton.textContent = 'Publicar Aventura';
                return;
            }
            const { data: publicUrlData } = supabaseClient.storage.from('adventure-images').getPublicUrl(filePath);
            imageUrl = publicUrlData.publicUrl;
        }
        
        const formData = new FormData(adventureForm);
        const newAdventure = {
            titulo: formData.get('titulo'),
            sistema_rpg: formData.get('sistema_rpg'),
            nome_mestre: formData.get('nome_mestre'),
            vagas: parseInt(formData.get('vagas')),
            descricao: easyMDE.value(),
            alerta_gatilho: formData.get('alerta_gatilho'),
            tipo_jogo: formData.get('tipo_jogo'),
            nivel: formData.get('nivel'),
            // CORREÇÃO APLICADA AQUI
            usuario_id: currentUser.id,
            image_url: imageUrl
        };
        
        const { error } = await supabaseClient.from('aventuras').insert([newAdventure]);
        if (error) {
            console.error('Erro ao inserir aventura:', error);
            showToast('Ocorreu um erro ao publicar sua aventura.', 'error');
        } else {
            showToast('Aventura publicada com sucesso!', 'success');
            adventureForm.reset();
            easyMDE.value("");
            loadAdventures();
        }
        formButton.disabled = false; formButton.textContent = 'Publicar Aventura';
    });

    supabaseClient.auth.onAuthStateChange((_event, session) => {
        currentUser = session?.user || null;
        updateUI(currentUser);
    });

    loadAdventures();
});
