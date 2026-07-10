const { downloadMediaMessage } = require("@whiskeysockets/baileys");
const { Sticker, StickerTypes } = require("wa-sticker-formatter");
const config = require("../config");
const { getQuotedMessage } = require("../lib/utils");

module.exports = async function cmdSticker(sock, msg, args) {
  const from = msg.key.remoteJid;

  const quoted = getQuotedMessage(msg);
  const directMedia = msg.message?.imageMessage || msg.message?.videoMessage;
  const quotedMedia =
    quoted?.message?.imageMessage || quoted?.message?.videoMessage;

  if (!directMedia && !quotedMedia) {
    return sock.sendMessage(
      from,
      {
        text:
          "📌 Envía una imagen/video con el comando .sticker en el caption, " +
          "o responde a una imagen/video con .sticker <nombre del paquete>",
      },
      { quoted: msg }
    );
  }

  // Arma un "mensaje" temporal que apunte al contenido a descargar
  const targetMsg = quotedMedia
    ? {
        key: {
          remoteJid: from,
          id: quoted.stanzaId,
          participant: quoted.participant,
        },
        message: quoted.message,
      }
    : msg;

  try {
    const buffer = await downloadMediaMessage(targetMsg, "buffer", {});

    const packName = args.join(" ") || config.DEFAULT_PACK_NAME;

    const sticker = new Sticker(buffer, {
      pack: packName,
      author: config.DEFAULT_AUTHOR,
      type: StickerTypes.FULL,
      quality: 70,
    });

    const stickerBuffer = await sticker.toBuffer();
    await sock.sendMessage(from, { sticker: stickerBuffer }, { quoted: msg });
  } catch (err) {
    await sock.sendMessage(
      from,
      { text: `❌ No pude crear el sticker: ${err.message}` },
      { quoted: msg }
    );
  }
};
