const { spawn } = require("child_process");
const path = require("path");

// .re — reinicia el bot. Lanza un proceso nuevo idéntico y cierra el actual.
// La sesión de WhatsApp (auth_info/) no se pierde, sigue conectado igual.
module.exports = async function cmdRestart(sock, msg, senderIsOwner) {
  const from = msg.key.remoteJid;

  if (!senderIsOwner) {
    return sock.sendMessage(from, { text: "⛔ Solo el owner puede usar este comando." }, { quoted: msg });
  }

  await sock.sendMessage(from, { text: "♻️ Reiniciando el bot..." }, { quoted: msg });

  const entryFile = path.join(__dirname, "..", "index.js");
  const child = spawn(process.execPath, [entryFile], {
    detached: true,
    stdio: "inherit",
    cwd: path.join(__dirname, ".."),
  });
  child.unref();

  // Pequeño delay para asegurar que el mensaje de confirmación salió antes de cerrar
  setTimeout(() => process.exit(0), 800);
};
