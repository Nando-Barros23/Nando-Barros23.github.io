document.addEventListener('DOMContentLoaded', () => {
    // A conexão com o Supabase
    const { createClient } = supabase;
    const SUPABASE_URL = 'https://zslokbeazldiwmblahps.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzbG9rYmVhemxkaXdtYmxhaHBzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0NDA2NDcsImV4cCI6MjA3MDAxNjY0N30.UfTi-SBzIa9Wn_uEnQiW5PAiTECSVimnGGVJ1IFABDQ';
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Seletores de Elementos
    const adventuresGrid = document.getElementById('adventures-grid');
    const adventureForm = document.getElementById('adventure-form');
    const userArea = document.getElementById('user-area');
    const publishSection = document.querySelector('.painel-lateral');
    const searchBar = document.getElementById('search-bar'); // Procura a barra

    // Função para lidar com o estado de autenticação
    const handleAuthStateChange = async (event, session) => {
        const user = session?.user;
        if (user) {
            const { data: profile, error } = await supabaseClient.from('profiles').select('username, role').eq('id', user.id).single();
            if (error && error.code !== 'PGRST116') {
                console.error("Erro ao buscar perfil:", error);
            }
            
            const displayName = profile?.username || user.email.split('@')[0];
            userArea.innerHTML = `
                <a href="profile.html" class="btn-primario" style="text-decoration: none; width: auto; padding: 0.5rem 1rem; font-size: 1rem; line-height: 1.2;">Olá, ${displayName}</a>
                <button id="logout-button" class="btn-primario" style="width: auto; padding: 0.5rem 1rem;">Sair</button>
            `;
            document.getElementById('logout-button').addEventListener('click', async () => {
                await supabaseClient.auth.signOut();
            });
            if (profile && profile.role === 'master') {
                if(publishSection) publishSection.style.display = 'block';
            } else {
                if(publishSection) publishSection.style.display = 'none';
            }
        } else {
            userArea.innerHTML = `<a href="login.html" class="btn-primario" style="text-decoration: none;">Login / Cadastrar</a>`;
            if(publishSection) publishSection.style.display = 'none';
        }
    };

    // Função para carregar as aventuras
    async function loadAdventures() {
        if (!adventuresGrid) return; // Só executa se a grade de aventuras existir na página
        const { data, error } = await supabaseClient.from('aventuras').select('*').order('created_at', { ascending: false });
        if (error) {
            console.error('Erro ao buscar aventuras:', error);
            return;
        }
        adventuresGrid.innerHTML = '';
        data.forEach(adventure => {
            const cardLink = document.createElement('a');
            cardLink.href = `aventura.html?id=${adventure.id}`; // Adiciona o link
            cardLink.classList.add('adventure-card-link'); // Adiciona a classe para estilo

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
                    <p><strong>Alerta de Gatilho:</strong> ${adventure.alerta_gatilho}</p>
                    <br>
                    <p>${adventure.descricao}</p>
                </div>
            `;
            cardLink.appendChild(card); // Coloca o card dentro do link
            adventuresGrid.appendChild(cardLink); // Adiciona o link à grade
        });
    }

    // CORREÇÃO APLICADA AQUI:
    // Só adiciona o "ouvinte" de eventos se a barra de pesquisa existir nesta página.
    if (searchBar) {
        searchBar.addEventListener('input', async (event) => {
            const searchTerm = event.target.value.toLowerCase();
            const { data, error } = await supabaseClient.from('aventuras').select('*').order('created_at', { ascending: false });
            if (error) {
                console.error('Erro ao buscar aventuras para filtrar:', error);
                return;
            }
            const filteredAdventures = data.filter(adv => 
                adv.titulo.toLowerCase().includes(searchTerm) || 
                adv.sistema_rpg.toLowerCase().includes(searchTerm) || 
                adv.nome_mestre.toLowerCase().includes(searchTerm)
            );
            loadAdventures(filteredAdventures);
        });
    }

    if (adventureForm) {
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
            const imageFile = document.getElementById('adventure-image').files[0];
            let imageUrl = null;
            if (imageFile) {
                const filePath = `${user.id}/${Date.now()}-${imageFile.name}`;
                const { error: uploadError } = await supabaseClient.storage.from('adventure-images').upload(filePath, imageFile);
                if (uploadError) {
                    console.error('Erro no upload:', uploadError);
                    alert('Houve um erro ao enviar a imagem.');
                    formButton.disabled = false;
                    formButton.textContent = 'Publicar Aventura';
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
    }

    // Inicialização da Página
    loadAdventures();
    supabaseClient.auth.onAuthStateChange(handleAuthStateChange);
});
