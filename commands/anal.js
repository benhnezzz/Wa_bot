// commands/anal.js
const { sendNsfwAction } = require("../lib/nsfw");

const ANAL_GIFS = [
  "https://tenor.com/view/hentai-anal-gif-1.gif",
  "https://tenor.com/view/hentai-anal-gif-2.gif",
  // Agrega más
];

module.exports = async function cmdAnal(sock, msg) {
  await sendNsfwAction(sock, msg, "anal", "{sender} le dio por el culo a {target} 🍑", ANAL_GIFS);
};
