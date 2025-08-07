// script.js ATUALIZADO

// --- 1. CONEXÃO COM O SUPABASE ---
// ... (mantenha sua conexão com o Supabase aqui) ...

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

        // CARD ATUALIZADO PARA EXIBIR OS NOVOS CAMPOS
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
    event.preventDefault();

    const form = event.target;
    // Usar new FormData(form) é mais eficiente com o atributo 'name' nos inputs
    const formData = new FormData(form); 

    // Pega os dados do formulário, incluindo os novos campos
    const newAdventure = {
        titulo: formData.get('titulo'),
        sistema_rpg: formData.get('sistema_rpg'),
        nome_mestre: formData.get('nome_mestre'),
        vagas: parseInt(formData.get('vagas')),
        descricao: formData.get('descricao'),
        alerta_gatilho: formData.get('alerta_gatilho'), // Campo alterado
        tipo_jogo: formData.get('tipo_jogo'),         // Novo campo
        nivel: formData.get('nivel')                  // Novo campo
    };

    const { data, error } = await supabase
        .from('aventuras')
        .insert([newAdventure]);
        
    if (error) {
        console.error('Erro ao inserir aventura:', error);
        alert('Ocorreu um erro ao publicar sua aventura.');
    } else {
        // ALERTA DE SUCESSO COM O EMOJI
        alert('⚠️ Aventura publicada com sucesso!');
        form.reset();
        loadAdventures();
    }
});


// --- 4. INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
    loadAdventures();
});
