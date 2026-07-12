// lib/nsfw.js
const { getQuotedMessage, jidToNumber } = require("./utils");

async function sendNsfwAction(sock, msg, category, actionText, gifList) {
  const from = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;

  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
  const quoted = getQuotedMessage(msg);

  let targetJid = mentioned?.[0] || quoted?.participant || sender;

  const senderNum = jidToNumber(sender);
  const targetNum = jidToNumber(targetJid);

  const randomGif = gifList[Math.floor(Math.random() * gifList.length)];

  const caption = actionText
    .replace("{sender}", `@${senderNum}`)
    .replace("{target}", `@${targetNum}`);

  try {
    await sock.sendMessage(from, {
      video: { url: randomGif },
      caption: caption,
      gifPlayback: true,
      mentions: [sender, targetJid]
    }, { quoted: msg });
  } catch (err) {
    await sock.sendMessage(from, { text: `❌ Error al enviar GIF de ${category}: ${err.message}` }, { quoted: msg });
  }
}

module.exports = { sendNsfwAction };
