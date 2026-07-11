const { load, save } = require("./db");

const NAME = "coowners";

// Devuelve la lista de números (strings) que son co-owner
function getCoOwners() {
  return load(NAME, []);
}

function addCoOwner(number) {
  const list = getCoOwners();
  if (!list.includes(number)) {
    list.push(number);
    save(NAME, list);
  }
  return list;
}

function removeCoOwner(number) {
  const list = getCoOwners().filter((n) => n !== number);
  save(NAME, list);
  return list;
}

module.exports = { getCoOwners, addCoOwner, removeCoOwner };
