// commands/creampie.js
const { sendNsfwAction } = require("../lib/nsfw");

const CREAMPIE_GIFS = [
  "https://tenor.com/view/hentai-creampie-gif-1.gif",
  "https://tenor.com/view/hentai-creampie-gif-2.gif",
  // Agrega más
];

module.exports = async function cmdCreampie(sock, msg) {
  await sendNsfwAction(sock, msg, "creampie", "{sender} le hizo creampie a {target} 🍆💦", CREAMPIE_GIFS);
};
