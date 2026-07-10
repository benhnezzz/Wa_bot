const { downloadMediaMessage } = require("@whiskeysockets/baileys");
const { isOwnerOrCoOwner, getQuotedMessage, friendlyGroupError } = require("../lib/utils");

// .setpp (respondiendo a una imagen)
async function cmdSetPP(sock, msg, isGroup, sender) {
  const from = msg.key.remoteJid;

  if (!isGroup) {
    return sock.sendMessage(from, { text: "⛔ Este comando solo funciona en grupos." }, { quoted: msg });
  }

  if (!isOwnerOrCoOwner(sender)) {
    return sock.sendMessage(from, { text: "⛔ Solo el owner o un co-owner puede usar este comando." }, { quoted: msg });
  }

  const quoted = getQuotedMessage(msg);
  const directImage = msg.message?.imageMessage;
  const quotedImage = quoted?.message?.imageMessage;

  if (!directImage && !quotedImage) {
    return sock.sendMessage(from, { text: "📌 Responde a una imagen con .setpp" }, { quoted: msg });
  }

  const targetMsg = quotedImage
    ? {
        key: { remoteJid: from, id: quoted.stanzaId, participant: quoted.participant },
        message: quoted.message,
      }
    : msg;

  try {
    const buffer = await downloadMediaMessage(targetMsg, "buffer", {});
    await sock.updateProfilePicture(from, buffer);
    await sock.sendMessage(from, { text: "✅ Foto del grupo actualizada." }, { quoted: msg });
  } catch (err) {
    await sock.sendMessage(from, { text: friendlyGroupError(err) }, { quoted: msg });
  }
}

// .setname <nuevo nombre>
async function cmdSetName(sock, msg, args, isGroup, sender) {
  const from = msg.key.remoteJid;

  if (!isGroup) {
    return sock.sendMessage(from, { text: "⛔ Este comando solo funciona en grupos." }, { quoted: msg });
  }

  if (!isOwnerOrCoOwner(sender)) {
    return sock.sendMessage(from, { text: "⛔ Solo el owner o un co-owner puede usar este comando." }, { quoted: msg });
  }

  const newName = args.join(" ");
  if (!newName) {
    return sock.sendMessage(from, { text: "📌 Uso: .setname <nuevo nombre>" }, { quoted: msg });
  }

  try {
    await sock.groupUpdateSubject(from, newName);
    await sock.sendMessage(from, { text: "✅ Nombre del grupo actualizado." }, { quoted: msg });
  } catch (err) {
    await sock.sendMessage(from, { text: friendlyGroupError(err) }, { quoted: msg });
  }
}

// .setdesc <nueva descripción>
async function cmdSetDesc(sock, msg, args, isGroup, sender) {
  const from = msg.key.remoteJid;

  if (!isGroup) {
    return sock.sendMessage(from, { text: "⛔ Este comando solo funciona en grupos." }, { quoted: msg });
  }

  if (!isOwnerOrCoOwner(sender)) {
    return sock.sendMessage(from, { text: "⛔ Solo el owner o un co-owner puede usar este comando." }, { quoted: msg });
  }

  const newDesc = args.join(" ");
  if (!newDesc) {
    return sock.sendMessage(from, { text: "📌 Uso: .setdesc <nueva descripción>" }, { quoted: msg });
  }

  try {
    await sock.groupUpdateDescription(from, newDesc);
    await sock.sendMessage(from, { text: "✅ Descripción del grupo actualizada." }, { quoted: msg });
  } catch (err) {
    await sock.sendMessage(from, { text: friendlyGroupError(err) }, { quoted: msg });
  }
}

module.exports = { cmdSetPP, cmdSetName, cmdSetDesc };
