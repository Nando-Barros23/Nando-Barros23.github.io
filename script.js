document.addEventListener('DOMContentLoaded', async () => {
    // 1. INICIALIZAÇÃO E VARIÁVEIS
    const adventuresGrid = document.getElementById('adventures-grid');
    const adventureForm = document.getElementById('adventure-form');
    const userArea = document.getElementById('user-area');
    const publishSection = document.querySelector('.painel-lateral');
    const searchBar = document.getElementById('search-bar');
    const systemFilter = document.getElementById('filter-system');
    const modalityFilter = document.getElementById('filter-modality');
    const typeFilter = document.getElementById('filter-type');
    const clearFiltersBtn = document.getElementById('clear-filters-btn');
    let currentUser = null;
    let allAdventures = [];

    async function initializeIndexPage() {
        if (adventuresGrid) {
            adventuresGrid.innerHTML = '<p>Carregando aventuras...</p>';
        }
        
        const [sessionResponse, adventuresResponse] = await Promise.all([
            supabaseClient.auth.getSession(),
            supabaseClient.from('aventuras').select('*').eq('status', 'ativa').order('created_at', { ascending: false })
]);

        currentUser = sessionResponse.data.session?.user || null;
        await updateUI(currentUser);

        if (adventuresResponse.error) {
            console.error('Erro ao buscar aventuras:', adventuresResponse.error);
            if (adventuresGrid) {
                adventuresGrid.innerHTML = '<p style="color: red;">Erro ao carregar as aventuras. Tente recarregar a página.</p>';
            }
        } else {
            allAdventures = adventuresResponse.data;
            populateSystemFilter(allAdventures);
            applyFilters();
        }
    }

    supabaseClient.auth.onAuthStateChange((_event, session) => {
        if (currentUser?.id !== session?.user?.id) {
            initializeIndexPage();
        }
    });

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

// --- ADICIONE ESTAS DUAS NOVAS FUNÇÕES ---
function populateSystemFilter(adventures) {
    const systems = [...new Set(adventures.map(adv => adv.sistema_rpg))];
    systems.sort();
    systemFilter.innerHTML = '<option value="">Todos os Sistemas</option>';
    systems.forEach(system => {
        const option = document.createElement('option');
        option.value = system;
        option.textContent = system;
        systemFilter.appendChild(option);
    });
}

function applyFilters() {
    const searchTerm = searchBar.value.toLowerCase();
    const selectedSystem = systemFilter.value;
    const selectedModality = modalityFilter.value;
    const selectedType = typeFilter.value;

    const filteredAdventures = allAdventures.filter(adventure => {
        const matchesSearch = searchTerm === '' || 
                              adventure.titulo.toLowerCase().includes(searchTerm) || 
                              adventure.nome_mestre.toLowerCase().includes(searchTerm);

        const matchesSystem = selectedSystem === '' || adventure.sistema_rpg === selectedSystem;
        const matchesModality = selectedModality === '' || adventure.modalidade === selectedModality;
        const matchesType = selectedType === '' || adventure.tipo_jogo === selectedType;

        return matchesSearch && matchesSystem && matchesModality && matchesType;
    });

    renderAdventures(filteredAdventures);
}

function renderAdventures(adventures) {
    if (!adventuresGrid) return;
    adventuresGrid.innerHTML = '';
    if (adventures.length === 0) {
        adventuresGrid.innerHTML = '<p>Nenhuma aventura encontrada com os filtros selecionados.</p>';
    } else {
        adventures.forEach(adventure => {
            const cardLink = document.createElement('a');
            cardLink.href = `aventura.html?id=${adventure.id}`;
            cardLink.classList.add('adventure-card-link');
            const card = document.createElement('div');
            card.classList.add('adventure-card');
            const placeholderImg = 'https://i.imgur.com/Q3j5eH0.png';
        
             card.innerHTML = `
                <img src="${adventure.image_url || placeholderImg}" alt="Imagem da Aventura" class="adventure-card-image" loading="lazy">
                <div class="adventure-card-content">
                    <h4>${adventure.titulo}</h4>
                    <div class="card-details">
                        <div class="card-detail-line">
                            <i class="fas fa-user-edit"></i>
                            <span><strong>Mestre:</strong> ${adventure.nome_mestre}</span>
                        </div>
                        <div class="card-detail-line">
                            <i class="fas fa-book-skull"></i>
                            <span><strong>Sistema:</strong> ${adventure.sistema_rpg}</span>
                        </div>
                         <div class="card-detail-line">
                            <i class="fas fa-user"></i>
                            <span><strong>Vagas:</strong> ${adventure.vagas}</span>
                        </div>
                    </div>
                </div>
            `;
            cardLink.appendChild(card);
            adventuresGrid.appendChild(cardLink);
        });
    }
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
            
            if (publishSection && profile && profile.role && profile.role.trim().toLowerCase() === 'master') {
                publishSection.style.display = 'block';
            } else if (publishSection) {
                publishSection.style.display = 'none';
            }
        } else {
            userArea.innerHTML = `<a href="login.html" class="btn-primario">Login / Cadastrar</a>`;
            if (publishSection) {
                publishSection.style.display = 'none';
            }
        }
    }
    
            searchBar.addEventListener('input', applyFilters);
            systemFilter.addEventListener('change', applyFilters);
            modalityFilter.addEventListener('change', applyFilters);
            typeFilter.addEventListener('change', applyFilters);

            clearFiltersBtn.addEventListener('click', () => {
                searchBar.value = '';
                systemFilter.value = '';
                modalityFilter.value = '';
                typeFilter.value = '';
                applyFilters();
            });

    if (adventureForm) {
        const onlineRadio = document.getElementById('modalidade_online');
        const presencialRadio = document.getElementById('modalidade_presencial');
        const locationContainer = document.getElementById('location-input-container');
        const locationInput = document.getElementById('localizacao');

        const adventureImageInput = document.getElementById('adventure-image');
        const fileUploadLabel = document.querySelector('.file-upload-label');
        const originalLabelText = fileUploadLabel.innerHTML;

        adventureImageInput.addEventListener('change', () => {
            if (adventureImageInput.files.length > 0) {
                fileUploadLabel.innerHTML = `<i class="fas fa-check-circle"></i> ${adventureImageInput.files[0].name}`;
            } else {
                fileUploadLabel.innerHTML = originalLabelText;
            }
        });


        const easyMDE = new EasyMDE({
            element: document.getElementById('descricao'),
            toolbar: ["bold", "italic", "heading", "|", "quote", "unordered-list", "ordered-list", "|", "preview"],
            placeholder: "Use Markdown para formatar sua aventura...",
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

        adventureForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            if (!currentUser) {
                showToast('Você precisa estar logado para publicar.', 'error');
                return;
            }
            if (easyMDE.value().trim() === '') {
                showToast('O campo "Descrição" é obrigatório.', 'error');
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
                modalidade: formData.get('modalidade'),
                localizacao: formData.get('modalidade') === 'Presencial' ? formData.get('localizacao') : null,
                vagas: parseInt(formData.get('vagas')),
                descricao: DOMPurify.sanitize(easyMDE.value()), 
                alerta_gatilho: formData.get('alerta_gatilho'),
                tipo_jogo: formData.get('tipo_jogo'),
                nivel: formData.get('nivel'),
                user_id: currentUser.id,
                image_url: imageUrl
            };
            
        const { data, error } = await supabaseClient.from('aventuras').insert([newAdventure]).select();

        if (error) {
            console.error('Erro ao inserir aventura:', error);
            showToast('Ocorreu um erro ao publicar sua aventura.', 'error');
        } else {
            const novaAventura = data[0]; 

            try {
              const { data: funcData, error: funcError } = await supabaseClient.functions.invoke('notificar-discord', {
                body: { aventura: novaAventura }
              });

              if (funcError) throw funcError;

              console.log("Notificação para o Discord enviada com sucesso!", funcData);
            } catch (funcError) {
              console.error("Erro ao notificar o Discord:", funcError);
            }

            showToast('Aventura publicada com sucesso!', 'success');
            adventureForm.reset();
            easyMDE.value("");
            locationContainer.style.display = 'none';
            onlineRadio.checked = true;
            renderAdventures(); 
        }
        formButton.disabled = false; formButton.textContent = 'Publicar Aventura';
    });

    renderAdventures();
});

initializeIndexPage();
});
