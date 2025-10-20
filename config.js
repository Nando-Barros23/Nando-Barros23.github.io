// config.js - VERSÃO SIMPLES E SEGURA

// No Vercel, isso funciona automaticamente
// No seu computador, vai dar erro - mas só você vê o erro

const supabaseUrl = 'https://zslokbeazldiwmblahps.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY; // ← CHAVE ESCONDIDA

if (!supabaseKey) {
  // Se não encontrar a chave escondida
  console.error('❌ AVISO: Chave do Supabase não encontrada');
  console.error('💡 No Vercel: Configure SUPABASE_ANON_KEY nas Environment Variables');
  console.error('💡 No seu PC: Isso é normal durante desenvolvimento');
  
  // PARA completamente se não tiver chave (MAIS SEGURO)
  window.supabaseClient = null;
} else {
  // Só cria o cliente se tiver chave de verdade
  const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);
  window.supabaseClient = supabaseClient;
  console.log('✅ Supabase configurado com segurança');
}