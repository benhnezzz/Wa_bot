const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");
const FILE_PATH = path.join(DATA_DIR, "coowners.json");

function ensureFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(FILE_PATH)) fs.writeFileSync(FILE_PATH, JSON.stringify([]));
}

// Devuelve la lista de números (strings) que son co-owner
function getCoOwners() {
  ensureFile();
  try {
    const raw = fs.readFileSync(FILE_PATH, "utf-8");
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function addCoOwner(number) {
  ensureFile();
  const list = getCoOwners();
  if (!list.includes(number)) {
    list.push(number);
    fs.writeFileSync(FILE_PATH, JSON.stringify(list, null, 2));
  }
  return list;
}

function removeCoOwner(number) {
  ensureFile();
  const list = getCoOwners().filter((n) => n !== number);
  fs.writeFileSync(FILE_PATH, JSON.stringify(list, null, 2));
  return list;
}

module.exports = { getCoOwners, addCoOwner, removeCoOwner };
