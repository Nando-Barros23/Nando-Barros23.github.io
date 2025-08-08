// --- 1. CONEXÃO COM O SUPABASE ---
const SUPABASE_URL = 'https://zslokbeazldiwmblahps.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzbG9rYmVhemxkaXdtYmxhaHBzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0NDA2NDcsImV4cCI6MjA3MDAxNjY0N30.UfTi-SBzIa9Wn_uEnQiW5PAiTECSVimnGGVJ1IFABDQ';
// CORREÇÃO: Usamos o objeto global 'supabase' para criar nosso cliente com um novo nome
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- 2. ELEMENTOS DO DOM ---
const adventuresGrid = document.getElementById('adventures-grid');
const adventureForm = document.getElementById('adventure-form');
const userArea = document.getElementById('user-area');
const publishSection = document.querySelector('.painel-lateral');

// --- 3. LÓGICA PRINCIPAL ---

// Atualiza a UI do cabeçalho com base no status de login
async function updateUserUI() {
    const { data: { user } } = await supabaseClient.auth.getUser();

    if (user) {
        // Se o usuário está logado, busca o perfil dele
        const { data: profile } = await supabaseClient.from('profiles').select('username, role').eq('id', user.id).single();
        const displayName = profile?.username || user.email.split('@')[0];
        
        userArea.innerHTML = `
            <span>Olá, <a href="profile.html" style="color: var(--cor-primaria); text-decoration: none;">${displayName}</a></span>
            <button id="logout-button" class="btn-primario" style="width: auto; padding: 0.5rem 1rem;">Sair</button>
        `;
        document.getElementById('logout-button').addEventListener('click', async () => {
            await supabaseClient.auth.signOut();
            window.location.reload();
        });

        // Mostra ou esconde o painel de publicação com base no papel (role) do usuário
        if (profile && profile.role === 'master') {
            publishSection.style.display = 'block';
        } else {
            publishSection.style.display = 'none';
        }
    } else {
        // Se o usuário não está logado
        userArea.innerHTML = `<a href="login.html" class="btn-primario" style="text-decoration: none;">Login / Cadastrar</a>`;
        publishSection.style.display = 'none';
    }
}

// Carrega as aventuras do banco de dados para o mural
async function loadAdventures() {
    const { data, error } = await supabaseClient
        .from('aventuras')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Erro ao buscar aventuras:', error);
        return;
    }
    adventuresGrid.innerHTML = '';
    data.forEach(adventure => {
        const card = document.createElement('div');
        card.classList.add('adventure-card');
        
        const placeholderImg = 'https://i.imgur.com/Q3j5eH0.png'; // Imagem padrão
        card.innerHTML = `
            <img src="${adventure.image_url || placeholderImg}" alt="Imagem da Aventura" class="adventure-card-image">
            <div class="adventure-card-content">
                <h4>${adventure.titulo}</h4>
                <p><strong>Mestre:</strong> ${adventure.nome_mestre}</p>
                <p><strong>Sistema:</strong> ${adventure.sistema_rpg}</p>
                <p><strong>Tipo:</strong> ${adventure.tipo_jogo}</p>
                <p><strong>Nível:</strong> ${adventure.nivel}</p>
                <p><strong>Vagas:</strong> ${adventure.vagas}</p>
                <p><strong>Alerta de Gatilho:</strong> ${adventure.alerta_gatilho}</p>
                <br>
                <p>${adventure.descricao}</p>
            </div>
        `;
        adventuresGrid.appendChild(card);
    });
}

// Lida com o envio do formulário de novas aventuras
adventureForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formButton = adventureForm.querySelector('button');
    formButton.disabled = true;
    formButton.textContent = 'Publicando...';

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
        alert('Você precisa estar logado para publicar.');
        formButton.disabled = false;
        formButton.textContent = 'Publicar Aventura';
        return;
    }

    // Lógica para upload da imagem da aventura
    const imageFile = document.getElementById('adventure-image').files[0];
    let imageUrl = null;

    if (imageFile) {
        const filePath = `public/${user.id}-${Date.now()}`;
        const { error: uploadError } = await supabaseClient.storage
            .from('adventure-images')
            .upload(filePath, imageFile);

        if (uploadError) {
            console.error('Erro no upload:', uploadError);
            alert('Houve um erro ao enviar a imagem.');
            formButton.disabled = false;
            formButton.textContent = 'Publicar Aventura';
            return;
        }

        const { data: publicUrlData } = supabaseClient.storage
            .from('adventure-images')
            .getPublicUrl(filePath);
        
        imageUrl = publicUrlData.publicUrl;
    }

    const formData = new FormData(adventureForm);
    const newAdventure = {
        titulo: formData.get('titulo'),
        sistema_rpg: formData.get('sistema_rpg'),
        nome_mestre: formData.get('nome_mestre'),
        vagas: parseInt(formData.get('vagas')),
        descricao: formData.get('descricao'),
        alerta_gatilho: formData.get('alerta_gatilho'),
        tipo_jogo: formData.get('tipo_jogo'),
        nivel: formData.get('nivel'),
        user_id: user.id,
        image_url: imageUrl
    };

    const { error } = await supabaseClient.from('aventuras').insert([newAdventure]);
        
    if (error) {
        console.error('Erro ao inserir aventura:', error);
        alert('Ocorreu um erro ao publicar sua aventura.');
    } else {
        alert('⚠️ Aventura publicada com sucesso!');
        adventureForm.reset();
        loadAdventures();
    }
    formButton.disabled = false;
    formButton.textContent = 'Publicar Aventura';
});


// --- 4. INICIALIZAÇÃO ---
// Roda as funções principais quando a página carrega
document.addEventListener('DOMContentLoaded', () => {
    updateUserUI();
    loadAdventures();
});
