document.addEventListener('DOMContentLoaded', async () => {
    console.log("Iniciando script de TESTE...");

    const { createClient } = supabase;
    const SUPABASE_URL = 'https://zslokbeazldiwmblahps.supabase.co';
    
    // =============================================================
    // POR FAVOR, COLE SUA CHAVE DE API CORRETA AQUI
    // =============================================================
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzbG9rYmVhemxkaXdtYmxhaHBzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0NDA2NDcsImV4cCI6MjA3MDAxNjY0N30.UfTi-SBzIa9Wn_uEnQiW5PAiTECSVimnGGVJ1IFABDQ';

    try {
        const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log("Cliente Supabase criado com sucesso.");

        // Tenta buscar o usuário logado
        const { data: { user }, error } = await supabaseClient.auth.getUser();

        if (error) {
            console.error("ERRO ao buscar usuário:", error);
            alert("Ocorreu um erro ao verificar sua sessão. Verifique o console (F12).");
        } else if (user) {
            console.log("SUCESSO! Usuário encontrado:", user.email);
            alert(`Sessão de usuário encontrada para: ${user.email}. A conexão está funcionando!`);
        } else {
            console.log("Nenhum usuário logado na sessão.");
            alert("Não foi encontrada uma sessão de usuário ativa. Por favor, faça login novamente.");
        }
    } catch (e) {
        console.error("ERRO CRÍTICO no script:", e);
        alert("Ocorreu um erro crítico no script. Verifique o console (F12).");
    }
});
