// .pull p: <pregunta> o1: <opción 1> o2: <opción 2> o3: <opción 3> ...
// Ejemplo:
//   .pull p: quien ganara el mundial o1: Francia o2: España o3: Perú o4: chile
//
// Crea una encuesta nativa de WhatsApp con esas opciones y fija el mensaje en el chat.

function parsePoll(rawText) {
  // La pregunta es todo lo que hay entre "p:" y el primer "oN:"
  const questionMatch = rawText.match(/p:\s*(.+?)\s*(?=o\d+:)/i);
  const question = questionMatch ? questionMatch[1].trim() : null;

  // Cada opción es lo que hay entre "oN:" y el siguiente "oN:" (o el final del texto)
  const optionMatches = [...rawText.matchAll(/o\d+:\s*(.+?)\s*(?=o\d+:|$)/gi)];
  const options = optionMatches.map((m) => m[1].trim()).filter(Boolean);

  return { question, options };
}

module.exports = async function cmdPull(sock, msg, args) {
  const from = msg.key.remoteJid;
  const rawText = args.join(" ");

  const { question, options } = parsePoll(rawText);

  if (!question || options.length < 2) {
    return sock.sendMessage(
      from,
      {
        text:
          "📌 Uso:\n" +
          ".pull p: <pregunta> o1: <opción 1> o2: <opción 2> o3: <opción 3>...\n\n" +
          "Ejemplo:\n" +
          ".pull p: quien ganara el mundial o1: Francia o2: España o3: Perú o4: Chile\n\n" +
          "Mínimo 2 opciones.",
      },
      { quoted: msg }
    );
  }

  if (options.length > 12) {
    return sock.sendMessage(
      from,
      { text: "⚠️ WhatsApp permite máximo 12 opciones por encuesta." },
      { quoted: msg }
    );
  }

  try {
    const pollMsg = await sock.sendMessage(from, {
      poll: {
        name: question,
        values: options,
        selectableCount: 1,
      },
    });

    // Fijar el mensaje de la encuesta en el chat (24 horas)
    try {
      await sock.sendMessage(from, {
        pin: {
          type: 1,
          time: 86400,
          key: pollMsg.key,
        },
      });
    } catch (pinErr) {
      await sock.sendMessage(
        from,
        { text: `⚠️ La encuesta se creó pero no pude fijarla: ${pinErr.message}` },
        { quoted: msg }
      );
    }
  } catch (err) {
    await sock.sendMessage(from, { text: `❌ No pude crear la encuesta: ${err.message}` }, { quoted: msg });
  }
};
