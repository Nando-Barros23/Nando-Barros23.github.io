// --- 1. CONEXÃO COM O SUPABASE ---
// A linha abaixo pega a função para criar o cliente do Supabase
const { createClient } = supabase;

// Suas chaves de conexão inseridas aqui
const SUPABASE_URL = 'https://zslokbeazldiwmblahps.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzbG9rYmVhemxkaXdtYmxhaHBzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0NDA2NDcsImV4cCI6MjA3MDAxNjY0N30.UfTi-SBzIa9Wn_uEnQiW5PAiTECSVimnGGVJ1IFABDQ';

// Cria o cliente do Supabase com um nome de variável corrigido
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


// --- 2. ELEMENTOS DO DOM ---
const adventuresGrid = document.getElementById('adventures-grid');
const adventureForm = document.getElementById('adventure-form');


// --- 3. FUNÇÕES ---

/**
 * Carrega as aventuras do banco de dados e as exibe na tela.
 */
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
    const formData = new FormData(form);

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

    const { data, error } = await supabaseClient
        .from('aventuras')
        .insert([newAdventure]);
        
    if (error) {
        console.error('Erro ao inserir aventura:', error);
        alert('Ocorreu um erro ao publicar sua aventura. Verifique o console para mais detalhes (F12).');
    } else {
        alert('⚠️ Aventura publicada com sucesso!');
        form.reset();
        loadAdventures();
    }
});


// --- 4. INICIALIZAÇÃO ---

document.addEventListener('DOMContentLoaded', () => {
    loadAdventures();
});
