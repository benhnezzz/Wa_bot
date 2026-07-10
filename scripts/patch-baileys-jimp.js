// Corrige un bug de @whiskeysockets/baileys al detectar la librería "jimp".
//
// Baileys revisa si jimp está disponible con:
//   typeof Lib.jimp?.Jimp === 'object'
//
// Pero en jimp v1.x, "Jimp" es una CLASE, así que su typeof es 'function', no 'object'.
// Por eso Baileys nunca detecta jimp y tira "No image processing library available"
// aunque jimp esté bien instalado.
//
// Este script busca esa comparación en el código ya instalado de Baileys y la corrige
// para que acepte tanto 'object' como 'function'. Se corre solo (via "postinstall" en
// package.json) cada vez que haces npm install, así que no hay que tocar nada a mano.

const fs = require("fs");
const path = require("path");

const CANDIDATE_PATHS = [
  "node_modules/@whiskeysockets/baileys/lib/Utils/messages-media.js",
  "node_modules/baileys/lib/Utils/messages-media.js",
];

const BROKEN = "typeof Lib.jimp?.Jimp === 'object'";
const FIXED = "(typeof Lib.jimp?.Jimp === 'object' || typeof Lib.jimp?.Jimp === 'function')";

let patchedAny = false;

for (const rel of CANDIDATE_PATHS) {
  const filePath = path.join(process.cwd(), rel);
  if (!fs.existsSync(filePath)) continue;

  const content = fs.readFileSync(filePath, "utf-8");

  if (content.includes(FIXED)) {
    console.log(`✅ [patch-baileys-jimp] ${rel} ya estaba corregido.`);
    patchedAny = true;
    continue;
  }

  if (!content.includes(BROKEN)) {
    console.log(`ℹ️  [patch-baileys-jimp] ${rel} no tiene el patrón esperado (¿ya cambió Baileys?). No se tocó.`);
    continue;
  }

  const newContent = content.split(BROKEN).join(FIXED);
  fs.writeFileSync(filePath, newContent, "utf-8");
  console.log(`✅ [patch-baileys-jimp] ${rel} corregido correctamente.`);
  patchedAny = true;
}

if (!patchedAny) {
  console.log("⚠️  [patch-baileys-jimp] No se encontró el archivo de Baileys a corregir. Si .setpp sigue fallando, avisa.");
}
