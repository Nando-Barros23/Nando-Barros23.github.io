document.addEventListener('DOMContentLoaded', async () => {
    // 1. INICIALIZAÇÃO
    const { createClient } = supabase;
    const SUPABASE_URL = 'https://zslokbeazldiwmblahps.supabase.co';
    const SUPABASE_ANON_KEY = 'SUA_CHAVE_ANON_PUBLICA_VEM_AQUI'; // <-- COLE SUA CHAVE AQUI
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const adventureForm = document.getElementById('adventure-form');
    const adventureId = new URLSearchParams(window.location.search).get('id');
    let currentUser = null;

    // Inicializa o editor de Markdown
    const easyMDE = new EasyMDE({ element: document.getElementById('descricao') });

    // Função para mostrar notificações
    function showToast(message, type = 'success') { /* ... (código da função showToast) ... */ }

    // Função para preencher o formulário com dados existentes
    async function populateForm() {
        const { data, error } = await supabaseClient.from('aventuras').select('*').eq('id', adventureId).single();

        if (error || !data) {
            console.error('Erro ao buscar aventura para edição:', error);
            document.querySelector('.edit-container').innerHTML = '<h2>Aventura não encontrada ou você não tem permissão para editá-la.</h2>';
            return;
        }

        // Preenche os campos do formulário
        document.getElementById('titulo').value = data.titulo;
        document.getElementById('sistema_rpg').value = data.sistema_rpg;
        document.getElementById('nome_mestre').value = data.nome_mestre;
        document.getElementById('nivel').value = data.nivel;
        document.getElementById('vagas').value = data.vagas;
        document.getElementById('alerta_gatilho').value = data.alerta_gatilho;
        easyMDE.value(data.descricao); // Preenche o editor de Markdown
        
        // Marca o radio button correto
        if (data.tipo_jogo === 'Campanha') {
            document.getElementById('tipo_campanha').checked = true;
        } else {
            document.getElementById('tipo_oneshot').checked = true;
        }
    }

    // Listener para o envio do formulário
    adventureForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formButton = adventureForm.querySelector('button');
        formButton.disabled = true;
        formButton.textContent = 'Salvando...';

        const formData = new FormData(adventureForm);
        const updatedAdventure = {
            titulo: formData.get('titulo'),
            sistema_rpg: formData.get('sistema_rpg'),
            nome_mestre: formData.get('nome_mestre'),
            vagas: parseInt(formData.get('vagas')),
            descricao: easyMDE.value(),
            alerta_gatilho: formData.get('alerta_gatilho'),
            tipo_jogo: formData.get('tipo_jogo'),
            nivel: formData.get('nivel'),
        };

        const { error } = await supabaseClient.from('aventuras').update(updatedAdventure).eq('id', adventureId);

        if (error) {
            showToast('Erro ao salvar as alterações.', 'error');
            console.error(error);
        } else {
            showToast('Aventura atualizada com sucesso!', 'success');
            setTimeout(() => {
                window.location.href = `aventura.html?id=${adventureId}`; // Volta para a página de detalhes
            }, 1500);
        }

        formButton.disabled = false;
        formButton.textContent = 'Salvar Alterações';
    });
    
    // Inicialização da página
    const { data: { session } } = await supabaseClient.auth.getSession();
    currentUser = session?.user;
    if (currentUser && adventureId) {
        populateForm();
    } else {
        window.location.href = 'index.html';
    }
});
