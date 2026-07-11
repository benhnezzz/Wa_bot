const { jidToNumber } = require("../lib/utils");
const { banUser, unbanUser } = require("../lib/bannedUsers");

function getTargetJid(msg, args) {
  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
  const quotedParticipant = msg.message?.extendedTextMessage?.contextInfo?.participant;

  if (mentioned && mentioned.length > 0) return mentioned[0];
  if (quotedParticipant) return quotedParticipant;
  return null;
}

// .ban @mención (o respondiendo al mensaje de la persona) — le prohíbe usar el bot.
// Solo el owner puede usarlo.
async function cmdBan(sock, msg, senderIsOwner) {
  const from = msg.key.remoteJid;

  if (!senderIsOwner) {
    return sock.sendMessage(from, { text: "⛔ Solo el owner puede usar este comando." }, { quoted: msg });
  }

  const targetJid = getTargetJid(msg);
  if (!targetJid) {
    return sock.sendMessage(
      from,
      { text: "📌 Uso: .ban @mención (o responde al mensaje de la persona que quieres banear)." },
      { quoted: msg }
    );
  }

  const number = jidToNumber(targetJid);
  banUser(number);

  await sock.sendMessage(
    from,
    { text: `🚫 @${number} fue baneado del bot.`, mentions: [targetJid] },
    { quoted: msg }
  );
}

// .unban @mención (o respondiendo al mensaje de la persona) — le vuelve a permitir usar el bot.
// Solo el owner puede usarlo.
async function cmdUnban(sock, msg, senderIsOwner) {
  const from = msg.key.remoteJid;

  if (!senderIsOwner) {
    return sock.sendMessage(from, { text: "⛔ Solo el owner puede usar este comando." }, { quoted: msg });
  }

  const targetJid = getTargetJid(msg);
  if (!targetJid) {
    return sock.sendMessage(
      from,
      { text: "📌 Uso: .unban @mención (o responde al mensaje de la persona que quieres desbanear)." },
      { quoted: msg }
    );
  }

  const number = jidToNumber(targetJid);
  unbanUser(number);

  await sock.sendMessage(
    from,
    { text: `✅ @${number} fue desbaneado del bot.`, mentions: [targetJid] },
    { quoted: msg }
  );
}

module.exports = { cmdBan, cmdUnban };
