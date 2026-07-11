const { getSuggestionsGroup } = require("../lib/suggestionsConfig");
const { jidToNumber, resolveRealNumber } = require("../lib/utils");

// .sug <mensaje> — manda una sugerencia al grupo configurado con .set_sug.
// La puede usar cualquiera, desde cualquier chat (privado o grupo).
// Formato del mensaje que le llega al grupo de sugerencias:
//   @lid - <nombre> + wa.me/<número real> -> <sugerencia>
// El "+ wa.me/<número>" solo aparece si el bot logra resolver el número real
// detrás del @lid (no siempre se puede, ver resolveRealNumber en lib/utils.js).
module.exports = async function cmdSug(sock, msg, args, sender) {
  const from = msg.key.remoteJid;
  const isGroup = from.endsWith("@g.us");

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

  const senderTag = `@${jidToNumber(sender)}`;
  const name = msg.pushName || "Sin nombre";
  const realNumber = await resolveRealNumber(sock, sender, isGroup ? from : null);
  const waPart = realNumber ? ` + wa.me/${realNumber}` : "";

  const text = `📩 *Nueva sugerencia*\n\n${senderTag} - ${name}${waPart} -> ${suggestion}`;

  try {
    await sock.sendMessage(suggestionsGroup, { text, mentions: [sender] });
  } catch (err) {
    return sock.sendMessage(
      from,
      { text: `❌ No pude mandar la sugerencia (¿el bot sigue en ese grupo?): ${err.message}` },
      { quoted: msg }
    );
  }

  await sock.sendMessage(from, { text: "✅ ¡Gracias! Tu sugerencia fue enviada." }, { quoted: msg });
};
