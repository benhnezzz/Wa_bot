const { isBotAdmin } = require("../lib/utils");

module.exports = async function cmdSelfAdmin(sock, msg, isGroup, senderIsOwner) {
  const from = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;

  if (!isGroup) {
    return sock.sendMessage(from, { text: "⛔ Este comando solo funciona en grupos." }, { quoted: msg });
  }

  if (!senderIsOwner) {
    return sock.sendMessage(from, { text: "⛔ Solo el owner puede usar este comando." }, { quoted: msg });
  }

  const botAdmin = await isBotAdmin(sock, from);
  if (!botAdmin) {
    return sock.sendMessage(
      from,
      { text: "⛔ No soy admin en este grupo, no puedo ascenderte. Pídele a un admin que me haga admin primero." },
      { quoted: msg }
    );
  }

  try {
    await sock.groupParticipantsUpdate(from, [sender], "promote");
    await sock.sendMessage(from, { text: "✅ Listo, ahora eres admin." }, { quoted: msg });
  } catch (err) {
    await sock.sendMessage(from, { text: `❌ Error: ${err.message}` }, { quoted: msg });
  }
};
