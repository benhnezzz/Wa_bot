// commands/kiss.js
const { sendNsfwAction } = require("../lib/nsfw");

const KISS_GIFS = [
  "https://tenor.com/view/hentai-kiss-gif-1.gif",
  "https://tenor.com/view/hentai-kiss-gif-2.gif",
  // Agrega más
];

module.exports = async function cmdKiss(sock, msg) {
  await sendNsfwAction(sock, msg, "kiss", "{sender} besó apasionadamente a {target} 😘", KISS_GIFS);
};
