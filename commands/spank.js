// commands/spank.js
const { sendNsfwAction } = require("../lib/nsfw");

const SPANK_GIFS = [
  "https://tenor.com/view/hentai-spank-gif-1.gif",
  "https://tenor.com/view/hentai-spank-gif-2.gif",
  // Agrega más
];

module.exports = async function cmdSpank(sock, msg) {
  await sendNsfwAction(sock, msg, "spank", "{sender} le dio nalgadas a {target} 🍑🔥", SPANK_GIFS);
};
