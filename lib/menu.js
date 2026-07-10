// Arma la data del menú (comandos por nivel: miembro / admin / owner) en un solo
// lugar, para poder generar tanto un menú de texto plano como una lista interactiva
// de WhatsApp (sock.sendMessage con "sections") a partir de la misma información.

const MEMBER_ITEMS = [
  { id: "sticker", title: ".sticker", desc: "Crear sticker (responde a una imagen o video)" },
  { id: "mp3", title: ".mp3", desc: "Descargar audio de YouTube en MP3" },
  { id: "mp4", title: ".mp4", desc: "Descargar video de YouTube en MP4" },
  { id: "tik", title: ".tik", desc: "Descargar video de TikTok" },
  { id: "ig", title: ".ig", desc: "Descargar video de Instagram" },
  { id: "sc", title: ".sc", desc: "Descargar audio de SoundCloud en MP3" },
];

const ADMIN_ITEMS = [
  { id: "agg", title: ".agg", desc: "Agregar a alguien al grupo" },
  { id: "kick", title: ".kick", desc: "Eliminar a alguien del grupo" },
  { id: "setpp", title: ".setpp", desc: "Cambiar foto del grupo (responde a una imagen)" },
  { id: "setname", title: ".setname", desc: "Cambiar nombre del grupo" },
  { id: "setdesc", title: ".setdesc", desc: "Cambiar descripción del grupo" },
  { id: "adm", title: ".adm", desc: "Dar admin a alguien" },
];

const OWNER_ITEMS = [
  { id: "join", title: ".join", desc: "Unirse a un grupo por link" },
  { id: "admin", title: ".admin", desc: "Autoascenderte a admin" },
  { id: "vaciar", title: ".vaciar", desc: "Eliminar a TODOS del grupo (pide .vaciar confirmar)" },
  { id: "co", title: ".co", desc: "Administrar co-owners" },
  { id: "debugadmin", title: ".debugadmin", desc: "Diagnóstico de admins del grupo" },
];

// Devuelve { sections, plainText } según el nivel de permisos de quien pidió el menú.
function buildMenu({ senderIsOwnerOrCo, senderIsGroupAdmin }) {
  const groups = [{ label: "👥 Miembro", items: MEMBER_ITEMS }];

  if (senderIsOwnerOrCo) {
    groups.push({ label: "👮 Administrador", items: ADMIN_ITEMS });
    groups.push({ label: "👑 Owner", items: OWNER_ITEMS });
  } else if (senderIsGroupAdmin) {
    groups.push({ label: "👮 Administrador", items: ADMIN_ITEMS });
  }

  const sections = groups.map((g) => ({
    title: g.label,
    rows: g.items.map((item) => ({
      rowId: item.id,
      title: item.title,
      description: item.desc,
    })),
  }));

  const plainText = groups
    .map((g) => `${g.label}\n` + g.items.map((item) => `${item.title} — ${item.desc}`).join("\n"))
    .join("\n\n");

  return { sections, plainText: `🤖 *Comandos disponibles*\n\n${plainText}` };
}

module.exports = { buildMenu };
