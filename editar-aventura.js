document.addEventListener('DOMContentLoaded', async () => {
    const { createClient } = supabase;
    const SUPABASE_URL = 'https://zslokbeazldiwmblahps.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzbG9rYmVhemxkaXdtYmxhaHBzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0NDA2NDcsImV4cCI6MjA3MDAxNjY0N30.UfTi-SBzIa9Wn_uEnQiW5PAiTECSVimnGGVJ1IFABDQ';
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const adventureForm = document.getElementById('adventure-form');
    const adventureId = new URLSearchParams(window.location.search).get('id');
    const userArea = document.getElementById('user-area');
    let currentUser = null;

    const onlineRadio = document.getElementById('modalidade_online');
    const presencialRadio = document.getElementById('modalidade_presencial');
    const locationContainer = document.getElementById('location-input-container');
    const locationInput = document.getElementById('localizacao');

    const easyMDE = new EasyMDE({ 
        element: document.getElementById('descricao'),
        toolbar: ["bold", "italic", "heading", "|", "quote", "unordered-list", "ordered-list", "|", "preview"],
        spellChecker: false,
        status: false,
    });
    
    onlineRadio.addEventListener('change', () => {
        if (onlineRadio.checked) {
            locationContainer.style.display = 'none';
            locationInput.value = '';
        }
    });
    presencialRadio.addEventListener('change', () => {
        if (presencialRadio.checked) {
            locationContainer.style.display = 'block';
        }
    });

    function showToast(message, type = 'success') {
        const toastContainer = document.getElementById('toast-container');
        if (!toastContainer) return;
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        toastContainer.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            toast.addEventListener('transitionend', () => toast.remove());
        }, 3000);
    }

    async function populateForm() {
        const { data, error } = await supabaseClient.from('aventuras').select('*').eq('id', adventureId).single();

        // NOTA: A CORREÇÃO ESTÁ AQUI.
        if (error || !data || (currentUser && data.usuario_id !== currentUser.id)) {
            console.error('Erro ao buscar aventura para edição ou sem permissão:', error);
            document.querySelector('.edit-container').innerHTML = '<h2>Aventura não encontrada ou você não tem permissão para editá-la.</h2>';
            return;
        }

        document.getElementById('titulo').value = data.titulo;
        document.getElementById('sistema_rpg').value = data.sistema_rpg;
        document.getElementById('nome_mestre').value = data.nome_mestre;
        document.getElementById('nivel').value = data.nivel;
        document.getElementById('vagas').value = data.vagas;
        document.getElementById('alerta_gatilho').value = data.alerta_gatilho;
        easyMDE.value(data.descricao);
        
        if (data.tipo_jogo === 'Campanha') {
            document.getElementById('tipo_campanha').checked = true;
        } else {
            document.getElementById('tipo_oneshot').checked = true;
        }

        if (data.modalidade === 'Presencial') {
            presencialRadio.checked = true;
            locationContainer.style.display = 'block';
            locationInput.value = data.localizacao || '';
        } else {
            onlineRadio.checked = true;
            locationContainer.style.display = 'none';
        }
    }

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
            modalidade: formData.get('modalidade'),
            localizacao: formData.get('modalidade') === 'Presencial' ? formData.get('localizacao') : null,
        };

        const { error } = await supabaseClient.from('aventuras').update(updatedAdventure).eq('id', adventureId);

        if (error) {
            showToast('Erro ao salvar as alterações.', 'error');
            console.error(error);
        } else {
            showToast('Aventura atualizada com sucesso!', 'success');
            setTimeout(() => {
                window.location.href = `aventura.html?id=${adventureId}`;
            }, 1500);
        }

        formButton.disabled = false;
        formButton.textContent = 'Salvar Alterações';
    });
    
    const { data: { session } } = await supabaseClient.auth.getSession();
    currentUser = session?.user;
    if (currentUser) {
        const { data: profile } = await supabaseClient.from('profiles').select('username').eq('id', currentUser.id).single();
        const displayName = profile?.username || currentUser.email.split('@')[0];
        userArea.innerHTML = `
            <a href="profile.html" class="btn-primario">Olá, ${displayName}</a>
            <button id="logout-button" class="btn-primario">Sair</button>
        `;
        document.getElementById('logout-button').addEventListener('click', () => supabaseClient.auth.signOut());
    } else {
        window.location.href = 'index.html';
    }
    
    if (adventureId) {
        populateForm();
    } else {
        document.querySelector('.edit-container').innerHTML = '<h2>Nenhuma aventura especificada para edição.</h2>';
    }
});
