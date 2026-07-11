const { blockGroup, unblockGroup, isGroupBlocked } = require("../lib/blockedGroups");

// .block <id del grupo>   (el ID se obtiene con .libgp)
// Mientras un grupo está bloqueado, el bot ignora TODOS los mensajes de ahí,
// incluyendo comandos — ni siquiera responde. Por eso .block/.unblock se
// mandan desde otro chat (privado con el bot, u otro grupo), no desde el
// grupo que se quiere bloquear.
async function cmdBlock(sock, msg, args, senderIsOwner) {
  const from = msg.key.remoteJid;

  if (!senderIsOwner) {
    return sock.sendMessage(from, { text: "⛔ Solo el owner puede usar este comando." }, { quoted: msg });
  }

  const groupId = args[0];
  if (!groupId || !groupId.endsWith("@g.us")) {
    return sock.sendMessage(
      from,
      { text: "📌 Uso: .block <id del grupo>\nUsa .libgp para ver los IDs de los grupos donde está el bot." },
      { quoted: msg }
    );
  }

  if (isGroupBlocked(groupId)) {
    return sock.sendMessage(from, { text: "ℹ️ Ese grupo ya estaba bloqueado." }, { quoted: msg });
  }

  blockGroup(groupId);
  await sock.sendMessage(
    from,
    { text: `🚫 Grupo bloqueado:\n${groupId}\n\nEl bot va a ignorar todos los mensajes ahí hasta que uses .unblock.` },
    { quoted: msg }
  );
}

// .unblock <id del grupo>
async function cmdUnblock(sock, msg, args, senderIsOwner) {
  const from = msg.key.remoteJid;

  if (!senderIsOwner) {
    return sock.sendMessage(from, { text: "⛔ Solo el owner puede usar este comando." }, { quoted: msg });
  }

  const groupId = args[0];
  if (!groupId || !groupId.endsWith("@g.us")) {
    return sock.sendMessage(
      from,
      { text: "📌 Uso: .unblock <id del grupo>" },
      { quoted: msg }
    );
  }

  if (!isGroupBlocked(groupId)) {
    return sock.sendMessage(from, { text: "ℹ️ Ese grupo no estaba bloqueado." }, { quoted: msg });
  }

  unblockGroup(groupId);
  await sock.sendMessage(from, { text: `✅ Grupo desbloqueado:\n${groupId}` }, { quoted: msg });
}

module.exports = { cmdBlock, cmdUnblock };
