// commands/cum.js
const { sendNsfwAction } = require("../lib/nsfw");

const CUM_GIFS = [
  "https://tenor.com/view/hentai-cum-gif-1.gif",
  "https://tenor.com/view/hentai-cum-gif-2.gif",
  // Agrega más
];

module.exports = async function cmdCum(sock, msg) {
  await sendNsfwAction(sock, msg, "cum", "{sender} se corrió dentro de {target} 💦", CUM_GIFS);
};
