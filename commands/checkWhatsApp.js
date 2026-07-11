const { numberToJid } = require("../lib/utils");

// .wa <número>  ->  revisa si ese número tiene cuenta activa de WhatsApp
module.exports = async function cmdCheckWhatsApp(sock, msg, args) {
  const from = msg.key.remoteJid;

  const number = args[0];
  if (!number) {
    return sock.sendMessage(
      from,
      { text: "📌 Uso: .wa <número, ej: 56977776666>" },
      { quoted: msg }
    );
  }

  const cleanNumber = number.replace(/[^0-9]/g, "");

  try {
    // sock.onWhatsApp consulta directo al servidor de WhatsApp si el número existe
    const [result] = await sock.onWhatsApp(cleanNumber);

    if (result?.exists) {
      await sock.sendMessage(
        from,
        { text: `✅ +${cleanNumber} tiene cuenta de WhatsApp activa.` },
        { quoted: msg }
      );
    } else {
      await sock.sendMessage(
        from,
        { text: `❌ +${cleanNumber} no tiene cuenta de WhatsApp (o no es un número válido).` },
        { quoted: msg }
      );
    }
  } catch (err) {
    await sock.sendMessage(
      from,
      { text: `❌ No pude verificar el número: ${err.message}` },
      { quoted: msg }
    );
  }
};
