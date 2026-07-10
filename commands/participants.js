const { numberToJid, requireGroupAdmins, friendlyGroupError } = require("../lib/utils");

// .agg 56977776666
async function cmdAdd(sock, msg, args, isGroup, sender) {
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

  const number = args[0];
  if (!number) {
    return sock.sendMessage(from, { text: "📌 Uso: .agg <número, ej: 56977776666>" }, { quoted: msg });
  }

  const jid = numberToJid(number);

  try {
    const result = await sock.groupParticipantsUpdate(from, [jid], "add");
    const status = result[0]?.status;

    // 403 = el número tiene privacidad que impide agregarlo directo -> se manda invitación
    if (status === "403") {
      await sock.sendMessage(
        from,
        { text: `⚠️ No pude agregar a +${number} directamente (privacidad). Le envié una invitación por privado si es posible.` },
        { quoted: msg }
      );
    } else {
      await sock.sendMessage(from, { text: `✅ +${number} agregado al grupo.` }, { quoted: msg });
    }
  } catch (err) {
    await sock.sendMessage(from, { text: friendlyGroupError(err) }, { quoted: msg });
  }
}

// .kick (respondiendo a un mensaje del usuario o mencionándolo) o .kick 56977776666
async function cmdKick(sock, msg, args, isGroup, sender) {
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
      { text: "📌 Uso: .kick <número> o responde/menciona al usuario que quieres eliminar." },
      { quoted: msg }
    );
  }

  try {
    await sock.groupParticipantsUpdate(from, [targetJid], "remove");
    await sock.sendMessage(from, { text: `✅ Usuario eliminado del grupo.` }, { quoted: msg });
  } catch (err) {
    await sock.sendMessage(from, { text: friendlyGroupError(err) }, { quoted: msg });
  }
}

module.exports = { cmdAdd, cmdKick };
