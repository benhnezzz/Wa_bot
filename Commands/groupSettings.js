const { downloadMediaMessage } = require("@whiskeysockets/baileys");
const { isBotAdmin, getQuotedMessage } = require("../lib/utils");

// .setpp (respondiendo a una imagen)
async function cmdSetPP(sock, msg, isGroup) {
  const from = msg.key.remoteJid;

  if (!isGroup) {
    return sock.sendMessage(from, { text: "⛔ Este comando solo funciona en grupos." }, { quoted: msg });
  }

  const botAdmin = await isBotAdmin(sock, from);
  if (!botAdmin) {
    return sock.sendMessage(from, { text: "⛔ Necesito ser admin para cambiar la foto del grupo." }, { quoted: msg });
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
    await sock.sendMessage(from, { text: `❌ Error al cambiar la foto: ${err.message}` }, { quoted: msg });
  }
}

// .setname <nuevo nombre>
async function cmdSetName(sock, msg, args, isGroup) {
  const from = msg.key.remoteJid;

  if (!isGroup) {
    return sock.sendMessage(from, { text: "⛔ Este comando solo funciona en grupos." }, { quoted: msg });
  }

  const botAdmin = await isBotAdmin(sock, from);
  if (!botAdmin) {
    return sock.sendMessage(from, { text: "⛔ Necesito ser admin para cambiar el nombre del grupo." }, { quoted: msg });
  }

  const newName = args.join(" ");
  if (!newName) {
    return sock.sendMessage(from, { text: "📌 Uso: .setname <nuevo nombre>" }, { quoted: msg });
  }

  try {
    await sock.groupUpdateSubject(from, newName);
    await sock.sendMessage(from, { text: "✅ Nombre del grupo actualizado." }, { quoted: msg });
  } catch (err) {
    await sock.sendMessage(from, { text: `❌ Error: ${err.message}` }, { quoted: msg });
  }
}

// .setdesc <nueva descripción>
async function cmdSetDesc(sock, msg, args, isGroup) {
  const from = msg.key.remoteJid;

  if (!isGroup) {
    return sock.sendMessage(from, { text: "⛔ Este comando solo funciona en grupos." }, { quoted: msg });
  }

  const botAdmin = await isBotAdmin(sock, from);
  if (!botAdmin) {
    return sock.sendMessage(from, { text: "⛔ Necesito ser admin para cambiar la descripción." }, { quoted: msg });
  }

  const newDesc = args.join(" ");
  if (!newDesc) {
    return sock.sendMessage(from, { text: "📌 Uso: .setdesc <nueva descripción>" }, { quoted: msg });
  }

  try {
    await sock.groupUpdateDescription(from, newDesc);
    await sock.sendMessage(from, { text: "✅ Descripción del grupo actualizada." }, { quoted: msg });
  } catch (err) {
    await sock.sendMessage(from, { text: `❌ Error: ${err.message}` }, { quoted: msg });
  }
}

module.exports = { cmdSetPP, cmdSetName, cmdSetDesc };
