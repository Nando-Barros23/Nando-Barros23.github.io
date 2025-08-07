// --- 1. CONEXÃO COM O SUPABASE ---
// IMPORTANTE: Substitua pelas suas chaves do Supabase!
const SUPABASE_URL = 'zslokbeazldiwmblahps'; // Cole sua URL aqui
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzbG9rYmVhemxkaXdtYmxhaHBzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0NDA2NDcsImV4cCI6MjA3MDAxNjY0N30.UfTi-SBzIa9Wn_uEnQiW5PAiTECSVimnGGVJ1IFABDQ'; // Cole sua chave 'anon' aqui

// Cria o cliente do Supabase
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


// --- 2. ELEMENTOS DO DOM ---
const adventuresGrid = document.getElementById('adventures-grid');
const adventureForm = document.getElementById('adventure-form');


// --- 3. FUNÇÕES ---

/**
 * Carrega as aventuras do banco de dados e as exibe na tela.
 */
async function loadAdventures() {
    const { data, error } = await supabase
        .from('aventuras')
        .select('*') // Seleciona todas as colunas
        .order('created_at', { ascending: false }); // Ordena pelas mais recentes

    if (error) {
        console.error('Erro ao buscar aventuras:', error);
        return;
    }

    // Limpa o grid antes de adicionar novos cards
    adventuresGrid.innerHTML = '';

    // Cria um card para cada aventura
    data.forEach(adventure => {
        const card = document.createElement('div');
        card.classList.add('adventure-card'); 

        // Adiciona o conteúdo HTML do card com os campos atualizados
        card.innerHTML = `
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
 * Lida com o envio do formulário para criar uma nova aventura.
 */
adventureForm.addEventListener('submit', async (event) => {
    event.preventDefault(); // Impede o recarregamento da página

    const form = event.target;
    const formData = new FormData(form);

    // Pega os dados do formulário, incluindo os novos campos
    const newAdventure = {
        titulo: formData.get('titulo'),
        sistema_rpg: formData.get('sistema_rpg'),
        nome_mestre: formData.get('nome_mestre'),
        vagas: parseInt(formData.get('vagas')),
        descricao: formData.get('descricao'),
        alerta_gatilho: formData.get('alerta_gatilho'),
        tipo_jogo: formData.get('tipo_jogo'),
        nivel: formData.get('nivel')
    };

    // Envia os dados para o Supabase
    const { data, error } = await supabase
        .from('aventuras')
        .insert([newAdventure]);
        
    if (error) {
        console.error('Erro ao inserir aventura:', error);
        alert('Ocorreu um erro ao publicar sua aventura.');
    } else {
        // Alerta de sucesso com o emoji
        alert('⚠️ Aventura publicada com sucesso!');
        form.reset(); // Limpa o formulário
        loadAdventures(); // Recarrega a lista de aventuras
    }
});


// --- 4. INICIALIZAÇÃO ---

// Carrega as aventuras assim que a página é aberta
document.addEventListener('DOMContentLoaded', () => {
    loadAdventures();
});
