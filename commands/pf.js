// .pf @mención — envía la foto de perfil de la persona mencionada.
// Solo funciona con una @mención dentro del mismo grupo (o respondiendo a
// un mensaje de esa persona), nunca con un número escrito a mano.
const { jidNormalizedUser } = require("@whiskeysockets/baileys");
const { getQuotedMessage, jidToNumber } = require("../lib/utils");

module.exports = async function cmdPf(sock, msg) {
  const from = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;

  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
  const quoted = getQuotedMessage(msg);

  let targetJid;
  if (mentioned && mentioned.length > 0) {
    targetJid = mentioned[0];
  } else if (quoted?.participant) {
    targetJid = quoted.participant;
  } else {
    targetJid = sender; // sin mención: la propia foto de quien ejecuta el comando
  }

  targetJid = jidNormalizedUser(targetJid);

  try {
    const url = await sock.profilePictureUrl(targetJid, "image");
    const isSelf = targetJid === jidNormalizedUser(sender);
    const caption = isSelf
      ? "📸 Tu foto de perfil"
      : `📸 Foto de perfil de @${jidToNumber(targetJid)}`;

    await sock.sendMessage(
      from,
      {
        image: { url },
        caption,
        mentions: isSelf ? undefined : [targetJid],
      },
      { quoted: msg }
    );
  } catch (err) {
    await sock.sendMessage(
      from,
      { text: "❌ No pude obtener esa foto de perfil (puede que no tenga foto o su privacidad no lo permita)." },
      { quoted: msg }
    );
  }
};
