export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Método não permitido.' });
  }

  try {
    const { record: novaAventura } = request.body;

    // Pega na URL do Webhook que vamos guardar em segurança na Vercel
    const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL;
    
    if (!discordWebhookUrl) {
        throw new Error("A URL do Webhook do Discord não está configurada.");
    }
    
    const embed = {
      title: `Nova Aventura Publicada: ${novaAventura.titulo}`,
      description: `Uma nova aventura chamada **${novaAventura.titulo}** foi publicada por **${novaAventura.nome_mestre}**!`,
      color: 0xD06E41, 
      fields: [
        { name: "Sistema", value: novaAventura.sistema_rpg, inline: true },
        { name: "Vagas", value: novaAventura.vagas.toString(), inline: true },
        { name: "Nível", value: novaAventura.nivel, inline: true },
      ],
      footer: {
        text: "Clique em 'Ver Aventura' para saber mais.",
      },
      timestamp: new Date().toISOString(),
    };
    
    const discordPayload = {
      content: "📢 Uma nova aventura foi chamada no mural!", 
      embeds: [embed],
      components: [
        {
          type: 1,
          components: [
            {
              type: 2,
              label: "Ver Aventura",
              style: 5, 
              url: `https://dados-e-calangos.vercel.app/aventura.html?id=${novaAventura.id}` 
            }
          ]
        }
      ]
    };

    await fetch(discordWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(discordPayload),
    });

    response.status(200).json({ message: 'Notificação enviada com sucesso!' });

  } catch (error) {
    console.error(error);
    response.status(500).json({ message: 'Ocorreu um erro ao enviar a notificação.' });
  }
}