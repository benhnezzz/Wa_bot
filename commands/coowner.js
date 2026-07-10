const { getCoOwners, addCoOwner, removeCoOwner } = require("../lib/coowners");
const { jidToNumber } = require("../lib/utils");

// .co <número>        -> agrega co-owner
// .co (respondiendo/mencionando a alguien) -> agrega co-owner usando su identificador real
// .co del <número>     -> quita co-owner
// .co list              -> lista los co-owners actuales
module.exports = async function cmdCoOwner(sock, msg, args, senderIsOwner) {
  const from = msg.key.remoteJid;

  // Solo el owner original (el del config.js) puede dar o quitar co-owners.
  // Un co-owner NO puede agregar a otro co-owner.
  if (!senderIsOwner) {
    return sock.sendMessage(
      from,
      { text: "⛔ Solo el owner puede administrar co-owners." },
      { quoted: msg }
    );
  }

  const sub = args[0];

  // Mención o respuesta a un mensaje: captura el identificador REAL que usa WhatsApp
  // (puede ser un número de teléfono normal o un ID @lid). Esto es más confiable que
  // escribir el número a mano, porque WhatsApp a veces identifica a la gente con un ID
  // interno distinto a su número visible.
  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
  const quotedParticipant = msg.message?.extendedTextMessage?.contextInfo?.participant;
  const targetJid =
    sub !== "list" && sub !== "del"
      ? (mentioned && mentioned.length > 0 ? mentioned[0] : quotedParticipant)
      : null;

  if (targetJid) {
    const id = jidToNumber(targetJid);
    addCoOwner(id);
    return sock.sendMessage(
      from,
      {
        text: `✅ @${id} ahora es co-owner del bot y puede usar los comandos de moderación.`,
        mentions: [targetJid],
      },
      { quoted: msg }
    );
  }

  if (!sub) {
    return sock.sendMessage(
      from,
      {
        text:
          "📌 Uso:\n" +
          ".co <número> — agregar co-owner (puede no funcionar si esa persona tiene un ID @lid)\n" +
          ".co (respondiendo a su mensaje) — agregar co-owner de forma confiable\n" +
          ".co del <número> — quitar co-owner\n" +
          ".co list — ver co-owners actuales",
      },
      { quoted: msg }
    );
  }

  if (sub === "list") {
    const list = getCoOwners();
    const text = list.length
      ? `👥 Co-owners actuales:\n${list.map((n) => `+${n}`).join("\n")}`
      : "No hay co-owners agregados todavía.";
    return sock.sendMessage(from, { text }, { quoted: msg });
  }

  if (sub === "del") {
    const number = args[1]?.replace(/[^0-9]/g, "");
    if (!number) {
      return sock.sendMessage(from, { text: "📌 Uso: .co del <número>" }, { quoted: msg });
    }
    removeCoOwner(number);
    return sock.sendMessage(from, { text: `✅ +${number} ya no es co-owner.` }, { quoted: msg });
  }

  // Caso normal: .co <número>
  const number = sub.replace(/[^0-9]/g, "");
  if (!number) {
    return sock.sendMessage(from, { text: "📌 Uso: .co <número, ej: 56977776666>" }, { quoted: msg });
  }

  addCoOwner(number);
  await sock.sendMessage(
    from,
    {
      text:
        `✅ +${number} ahora es co-owner del bot y puede usar los comandos de moderación.\n\n` +
        `⚠️ Si esa persona tiene un ID @lid, es posible que el bot igual no la reconozca. ` +
        `Si pasa eso, usa ".co" respondiendo directamente a un mensaje suyo en vez de escribir el número.`,
    },
    { quoted: msg }
  );
};
