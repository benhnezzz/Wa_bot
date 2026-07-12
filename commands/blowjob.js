// commands/blowjob.js
const { sendNsfwAction } = require("../lib/nsfw");

const BJ_GIFS = [
  "https://tenor.com/view/hentai-blowjob-gif-1.gif",
  "https://tenor.com/view/hentai-blowjob-gif-2.gif",
  // Agrega más
];

module.exports = async function cmdBlowjob(sock, msg) {
  await sendNsfwAction(sock, msg, "blowjob", "{sender} le está haciendo una mamada a {target} 🍆💦", BJ_GIFS);
};
