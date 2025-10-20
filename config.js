// config.js - Versão Segura para Vercel
let supabaseClient;

try {
  // Tentar usar environment variables do Vercel
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;
  
  if (supabaseUrl && supabaseKey) {
    // Ambiente do Vercel - seguro
    supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);
    console.log('✅ Configuração segura do Supabase carregada');
  } else {
    // Fallback para desenvolvimento local
    throw new Error('Variáveis de ambiente não encontradas');
  }
} catch (error) {
  // Fallback para desenvolvimento (NUNCA use em produção)
  const fallbackUrl = 'https://zslokbeazldiwmblahps.supabase.co';
  const fallbackKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzbG9rYmVhemxkaXdtYmxhaHBzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0NDA2NDcsImV4cCI6MjA3MDAxNjY0N30.UfTi-SBzIa9Wn_uEnQiW5PAiTECSVimnGGVJ1IFABDQ';
  
  supabaseClient = supabase.createClient(fallbackUrl, fallbackKey);
  console.warn('⚠️ Usando configuração de fallback - apenas para desenvolvimento');
}
window.supabaseClient = supabaseClient;
