const { getSuggestionsGroup } = require("../lib/suggestionsConfig");
const { jidToNumber } = require("../lib/utils");

// .sug <mensaje> — manda una sugerencia al grupo configurado con .set_sug.
// La puede usar cualquiera, desde cualquier chat (privado o grupo).
// Formato del mensaje que le llega al grupo de sugerencias:
//   <número> - <nombre del que manda> -> <sugerencia>
module.exports = async function cmdSug(sock, msg, args, sender) {
  const from = msg.key.remoteJid;

  const suggestion = args.join(" ").trim();
  if (!suggestion) {
    return sock.sendMessage(from, { text: "📌 Uso: .sug <tu sugerencia>" }, { quoted: msg });
  }

  const suggestionsGroup = getSuggestionsGroup();
  if (!suggestionsGroup) {
    return sock.sendMessage(
      from,
      { text: "⚠️ Todavía no hay un grupo de sugerencias configurado. Pide al owner que use .set_sug." },
      { quoted: msg }
    );
  }

  const number = jidToNumber(sender);
  const name = msg.pushName || "Sin nombre";

  const text = `📩 *Nueva sugerencia*\n\n${number} - ${name} -> ${suggestion}`;

  try {
    await sock.sendMessage(suggestionsGroup, { text });
  } catch (err) {
    return sock.sendMessage(
      from,
      { text: `❌ No pude mandar la sugerencia (¿el bot sigue en ese grupo?): ${err.message}` },
      { quoted: msg }
    );
  }

  await sock.sendMessage(from, { text: "✅ ¡Gracias! Tu sugerencia fue enviada." }, { quoted: msg });
};
