const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const readline = require("readline");

const config = require("./config");

// --- Helper para preguntar el número por consola ---
function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) =>
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer.trim());
    })
  );
}
const { isOwner, isOwnerOrCoOwner, getMessageText, isBotAdmin, isBotJid, jidToNumber, requireGroupAdmins } = require("./lib/utils");

const cmdJoin = require("./commands/join");
const cmdSticker = require("./commands/sticker");
const { cmdAdd, cmdKick, cmdVaciar } = require("./commands/participants");
const { cmdSetPP, cmdSetName, cmdSetDesc } = require("./commands/groupSettings");
const cmdSelfAdmin = require("./commands/selfAdmin");
const cmdPromote = require("./commands/promote");
const cmdDemote = require("./commands/demote");
const cmdCoOwner = require("./commands/coowner");
const cmdAntilink = require("./commands/antilink");
const cmdDebugAdmin = require("./commands/debugAdmin");
const cmdCheckWhatsApp = require("./commands/checkWhatsApp");
const cmdRob = require("./commands/rob");
const cmdPing = require("./commands/ping");
const cmdPull = require("./commands/poll");
const cmdStalker = require("./commands/stalker");
const { cmdMp3, cmdMp4, cmdTik, cmdIg, cmdSc } = require("./commands/download");

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("auth_info");
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: "silent" }),
    printQRInTerminal: false,
    browser: ["Ubuntu", "Chrome", "20.0.04"], // requerido para que el pairing code funcione bien
  });

  // --- Vinculación por código en vez de QR ---
  // Si la sesión todavía no está registrada (no hay auth guardada), pedimos el
  // número de WhatsApp del bot (con código de país, sin "+" ni espacios) y
  // solicitamos el código de emparejamiento a WhatsApp.
  if (!sock.authState.creds.registered) {
    const phoneNumber =
      config.PAIRING_NUMBER ||
      process.env.PAIRING_NUMBER ||
      (await askQuestion(
        "📱 Ingresa el número de WhatsApp del bot (con código de país, sin '+' ni espacios, ej: 56912345678): "
      ));

    setTimeout(async () => {
      try {
        const code = await sock.requestPairingCode(phoneNumber.replace(/[^0-9]/g, ""));
        console.log(`🔑 Tu código de emparejamiento es: ${code}`);
        console.log("Ve a WhatsApp > Dispositivos vinculados > Vincular con número de teléfono e ingresa este código.");
      } catch (err) {
        console.error("❌ Error solicitando el código de emparejamiento:", err.message);
      }
    }, 3000);
  }

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update;

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
  sock.ev.on("group-participants.update", async (event) => {
    const { id: groupId, participants, action, author } = event;

    try {
      if (action === "promote" || action === "demote") {
        // Si la acción la ejecutó el bot (porque vino de .promote o .demote), esos
        // comandos ya mandaron su propio aviso mencionando correctamente a quién lo pidió.
        // Si no filtramos esto, saldría un segundo mensaje atribuyéndole la acción al
        // número del bot (porque técnicamente es la cuenta del bot la que la ejecuta),
        // en vez de a la persona real que escribió el comando.
        const authorIsBot = isBotJid(sock, author);

        if (!authorIsBot) {
          const verb = action === "promote" ? "le dio admin a" : "le quitó el admin a";
          const authorTag = author ? `@${jidToNumber(author)}` : "Alguien";
          const targetsTag = participants.map((p) => `@${jidToNumber(p)}`).join(", ");

          await sock.sendMessage(groupId, {
            text: `👑 ${authorTag} ${verb} ${targetsTag}`,
            mentions: [author, ...participants].filter(Boolean),
          });
        }
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
    const senderIsOwnerOrCo = isOwnerOrCoOwner(sender);

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

        case "vc":
          await cmdVaciar(sock, msg, args, isGroup, sender, senderIsOwnerOrCo);
          break;

        case "rob":
          await cmdRob(sock, msg, isGroup, sender, senderIsOwnerOrCo);
          break;

        case "ping":
        case "p":
          await cmdPing(sock, msg);
          break;

        case "pull":
          await cmdPull(sock, msg, args);
          break;

        case "stalker":
          await cmdStalker(sock, msg, args);
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

        case "promote":
          await cmdPromote(sock, msg, args, isGroup, sender);
          break;

        case "demote":
          await cmdDemote(sock, msg, args, isGroup, sender);
          break;

        case "co":
          await cmdCoOwner(sock, msg, args, senderIsOwner);
          break;

        case "antilink":
          await cmdAntilink(sock, msg, args, isGroup, sender);
          break;

        case "debugadmin":
          await cmdDebugAdmin(sock, msg, isGroup);
          break;

        case "wa":
          await cmdCheckWhatsApp(sock, msg, args);
          break;

        case "menu":
        case "help": {
          let senderIsGroupAdmin = false;
          if (isGroup) {
            const { senderIsAdmin } = await requireGroupAdmins(sock, from, sender);
            senderIsGroupAdmin = senderIsAdmin;
          }

          const memberCommands =
            `.sticker <nombre paquete> — crear sticker (responde a imagen/video)\n` +
            `.mp3 <link YouTube> — descargar audio MP3\n` +
            `.mp4 <link YouTube> — descargar video MP4\n` +
            `.tik <link TikTok> — descargar video de TikTok\n` +
            `.ig <link Instagram> — descargar video de Instagram\n` +
            `.sc <link SoundCloud> — descargar audio MP3\n` +
            `.wa <número> — revisa si un número tiene cuenta de WhatsApp\n` +
            `.ping / .p — latencia y estado del bot\n` +
            `.pull p: <pregunta> o1: <op1> o2: <op2>... — crear encuesta y fijarla\n` +
            `.stalker <nombre> — reporte gracioso de edad/género/nacionalidad probable\n` +
            `.menu / .help — ver esta lista`;

          const adminCommands =
            `.agg <número> — agregar a alguien al grupo\n` +
            `.kick <número/mención/respuesta> — eliminar del grupo\n` +
            `.setpp — cambiar foto del grupo (responde a una imagen)\n` +
            `.setname <texto> — cambiar nombre del grupo\n` +
            `.setdesc <texto> — cambiar descripción del grupo\n` +
            `.promote <número/mención/respuesta> — dar admin a alguien\n` +
            `.demote <número/mención/respuesta> — quitar admin a alguien`;

          const ownerCommands =
            `.join <link> — unirse a un grupo\n` +
            `.admin — autoascenderte a admin\n` +
            `.vc — eliminar a TODOS del grupo (sin confirmación, cuidado)\n` +
            `.rob — quitar admin a todos y dárselo al owner (broma)\n` +
            `.co <número> — dar permisos de co-owner\n` +
            `.co del <número> — quitar co-owner\n` +
            `.co list — ver co-owners actuales\n` +
            `.debugadmin — diagnóstico de admins del grupo`;

          let text = `🤖 *Comandos disponibles*\n\n${memberCommands}`;

          if (senderIsOwnerOrCo) {
            text +=
              `\n\n👮 *Comandos de administrador*\n${adminCommands}` +
              `\n\n👑 *Comandos de owner*\n${ownerCommands}`;
          } else if (senderIsGroupAdmin) {
            text += `\n\n👮 *Comandos de administrador*\n${adminCommands}`;
          }

          await sock.sendMessage(from, { text }, { quoted: msg });
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
