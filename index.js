const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const qrcode = require("qrcode-terminal");

const config = require("./config");
const { isOwner, isOwnerOrCoOwner, getMessageText, isBotAdmin, jidToNumber, requireGroupAdmins } = require("./lib/utils");

const cmdJoin = require("./commands/join");
const cmdSticker = require("./commands/sticker");
const { cmdAdd, cmdKick, cmdVaciar } = require("./commands/participants");
const { cmdSetPP, cmdSetName, cmdSetDesc } = require("./commands/groupSettings");
const cmdSelfAdmin = require("./commands/selfAdmin");
const cmdPromote = require("./commands/promote");
const cmdCoOwner = require("./commands/coowner");
const cmdDebugAdmin = require("./commands/debugAdmin");
const { cmdMp3, cmdMp4, cmdTik, cmdIg, cmdSc } = require("./commands/download");
const { buildMenu } = require("./lib/menu");

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

    // Si el mensaje es porque tocaron una opción del menú interactivo (lista de WhatsApp),
    // lo tratamos como si hubieran escrito ese comando (sin argumentos).
    const listReplyId = msg.message?.listResponseMessage?.singleSelectReply?.selectedRowId;

    let command, args;
    if (listReplyId) {
      command = listReplyId.toLowerCase();
      args = [];
    } else {
      const body = getMessageText(msg);
      if (!body || !body.startsWith(config.PREFIX)) return;
      args = body.slice(config.PREFIX.length).trim().split(/\s+/);
      command = args.shift().toLowerCase();
    }

    const senderIsOwner = isOwner(sender);
    const senderIsOwnerOrCo = isOwnerOrCoOwner(sender);

    // 🔎 LOG TEMPORAL DE DIAGNÓSTICO — bórralo cuando el owner ya se detecte bien.
    console.log(
      `[debug] sender JID: "${sender}" | número extraído: "${jidToNumber(sender)}" | ` +
      `OWNER_NUMBERS: ${JSON.stringify(config.OWNER_NUMBERS)} | ¿es owner?: ${senderIsOwner}`
    );

    try {
      switch (command) {
        case "join":
          await cmdJoin(sock, msg, args, sender);
          break;

        case "sticker":
        case "s":
          await cmdSticker(sock, msg, args);
          break;

        case "agg":
        case "add":
          await cmdAdd(sock, msg, args, isGroup, sender);
          break;

        case "kick":
        case "del":
          await cmdKick(sock, msg, args, isGroup, sender);
          break;

        case "vaciar":
          await cmdVaciar(sock, msg, args, isGroup, sender, senderIsOwnerOrCo);
          break;

        case "mp3":
          await cmdMp3(sock, msg, args);
          break;

        case "mp4":
          await cmdMp4(sock, msg, args);
          break;

        case "tik":
          await cmdTik(sock, msg, args);
          break;

        case "ig":
          await cmdIg(sock, msg, args);
          break;

        case "sc":
          await cmdSc(sock, msg, args);
          break;

        case "setpp":
          await cmdSetPP(sock, msg, isGroup, sender);
          break;

        case "setname":
          await cmdSetName(sock, msg, args, isGroup, sender);
          break;

        case "setdesc":
          await cmdSetDesc(sock, msg, args, isGroup, sender);
          break;

        case "admin":
          await cmdSelfAdmin(sock, msg, isGroup, senderIsOwnerOrCo);
          break;

        case "adm":
          await cmdPromote(sock, msg, args, isGroup, sender);
          break;

        case "co":
          await cmdCoOwner(sock, msg, args, senderIsOwner);
          break;

        case "debugadmin":
          await cmdDebugAdmin(sock, msg, isGroup);
          break;

        case "menu":
        case "help": {
          let senderIsGroupAdmin = false;
          if (isGroup) {
            const { senderIsAdmin } = await requireGroupAdmins(sock, from, sender);
            senderIsGroupAdmin = senderIsAdmin;
          }

          const { sections, plainText } = buildMenu({ senderIsOwnerOrCo, senderIsGroupAdmin });

          try {
            await sock.sendMessage(
              from,
              {
                text: "Elige un comando para ver cómo se usa 👇",
                footer: "Bot de WhatsApp",
                title: "🤖 Comandos disponibles",
                buttonText: "Ver comandos",
                sections,
              },
              { quoted: msg }
            );
          } catch (err) {
            // El mensaje de lista interactiva no siempre funciona en cuentas personales
            // de WhatsApp (es una función pensada para WhatsApp Business API). Si falla,
            // no te quedas sin menú: cae automáticamente al de texto plano.
            console.error("No se pudo enviar el menú interactivo, uso texto plano:", err.message);
            await sock.sendMessage(from, { text: plainText }, { quoted: msg });
          }
          break;
        }

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
