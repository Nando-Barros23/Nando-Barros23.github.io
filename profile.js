const SUPABASE_URL = 'https://zslokbeazldiwmblahps.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzbG9rYmVhemxkaXdtYmxhaHBzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0NDA2NDcsImV4cCI6MjA3MDAxNjY0N30.UfTi-SBzIa9Wn_uEnQiW5PAiTECSVimnGGVJ1IFABDQ';
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Elementos do DOM
const userArea = document.getElementById('user-area');
const usernameDisplay = document.getElementById('username-display');
const emailDisplay = document.getElementById('email-display');
const roleDisplay = document.getElementById('role-display');
const avatarImg = document.getElementById('avatar-img');
const btnChangeAvatar = document.getElementById('btn-change-avatar');
const avatarUpload = document.getElementById('avatar-upload');
const profileForm = document.getElementById('profile-form');
const usernameInput = document.getElementById('username-input');
const messageArea = document.getElementById('message-area');
const masterApplicationContent = document.getElementById('master-application-content');

let currentUser = null;
let userProfile = null;

function showMessage(message, isError = false) {
    messageArea.textContent = message;
    messageArea.style.backgroundColor = isError ? '#f8d7da' : '#d4edda';
    messageArea.style.color = isError ? '#721c24' : '#155724';
    messageArea.style.display = 'block';
    setTimeout(() => { messageArea.style.display = 'none'; }, 3000);
}

// Carregar dados do perfil
async function loadProfileData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    currentUser = user;
    updateUserUI(user);

    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (error) {
        console.error('Erro ao buscar perfil:', error);
        return;
    }

    if (data) {
        userProfile = data;
        usernameDisplay.textContent = data.username || 'Sem nome de usuário';
        emailDisplay.textContent = user.email;
        roleDisplay.textContent = data.role;
        usernameInput.value = data.username;
        if (data.avatar_url) {
            avatarImg.src = data.avatar_url;
        }
        
        // Lógica para candidatura de mestre
        if(data.role === 'player') {
            checkMasterApplicationStatus();
        } else {
            document.getElementById('master-application-section').style.display = 'none';
        }
    }
}

// Atualizar UI do cabeçalho
function updateUserUI(user) {
    if (user) {
        userArea.innerHTML = `<a href="profile.html" style="color: var(--cor-primaria); text-decoration: none;">Olá, ${user.email.split('@')[0]}</a> <button id="logout-button" class="btn-primario" style="width: auto; padding: 0.5rem 1rem;">Sair</button>`;
        document.getElementById('logout-button').addEventListener('click', async () => {
            await supabase.auth.signOut();
            window.location.href = 'index.html';
        });
    } else {
        window.location.href = 'login.html';
    }
}

// Atualizar perfil
profileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newUsername = usernameInput.value;

    const { data, error } = await supabase
        .from('profiles')
        .update({ username: newUsername, updated_at: new Date() })
        .eq('id', currentUser.id);

    if (error) {
        showMessage('Erro ao atualizar o perfil: ' + error.message, true);
    } else {
        showMessage('Perfil atualizado com sucesso!');
        usernameDisplay.textContent = newUsername;
    }
});

// Lógica de Upload de Avatar
btnChangeAvatar.addEventListener('click', () => {
    avatarUpload.click();
});

avatarUpload.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const filePath = `${currentUser.id}/${Date.now()}`;
    const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

    if (uploadError) {
        showMessage('Erro ao enviar a imagem.', true);
        return;
    }

    const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

    const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', currentUser.id);

    if (updateError) {
        showMessage('Erro ao salvar o avatar no perfil.', true);
    } else {
        avatarImg.src = publicUrl;
        showMessage('Avatar atualizado!');
    }
});

// Lógica de Candidatura a Mestre
async function checkMasterApplicationStatus() {
    const { data, error } = await supabase
        .from('master_applications')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false })
        .limit(1);

    if(error) console.error("Erro ao checar candidatura: ", error);

    if (data && data.length > 0) {
        const lastApp = data[0];
        masterApplicationContent.innerHTML = `<p>Sua última candidatura está com o status: <strong>${lastApp.status}</strong></p>`;
    } else {
        renderMasterApplicationForm();
    }
}

function renderMasterApplicationForm() {
    masterApplicationContent.innerHTML = `
        <p>Preencha o formulário abaixo para se candidatar.</p>
        <form id="master-form">
            <div class="form-grupo">
                <label>Quanto tempo de experiência você tem com RPG?</label>
                <select id="experience" required>
                    <option value="Menos de 1 ano">Menos de 1 ano</option>
                    <option value="1 a 3 anos">1 a 3 anos</option>
                    <option value="3 a 5 anos">3 a 5 anos</option>
                    <option value="Mais de 5 anos">Mais de 5 anos</option>
                </select>
            </div>
            <div class="form-grupo">
                <label for="reason">Por que você quer ser um mestre na nossa comunidade?</label>
                <textarea id="reason" rows="4" required></textarea>
            </div>
            <button type="submit" class="btn-primario">Enviar Candidatura</button>
        </form>
    `;

    document.getElementById('master-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const experience = document.getElementById('experience').value;
        const reason = document.getElementById('reason').value;

        const { error } = await supabase.from('master_applications').insert({
            user_id: currentUser.id,
            experience: experience,
            reason: reason
        });
        
        if (error) {
            showMessage("Erro ao enviar candidatura.", true);
        } else {
            showMessage("Candidatura enviada com sucesso!");
            checkMasterApplicationStatus();
        }
    });
}


document.addEventListener('DOMContentLoaded', loadProfileData);
