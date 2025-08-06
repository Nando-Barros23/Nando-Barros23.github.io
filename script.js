// --- 1. CONEXÃO COM O SUPABASE ---
// Substitua pelas suas chaves do Supabase!
const SUPABASE_URL = 'SUA_URL_DO_PROJETO_AQUI'; // Cole sua URL aqui
const SUPABASE_ANON_KEY = 'SUA_CHAVE_ANON_PUBLICA_AQUI'; // Cole sua chave 'anon' aqui

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
        card.innerHTML = `
            <h3>${adventure.titulo}</h3>
            <p><span class="label">Sistema:</span> ${adventure.sistema_rpg}</p>
            <p><span class="label">Mestre:</span> ${adventure.nome_mestre}</p>
            <p><span class="label">Vagas:</span> ${adventure.vagas}</p>
            <p><span class="label">Descrição:</span> ${adventure.descricao}</p>
            <p><span class="label">Contato:</span> ${adventure.contato}</p>
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

    // Pega os dados do formulário
    const newAdventure = {
        titulo: formData.get('titulo'),
        sistema_rpg: formData.get('sistema_rpg'),
        nome_mestre: formData.get('nome_mestre'),
        vagas: parseInt(formData.get('vagas')), // Converte para número
        descricao: formData.get('descricao'),
        contato: formData.get('contato')
    };

    // Envia os dados para o Supabase
    const { data, error } = await supabase
        .from('aventuras')
        .insert([newAdventure]);
        
    if (error) {
        console.error('Erro ao inserir aventura:', error);
        alert('Ocorreu um erro ao publicar sua aventura.');
    } else {
        alert('Aventura publicada com sucesso!');
        form.reset(); // Limpa o formulário
        loadAdventures(); // Recarrega a lista de aventuras
    }
});


// --- 4. INICIALIZAÇÃO ---

// Carrega as aventuras assim que a página é aberta
document.addEventListener('DOMContentLoaded', () => {
    loadAdventures();
});
