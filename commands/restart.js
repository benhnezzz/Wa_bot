const { spawn, exec } = require("child_process");
const path = require("path");
const { setRestarting } = require("../lib/restartFlag");

// .re — actualiza el repo y reinicia el bot UNA sola vez:
// 1) corre "git pull" en la carpeta del bot
// 2) marca el proceso como "reiniciando" (para que index.js no dispare una
//    segunda reconexión automática al cerrarse la conexión)
// 3) lanza un proceso nuevo idéntico (ya con el código actualizado)
// 4) cierra el proceso actual
// La sesión de WhatsApp (auth_info/) no se pierde, sigue conectado igual.
module.exports = async function cmdRestart(sock, msg, senderIsOwner) {
  const from = msg.key.remoteJid;

  if (!senderIsOwner) {
    return sock.sendMessage(from, { text: "⛔ Solo el owner puede usar este comando." }, { quoted: msg });
  }

  const repoDir = path.join(__dirname, "..");

  await sock.sendMessage(from, { text: "🔄 Actualizando repositorio (git pull)..." }, { quoted: msg });

  exec("git pull", { cwd: repoDir }, async (err, stdout, stderr) => {
    try {
      if (err) {
        await sock.sendMessage(
          from,
          { text: `⚠️ git pull falló, voy a reiniciar igual pero SIN actualizar:\n${err.message}` },
          { quoted: msg }
        );
      } else {
        const output = (stdout || stderr || "").trim() || "ya estaba al día, sin cambios nuevos.";
        await sock.sendMessage(from, { text: `✅ git pull listo:\n${output}` }, { quoted: msg });
      }
    } catch (sendErr) {
      console.error("No se pudo avisar el resultado de git pull:", sendErr.message);
    }

    try {
      await sock.sendMessage(from, { text: "♻️ Reiniciando el bot..." }, { quoted: msg });
    } catch {}

    // Evita que index.js reconecte por su cuenta cuando cerremos la conexión
    // abajo — sin esto, el bot terminaba "reiniciándose 2 veces".
    setRestarting(true);

    const entryFile = path.join(repoDir, "index.js");
    const child = spawn(process.execPath, [entryFile], {
      detached: true,
      stdio: "inherit",
      cwd: repoDir,
    });
    child.unref();

    // Pequeño delay para asegurar que los mensajes de confirmación salieron antes de cerrar
    setTimeout(() => process.exit(0), 800);
  });
};
