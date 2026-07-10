const { numberToJid, jidToNumber, requireGroupAdmins, friendlyGroupError } = require("../lib/utils");

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

// .vaciar — elimina a TODOS los participantes del grupo (menos el bot).
// Permitido para: administradores del grupo, owner o co-owner (aunque no sean admin del grupo).
// Pide confirmación explícita (.vaciar confirmar) porque es una acción destructiva e irreversible.
// .vaciar — elimina a TODOS los participantes del grupo (menos el bot).
// Permitido SOLO para: owner o co-owner (ser admin del grupo ya no es suficiente).
// Pide confirmación explícita (.vaciar confirmar) porque es una acción destructiva e irreversible.
async function cmdVaciar(sock, msg, args, isGroup, sender, senderIsOwnerOrCo) {
  const from = msg.key.remoteJid;

  if (!isGroup) {
    return sock.sendMessage(from, { text: "⛔ Este comando solo funciona en grupos." }, { quoted: msg });
  }

  if (!senderIsOwnerOrCo) {
    return sock.sendMessage(
      from,
      { text: "⛔ Solo el owner o un co-owner pueden usar este comando." },
      { quoted: msg }
    );
  }

  const { botIsAdmin } = await requireGroupAdmins(sock, from, sender);
  if (!botIsAdmin) {
    return sock.sendMessage(from, { text: "⛔ Necesito ser administrador del grupo para hacer esto." }, { quoted: msg });
  }

  if ((args[0] || "").toLowerCase() !== "confirmar") {
    return sock.sendMessage(
      from,
      {
        text:
          "⚠️ Esto va a ELIMINAR A TODOS los participantes del grupo (menos el bot). No se puede deshacer.\n\n" +
          "Si estás seguro, escribe: *.vaciar confirmar*",
      },
      { quoted: msg }
    );
  }

  let metadata;
  try {
    metadata = await sock.groupMetadata(from);
  } catch (err) {
    return sock.sendMessage(from, { text: friendlyGroupError(err) }, { quoted: msg });
  }

  const myNumber = jidToNumber(sock.user.id);
  const targets = metadata.participants
    .map((p) => p.id)
    .filter((jid) => jidToNumber(jid) !== myNumber);

  if (targets.length === 0) {
    return sock.sendMessage(from, { text: "ℹ️ No hay a quién eliminar (el grupo ya solo tiene al bot)." }, { quoted: msg });
  }

  await sock.sendMessage(from, { text: `🧹 Vaciando grupo… ${targets.length} participante(s) a eliminar.` }, { quoted: msg });

  // Se remueve en tandas pequeñas con pausas para reducir el riesgo de que WhatsApp
  // marque al bot como spam/abuso por remociones masivas muy rápidas.
  const BATCH_SIZE = 5;
  const DELAY_MS = 2000;
  let removed = 0;
  let failed = 0;

  for (let i = 0; i < targets.length; i += BATCH_SIZE) {
    const batch = targets.slice(i, i + BATCH_SIZE);
    try {
      const result = await sock.groupParticipantsUpdate(from, batch, "remove");
      for (const r of result) {
        if (r.status === "200") removed++;
        else failed++;
      }
    } catch {
      failed += batch.length;
    }
    if (i + BATCH_SIZE < targets.length) {
      await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
    }
  }

  await sock.sendMessage(
    from,
    { text: `✅ Grupo vaciado. Eliminados: ${removed}. Fallidos (ej. el creador del grupo no se puede quitar): ${failed}.` },
    { quoted: msg }
  );
}

module.exports = { cmdAdd, cmdKick, cmdVaciar };
