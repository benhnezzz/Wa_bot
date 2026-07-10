const { numberToJid, requireGroupAdmins, friendlyGroupError } = require("../lib/utils");

// .adm (mencionando, respondiendo, o con número) -> da admin a otra persona
// Requiere que quien use el comando Y el bot sean admins del grupo.
async function cmdPromote(sock, msg, args, isGroup, sender) {
  const from = msg.key.remoteJid;

  if (!isGroup) {
    return sock.sendMessage(from, { text: "⛔ Este comando solo funciona en grupos." }, { quoted: msg });
  }

  const { senderIsAdmin, botIsAdmin } = await requireGroupAdmins(sock, from, sender);
  if (!senderIsAdmin) {
    return sock.sendMessage(from, { text: "⛔ Solo un administrador del grupo puede usar este comando." }, { quoted: msg });
  }
  if (!botIsAdmin) {
    return sock.sendMessage(from, { text: "⛔ Necesito ser administrador del grupo para hacer esto." }, { quoted: msg });
  }

  // Prioridad: mención > respuesta citada > número en el argumento
  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
  const quotedParticipant = msg.message?.extendedTextMessage?.contextInfo?.participant;

  let targetJid;
  if (mentioned && mentioned.length > 0) {
    targetJid = mentioned[0];
  } else if (quotedParticipant) {
    targetJid = quotedParticipant;
  } else if (args[0]) {
    targetJid = numberToJid(args[0]);
  }

  if (!targetJid) {
    return sock.sendMessage(
      from,
      { text: "📌 Uso: .adm <número> o responde/menciona al usuario que quieres hacer admin." },
      { quoted: msg }
    );
  }

  try {
    await sock.groupParticipantsUpdate(from, [targetJid], "promote");
    await sock.sendMessage(
      from,
      { text: `✅ @${targetJid.split("@")[0]} ahora es administrador del grupo.`, mentions: [targetJid] },
      { quoted: msg }
    );
  } catch (err) {
    await sock.sendMessage(from, { text: friendlyGroupError(err) }, { quoted: msg });
  }
}

module.exports = cmdPromote;
