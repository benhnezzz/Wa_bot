const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const qrcode = require("qrcode-terminal");

const config = require("./config");
const { isOwner, getMessageText, isBotAdmin, jidToNumber } = require("./lib/utils");

const cmdJoin = require("./commands/join");
const cmdSticker = require("./commands/sticker");
const { cmdAdd, cmdKick } = require("./commands/participants");
const { cmdSetPP, cmdSetName, cmdSetDesc } = require("./commands/groupSettings");
const cmdSelfAdmin = require("./commands/selfAdmin");

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("auth_info");
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: "silent" }),
    printQRInTerminal: false, // manejamos el QR nosotros abajo
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log("📱 Escanea este QR con WhatsApp (Dispositivos vinculados):");
      qrcode.generate(qr, { small: true });
    }

    if (connection === "close") {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      console.log("🔌 Conexión cerrada.", shouldReconnect ? "Reconectando..." : "Sesión cerrada, borra auth_info/ y vuelve a escanear.");
      if (shouldReconnect) startBot();
    } else if (connection === "open") {
      console.log("✅ Bot conectado a WhatsApp.");
    }
  });

  // --- Aviso de cambios de admin (dar/quitar) + auto-admin al owner ---
  sock.ev.on("group-participants-update", async (event) => {
    const { id: groupId, participants, action, author } = event;

    try {
      if (action === "promote" || action === "demote") {
        const verb = action === "promote" ? "le dio admin a" : "le quitó el admin a";
        const authorTag = author ? `@${jidToNumber(author)}` : "Alguien";
        const targetsTag = participants.map((p) => `@${jidToNumber(p)}`).join(", ");

        await sock.sendMessage(groupId, {
          text: `👑 ${authorTag} ${verb} ${targetsTag}`,
          mentions: [author, ...participants].filter(Boolean),
        });
      }

      if (action === "add" && config.AUTO_ADMIN_OWNER) {
        for (const p of participants) {
          if (isOwner(p)) {
            const botAdmin = await isBotAdmin(sock, groupId);
            if (botAdmin) {
              await sock.groupParticipantsUpdate(groupId, [p], "promote");
              await sock.sendMessage(groupId, {
                text: `✅ Bienvenido owner @${jidToNumber(p)}, te di admin automáticamente.`,
                mentions: [p],
              });
            }
          }
        }
      }
    } catch (err) {
      console.error("Error en group-participants-update:", err.message);
    }
  });

  // --- Router de comandos ---
  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const from = msg.key.remoteJid;
    const isGroup = from.endsWith("@g.us");
    const sender = isGroup ? msg.key.participant : from;

    const body = getMessageText(msg);
    if (!body || !body.startsWith(config.PREFIX)) return;

    const args = body.slice(config.PREFIX.length).trim().split(/\s+/);
    const command = args.shift().toLowerCase();
    const senderIsOwner = isOwner(sender);

    try {
      switch (command) {
        case "join":
          await cmdJoin(sock, msg, args, senderIsOwner);
          break;

        case "sticker":
        case "s":
          await cmdSticker(sock, msg, args);
          break;

        case "agg":
        case "add":
          await cmdAdd(sock, msg, args, isGroup);
          break;

        case "kick":
        case "del":
          await cmdKick(sock, msg, args, isGroup);
          break;

        case "setpp":
          await cmdSetPP(sock, msg, isGroup);
          break;

        case "setname":
          await cmdSetName(sock, msg, args, isGroup);
          break;

        case "setdesc":
          await cmdSetDesc(sock, msg, args, isGroup);
          break;

        case "admin":
          await cmdSelfAdmin(sock, msg, isGroup, senderIsOwner);
          break;

        case "menu":
        case "help":
          await sock.sendMessage(
            from,
            {
              text:
                `🤖 *Comandos disponibles*\n\n` +
                `.join <link> — unirse a un grupo (owner)\n` +
                `.sticker <nombre paquete> — crear sticker (responde a imagen/video)\n` +
                `.agg <número> — agregar a alguien al grupo\n` +
                `.kick <número/mención/respuesta> — eliminar del grupo\n` +
                `.setpp — cambiar foto del grupo (responde a imagen)\n` +
                `.setname <texto> — cambiar nombre del grupo\n` +
                `.setdesc <texto> — cambiar descripción del grupo\n` +
                `.admin — el owner se autoasciende (si el bot ya es admin)`,
            },
            { quoted: msg }
          );
          break;

        default:
          break;
      }
    } catch (err) {
      console.error("Error procesando comando:", err);
      await sock.sendMessage(from, { text: `❌ Ocurrió un error: ${err.message}` }, { quoted: msg });
    }
  });
}

startBot();
