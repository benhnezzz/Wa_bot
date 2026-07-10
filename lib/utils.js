const { jidNormalizedUser } = require("@whiskeysockets/baileys");
const config = require("../config");
const { getCoOwners } = require("./coowners");

// Convierte un número "56977776666" (o con +, espacios, guiones) a JID de WhatsApp
function numberToJid(number) {
  const clean = number.replace(/[^0-9]/g, "");
  return `${clean}@s.whatsapp.net`;
}

function jidToNumber(jid) {
  if (!jid) return "";
  return jid.split("@")[0].split(":")[0];
}

function isOwner(jid) {
  if (!jid) return false;
  const num = jidToNumber(jid);
  return config.OWNER_NUMBERS.includes(num);
}

// Owner original O agregado como co-owner con .co
function isOwnerOrCoOwner(jid) {
  if (!jid) return false;
  if (isOwner(jid)) return true;
  const num = jidToNumber(jid);
  return getCoOwners().includes(num);
}

// Extrae el texto de cualquier tipo de mensaje (texto normal, con caption, etc.)
function getMessageText(msg) {
  const m = msg.message;
  if (!m) return "";
  return (
    m.conversation ||
    m.extendedTextMessage?.text ||
    m.imageMessage?.caption ||
    m.videoMessage?.caption ||
    ""
  );
}

// Devuelve el mensaje citado (si el usuario respondió a otro mensaje)
function getQuotedMessage(msg) {
  const ctx = msg.message?.extendedTextMessage?.contextInfo;
  if (!ctx?.quotedMessage) return null;
  return {
    message: ctx.quotedMessage,
    participant: ctx.participant,
    stanzaId: ctx.stanzaId,
  };
}

// Revisa si el bot es admin dentro de un grupo.
// OJO: esto es solo informativo (para el .menu o avisos), NO se usa para bloquear
// comandos, porque la detección de JIDs con el sistema @lid de WhatsApp no siempre
// es exacta. Los comandos que necesitan ser admin intentan la acción directamente
// y manejan el error si WhatsApp la rechaza (ver friendlyGroupError más abajo).
async function isBotAdmin(sock, groupId) {
  try {
    const metadata = await sock.groupMetadata(groupId);
    const myId = jidNormalizedUser(sock.user.id);
    const myNumber = jidToNumber(myId);
    const myLid = sock.user.lid ? jidNormalizedUser(sock.user.lid) : null;

    const botParticipant = metadata.participants.find((p) => {
      const pId = jidNormalizedUser(p.id);
      if (pId === myId) return true;
      if (myLid && pId === myLid) return true;
      if (jidToNumber(pId) === myNumber) return true;
      return false;
    });

    return !!botParticipant?.admin;
  } catch {
    return false;
  }
}

// Revisa si un participante específico es admin (informativo)
async function isParticipantAdmin(sock, groupId, jid) {
  try {
    const metadata = await sock.groupMetadata(groupId);
    const target = jidNormalizedUser(jid);
    const targetNumber = jidToNumber(target);

    const participant = metadata.participants.find((p) => {
      const pId = jidNormalizedUser(p.id);
      return pId === target || jidToNumber(pId) === targetNumber;
    });

    return !!participant?.admin;
  } catch {
    return false;
  }
}

// Verifica que TANTO el que envía el comando COMO el bot sean admins del grupo.
// Devuelve { senderIsAdmin, botIsAdmin, ok } donde ok = ambos son admin.
async function requireGroupAdmins(sock, groupId, sender) {
  const [senderIsAdmin, botIsAdmin] = await Promise.all([
    isParticipantAdmin(sock, groupId, sender),
    isBotAdmin(sock, groupId),
  ]);
  return { senderIsAdmin, botIsAdmin, ok: senderIsAdmin && botIsAdmin };
}

// Traduce errores típicos de WhatsApp/Baileys al intentar acciones de grupo
// (agregar, eliminar, cambiar foto/nombre, promover) a un mensaje entendible.
function friendlyGroupError(err) {
  const statusCode = err?.output?.statusCode || err?.status || err?.data?.status;
  const raw = (err?.message || "").toLowerCase();

  if (
    statusCode === 401 ||
    statusCode === 403 ||
    raw.includes("not-authorized") ||
    raw.includes("forbidden")
  ) {
    return (
      "⛔ WhatsApp rechazó la acción: el bot no tiene permisos de admin en este grupo " +
      "(o los perdió). Verifica en la info del grupo que el bot siga apareciendo como administrador."
    );
  }

  if (raw.includes("reachout_restricted")) {
    return (
      "⚠️ WhatsApp no permite agregar a ese número directamente (su privacidad no lo permite, " +
      "o WhatsApp está limitando temporalmente esta acción en la cuenta del bot). " +
      "Prueba enviándole el link de invitación del grupo en su lugar."
    );
  }

  if (raw.includes("no image processing library available")) {
    return (
      "⚠️ Falta una librería para procesar imágenes. Corre `npm install` de nuevo en la carpeta " +
      "del bot (se agregó `jimp` a package.json) y vuelve a intentar el comando."
    );
  }

  return `❌ Error: ${err.message || err}`;
}

// Saca el código de invitación de un link tipo https://chat.whatsapp.com/XXXXXXXX
function extractInviteCode(link) {
  const match = link.match(/chat\.whatsapp\.com\/([A-Za-z0-9]+)/);
  return match ? match[1] : null;
}

module.exports = {
  numberToJid,
  jidToNumber,
  isOwner,
  isOwnerOrCoOwner,
  getMessageText,
  getQuotedMessage,
  isBotAdmin,
  isParticipantAdmin,
  requireGroupAdmins,
  friendlyGroupError,
  extractInviteCode,
};
