const combatSpells = require("./combatSpells");
const supportSpells = require("./supportSpells");
const guildSpells = require("./guildSpells");

const allSpells = [...combatSpells, ...supportSpells, ...guildSpells];

function getAllSpells() {
  return allSpells;
}

function getSpellById(id) {
  return allSpells.find((spell) => spell.id === id);
}

function getSpellsByType(type) {
  return allSpells.filter((spell) => spell.type === type);
}

function isCombatSpell(id) {
  const spell = getSpellById(id);
  return spell?.type === "combat";
}

module.exports = {
  getAllSpells,
  getSpellById,
  getSpellsByType,
  isCombatSpell,
};
