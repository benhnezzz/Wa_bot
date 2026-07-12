// commands/sex.js
const { sendNsfwAction } = require("../lib/nsfw");

const SEX_GIFS = [
  "https://tenor.com/view/hentai-sex-gif-1.gif",
  "https://tenor.com/view/hentai-sex-gif-2.gif",
  "https://tenor.com/view/hentai-sex-gif-3.gif",
  // Agrega más GIFs aquí
];

module.exports = async function cmdSex(sock, msg) {
  await sendNsfwAction(sock, msg, "sex", "{sender} se ha follado a {target} 💦", SEX_GIFS);
};
