const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const TMP_DIR = path.join(__dirname, "..", "tmp");

function ensureTmpDir() {
  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });
}

// Corre yt-dlp como proceso externo. Requiere tenerlo instalado en el sistema
// (ver README: `pip install -U yt-dlp` + `pkg install ffmpeg` en Termux).
function runYtDlp(args, timeoutMs = 120000) {
  return new Promise((resolve, reject) => {
    const proc = spawn("yt-dlp", args);
    let stderr = "";

    const timer = setTimeout(() => {
      proc.kill("SIGKILL");
      reject(new Error("La descarga tardó demasiado y se canceló (¿link muy largo o conexión lenta?)."));
    }, timeoutMs);

    proc.stderr.on("data", (d) => {
      stderr += d.toString();
    });

    proc.on("error", (err) => {
      clearTimeout(timer);
      reject(
        new Error(
          `No se pudo ejecutar yt-dlp (${err.message}). ¿Está instalado? Corre: pip install -U yt-dlp`
        )
      );
    });

    proc.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve();
      } else {
        const lastLine = stderr.trim().split("\n").filter(Boolean).pop();
        reject(new Error(lastLine || `yt-dlp terminó con código ${code}`));
      }
    });
  });
}

function isYouTubeUrl(url) {
  return /(youtube\.com|youtu\.be)/i.test(url);
}
function isTikTokUrl(url) {
  return /tiktok\.com/i.test(url);
}
function isInstagramUrl(url) {
  return /instagram\.com/i.test(url);
}
function isSoundCloudUrl(url) {
  return /soundcloud\.com/i.test(url);
}

const USAGE = {
  mp3: "📌 Uso: .mp3 <link de YouTube>",
  mp4: "📌 Uso: .mp4 <link de YouTube>",
  tik: "📌 Uso: .tik <link de TikTok>",
  ig: "📌 Uso: .ig <link de Instagram>",
  sc: "📌 Uso: .sc <link de SoundCloud>",
};

async function downloadAndSend(sock, msg, args, type) {
  const from = msg.key.remoteJid;
  const url = args[0];

  if (!url || !/^https?:\/\//i.test(url)) {
    return sock.sendMessage(from, { text: USAGE[type] }, { quoted: msg });
  }

  if ((type === "mp3" || type === "mp4") && !isYouTubeUrl(url)) {
    return sock.sendMessage(from, { text: "⚠️ Ese link no parece ser de YouTube." }, { quoted: msg });
  }
  if (type === "tik" && !isTikTokUrl(url)) {
    return sock.sendMessage(from, { text: "⚠️ Ese link no parece ser de TikTok." }, { quoted: msg });
  }
  if (type === "ig" && !isInstagramUrl(url)) {
    return sock.sendMessage(from, { text: "⚠️ Ese link no parece ser de Instagram." }, { quoted: msg });
  }
  if (type === "sc" && !isSoundCloudUrl(url)) {
    return sock.sendMessage(from, { text: "⚠️ Ese link no parece ser de SoundCloud." }, { quoted: msg });
  }

  ensureTmpDir();
  const id = crypto.randomBytes(6).toString("hex");
  const outputTemplate = path.join(TMP_DIR, `${id}.%(ext)s`);

  await sock.sendMessage(from, { text: "⏳ Descargando, dame un momento..." }, { quoted: msg });

  let ytArgs;
  if (type === "mp3" || type === "sc") {
    ytArgs = ["-x", "--audio-format", "mp3", "--audio-quality", "0", "--no-playlist", "-o", outputTemplate, url];
  } else if (type === "mp4") {
    // Limitado a 480p, y forzado a H.264/AAC (vcodec avc1) porque WhatsApp no reproduce
    // bien video en VP9/AV1 aunque venga empaquetado en .mp4. --remux-video + faststart
    // aseguran que el índice del archivo (moov atom) quede al inicio, que es lo que
    // suele causar el error "algo falló con el archivo de video" en WhatsApp.
    ytArgs = [
      "-f",
      "bestvideo[height<=480][vcodec^=avc1]+bestaudio[acodec^=mp4a]/best[height<=480][vcodec^=avc1]/best[ext=mp4][vcodec^=avc1]/best[height<=480]/best",
      "--merge-output-format",
      "mp4",
      "--remux-video",
      "mp4",
      "--postprocessor-args",
      "ffmpeg:-movflags +faststart",
      "--no-playlist",
      "-o",
      outputTemplate,
      url,
    ];
  } else {
    // tik / ig — normalmente ya vienen en H.264/AAC, pero igual forzamos remux a mp4
    // con faststart por si el contenedor original no es compatible con el player de WhatsApp.
    ytArgs = [
      "-f",
      "best[ext=mp4]/best",
      "--remux-video",
      "mp4",
      "--postprocessor-args",
      "ffmpeg:-movflags +faststart",
      "--no-playlist",
      "-o",
      outputTemplate,
      url,
    ];
  }

  let filePath;
  try {
    await runYtDlp(ytArgs);

    const files = fs.readdirSync(TMP_DIR).filter((f) => f.startsWith(id));
    if (files.length === 0) {
      throw new Error("No se generó ningún archivo. Puede que el link sea privado, tenga edad restringida o ya no exista.");
    }
    filePath = path.join(TMP_DIR, files[0]);

    const stats = fs.statSync(filePath);
    const MAX_BYTES = 64 * 1024 * 1024;
    if (stats.size > MAX_BYTES) {
      fs.unlinkSync(filePath);
      return sock.sendMessage(
        from,
        { text: "⚠️ El archivo pesa más de 64MB, WhatsApp probablemente lo rechace. Prueba con un video más corto." },
        { quoted: msg }
      );
    }

    const buffer = fs.readFileSync(filePath);

    if (type === "mp3" || type === "sc") {
      await sock.sendMessage(from, { audio: buffer, mimetype: "audio/mpeg", fileName: `${id}.mp3` }, { quoted: msg });
    } else {
      await sock.sendMessage(from, { video: buffer, mimetype: "video/mp4" }, { quoted: msg });
    }
  } catch (err) {
    await sock.sendMessage(from, { text: `❌ No se pudo descargar: ${err.message}` }, { quoted: msg });
  } finally {
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch {
        // no pasa nada si falla la limpieza
      }
    }
  }
}

module.exports = {
  cmdMp3: (sock, msg, args) => downloadAndSend(sock, msg, args, "mp3"),
  cmdMp4: (sock, msg, args) => downloadAndSend(sock, msg, args, "mp4"),
  cmdTik: (sock, msg, args) => downloadAndSend(sock, msg, args, "tik"),
  cmdIg: (sock, msg, args) => downloadAndSend(sock, msg, args, "ig"),
  cmdSc: (sock, msg, args) => downloadAndSend(sock, msg, args, "sc"),
};
