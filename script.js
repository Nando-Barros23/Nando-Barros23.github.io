// Arquivo: script.js (Código Completo Corrigido)

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

    // Variável global para guardar o estado do usuário. Essencial para o código funcionar!
    let currentUser = null;

    // 2. FUNÇÕES PRINCIPAIS

    /**
     * Carrega as aventuras do banco de dados e exibe na tela.
     */
    async function loadAdventures() {
        // Corrigido para buscar da tabela 'aventuras'
        const { data, error } = await supabaseClient.from('aventuras').select('*').order('created_at', { ascending: false });
        if (error) {
            console.error('Erro ao buscar aventuras:', error);
            return;
        }
        adventuresGrid.innerHTML = ''; // Limpa a grade antes de adicionar novos cards
        data.forEach(adventure => {
            const card = document.createElement('div');
            card.classList.add('adventure-card');
            const placeholderImg = 'https://i.imgur.com/Q3j5eH0.png'; // Imagem padrão
            // Preenche o card com os dados da aventura
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

    /**
     * Atualiza a interface do usuário (botões, painel do mestre) com base no estado de login.
     * @param {object|null} user - O objeto do usuário do Supabase, ou null se não estiver logado.
     */
    async function updateUI(user) {
        if (user) {
            // Se o usuário está logado, busca o perfil para obter o nome e a role
            const { data: profile, error } = await supabaseClient.from('profiles').select('username, role').eq('id', user.id).single();
            if (error && error.code !== 'PGRST116') { // Ignora erro se o perfil não for encontrado
                console.error("Erro ao buscar perfil:", error);
            }
            
            // Define o nome de exibição (username do perfil ou parte do email)
            const displayName = profile?.username || user.email.split('@')[0];

            // Atualiza a área do usuário com o nome e o botão de sair
            userArea.innerHTML = `
                <a href="profile.html" class="btn-primario" style="text-decoration: none; width: auto; padding: 0.5rem 1rem; font-size: 1rem; line-height: 1.2;">Olá, ${displayName}</a>
                <button id="logout-button" class="btn-primario" style="width: auto; padding: 0.5rem 1rem;">Sair</button>
            `;
            document.getElementById('logout-button').addEventListener('click', async () => {
                await supabaseClient.auth.signOut();
            });

            // Mostra ou esconde o painel de publicação de aventura se o usuário for 'master'
            if (profile && profile.role === 'master') {
                publishSection.style.display = 'block';
            } else {
                publishSection.style.display = 'none';
            }
        } else {
            // Se não há usuário logado, mostra o botão de login/cadastro e esconde o painel de mestre
            userArea.innerHTML = `<a href="login.html" class="btn-primario" style="text-decoration: none;">Login / Cadastrar</a>`;
            publishSection.style.display = 'none';
        }
    }


    // 3. EVENT LISTENERS (OUVINTES DE EVENTOS)

    /**
     * Listener para o envio do formulário de publicação de aventura.
     */
    adventureForm.addEventListener('submit', async (event) => {
        event.preventDefault(); // Impede o recarregamento da página
        
        // CORREÇÃO CRÍTICA: Usa a variável 'currentUser' que é sempre atualizada, em vez de buscar na hora.
        if (!currentUser) {
            alert('Você precisa estar logado para publicar.');
            return;
        }

        const formButton = adventureForm.querySelector('button');
        formButton.disabled = true;
        formButton.textContent = 'Publicando...';

        // Lógica para upload de imagem
        const imageFile = document.getElementById('adventure-image').files[0];
        let imageUrl = null;
        if (imageFile) {
            const filePath = `${currentUser.id}/${Date.now()}-${imageFile.name}`;
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

        // Monta o objeto da nova aventura com os dados do formulário
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
            user_id: currentUser.id, // USA O ID DO USUÁRIO LOGADO
            image_url: imageUrl
        };

        // Insere a nova aventura no banco de dados
        const { error } = await supabaseClient.from('aventuras').insert([newAdventure]);
        if (error) {
            console.error('Erro ao inserir aventura:', error);
            alert('Ocorreu um erro ao publicar sua aventura.');
        } else {
            alert('Aventura publicada com sucesso!');
            adventureForm.reset();
            loadAdventures(); // Recarrega a lista de aventuras para mostrar a nova
        }

        // Reativa o botão do formulário
        formButton.disabled = false;
        formButton.textContent = 'Publicar Aventura';
    });


    // 4. INICIALIZAÇÃO DA PÁGINA

    /**
     * Listener principal do Supabase. Reage a qualquer mudança de login (entrar, sair, recarregar a página).
     * Esta é a correção mais importante.
     */
    supabaseClient.auth.onAuthStateChange((event, session) => {
        currentUser = session?.user || null; // Atualiza a variável global 'currentUser'
        updateUI(currentUser); // Atualiza a interface com base no novo estado
    });

    // Carrega as aventuras existentes assim que a página é aberta
    loadAdventures();
});
