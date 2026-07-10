const { getCoOwners, addCoOwner, removeCoOwner } = require("../lib/coowners");

// .co <número>        -> agrega co-owner
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

  if (!sub) {
    return sock.sendMessage(
      from,
      {
        text:
          "📌 Uso:\n" +
          ".co <número> — agregar co-owner\n" +
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
    { text: `✅ +${number} ahora es co-owner del bot y puede usar los comandos de moderación.` },
    { quoted: msg }
  );
};
