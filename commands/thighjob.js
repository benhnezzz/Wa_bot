// commands/thighjob.js
const { sendNsfwAction } = require("../lib/nsfw");

const THIGH_GIFS = [
  "https://tenor.com/view/hentai-thighjob-gif-1.gif",
  "https://tenor.com/view/hentai-thighjob-gif-2.gif",
  // Agrega más
];

module.exports = async function cmdThighjob(sock, msg) {
  await sendNsfwAction(sock, msg, "thighjob", "{sender} le hizo thighjob a {target} 🦵💦", THIGH_GIFS);
};
