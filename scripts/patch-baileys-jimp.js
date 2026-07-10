// Corrige un bug de @whiskeysockets/baileys al detectar la librería "jimp".
//
// Baileys revisa si jimp está disponible con algo como:
//   typeof Lib.jimp?.Jimp === 'object'
//
// Pero en jimp v1.x, "Jimp" es una CLASE, así que su typeof es 'function', no 'object'.
// Por eso Baileys nunca detecta jimp y tira "No image processing library available"
// aunque jimp esté bien instalado.
//
// Este script busca esa comparación en el código ya instalado de Baileys (con una regex
// tolerante a comillas simples/dobles y espacios) y la corrige para que acepte tanto
// 'object' como 'function'. Se corre solo (via "postinstall" en package.json) cada vez
// que haces npm install, así que no hay que tocar nada a mano.

const fs = require("fs");
const path = require("path");

const CANDIDATE_PATHS = [
  "node_modules/@whiskeysockets/baileys/lib/Utils/messages-media.js",
  "node_modules/baileys/lib/Utils/messages-media.js",
];

// Coincide con: typeof Lib.jimp?.Jimp === 'object'  (comillas simples o dobles, con o sin espacios raros)
const PATTERN = /typeof\s+Lib\.jimp\?\.Jimp\s*===\s*(['"])object\1/g;

let patchedAny = false;
let foundFileButNoMatch = false;

for (const rel of CANDIDATE_PATHS) {
  const filePath = path.join(process.cwd(), rel);
  if (!fs.existsSync(filePath)) continue;

  const content = fs.readFileSync(filePath, "utf-8");

  const alreadyFixedCount = (content.match(/Lib\.jimp\?\.Jimp\s*===\s*(['"])object\1\s*\|\|/g) || []).length;
  const matches = content.match(PATTERN) || [];

  if (matches.length === 0 && alreadyFixedCount > 0) {
    console.log(`✅ [patch-baileys-jimp] ${rel} ya estaba corregido.`);
    patchedAny = true;
    continue;
  }

  if (matches.length === 0) {
    foundFileButNoMatch = true;
    // Diagnóstico: muestra el fragmento real alrededor del error para comparar a mano.
    const idx = content.indexOf("No image processing library available");
    const snippet = idx >= 0 ? content.slice(Math.max(0, idx - 400), idx + 60) : "(no se encontró ni el mensaje de error en el archivo)";
    console.log(`ℹ️  [patch-baileys-jimp] ${rel} no tiene el patrón esperado exacto. Fragmento real encontrado:\n${snippet}`);
    continue;
  }

  const newContent = content.replace(
    PATTERN,
    (full, quote) => `(typeof Lib.jimp?.Jimp === ${quote}object${quote} || typeof Lib.jimp?.Jimp === ${quote}function${quote})`
  );
  fs.writeFileSync(filePath, newContent, "utf-8");
  console.log(`✅ [patch-baileys-jimp] ${rel} corregido correctamente (${matches.length} ocurrencia(s)).`);
  patchedAny = true;
}

if (!patchedAny) {
  if (foundFileButNoMatch) {
    console.log("⚠️  [patch-baileys-jimp] Se encontró el archivo pero no el patrón esperado. Copia el fragmento de arriba y compártelo.");
  } else {
    console.log("⚠️  [patch-baileys-jimp] No se encontró el archivo de Baileys a corregir. Si .setpp sigue fallando, avisa.");
  }
}
