import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'

// Pega a URL secreta do webhook que configuramos
const DISCORD_WEBHOOK_URL = Deno.env.get('DISCORD_WEBHOOK_URL')

serve(async (req) => {
  // Responde a checagens de CORS do navegador
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Pega os dados da aventura que o frontend enviou
    const { aventura } = await req.json()

    // Monta a mensagem (embed) para o Discord
    const discordPayload = {
      embeds: [
        {
          title: `Nova Aventura Publicada: ${aventura.titulo}`,
          description: `Uma nova jornada aguarda por heróis!`,
          color: 15844367, // Cor laranja/dourado
          fields: [
            { name: 'Mestre', value: aventura.nome_mestre, inline: true },
            { name: 'Sistema', value: aventura.sistema_rpg, inline: true },
            { name: 'Vagas', value: aventura.vagas, inline: true }
          ],
          thumbnail: {
            url: aventura.image_url || 'https://i.imgur.com/SzXWxJe.png'
          },
          footer: {
            text: `Clique no título para ver os detalhes da aventura.`
          },
          url: `https://nando-barros23.github.io/aventura.html?id=${aventura.id}`
        }
      ]
    };

    // Envia a notificação para o Discord de forma segura
    await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(discordPayload),
    });

    // Retorna uma resposta de sucesso para o frontend
    return new Response(JSON.stringify({ message: "Notificação enviada com sucesso!" }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    // Retorna uma resposta de erro para o frontend
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})