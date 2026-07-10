const config = require("../config");

// Convierte un número "56977776666" (o con +, espacios, guiones) a JID de WhatsApp
function numberToJid(number) {
  const clean = number.replace(/[^0-9]/g, "");
  return `${clean}@s.whatsapp.net`;
}

function jidToNumber(jid) {
  return jid.split("@")[0].split(":")[0];
}

function isOwner(jid) {
  if (!jid) return false;
  const num = jidToNumber(jid);
  return config.OWNER_NUMBERS.includes(num);
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

// Revisa si el bot es admin dentro de un grupo
async function isBotAdmin(sock, groupId) {
  const metadata = await sock.groupMetadata(groupId);
  const botId = sock.user.id.split(":")[0] + "@s.whatsapp.net";
  const botParticipant = metadata.participants.find(
    (p) => jidToNumber(p.id) === jidToNumber(botId)
  );
  return !!botParticipant?.admin;
}

// Revisa si un participante específico es admin
async function isParticipantAdmin(sock, groupId, jid) {
  const metadata = await sock.groupMetadata(groupId);
  const participant = metadata.participants.find(
    (p) => jidToNumber(p.id) === jidToNumber(jid)
  );
  return !!participant?.admin;
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
  getMessageText,
  getQuotedMessage,
  isBotAdmin,
  isParticipantAdmin,
  extractInviteCode,
};
