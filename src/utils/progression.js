const pool = require("../utils/database");
const { getAllSpells } = require("./spells/spellIndex");

async function checkLevelUp(player) {
  const xp = player.xp;
  const level = player.level;

  const xpNeeded = getXPForNextLevel(level);

  if (xp >= xpNeeded) {
    const newLevel = level + 1;

    const { rows } = await pool.query(
      `SELECT spellbook FROM players WHERE id = $1`,
      [player.id]
    );
    const spellbook = rows[0].spellbook || [];
    
    const allSpells = getAllSpells();
    const newlyUnlockedSpells = allSpells
      .filter(
        (spell) =>
          spell.unlockLevel === newLevel && !spellbook.includes(spell.id)
      )
      .map((spell) => spell.id);
    
    if (newlyUnlockedSpells.length > 0) {
      await pool.query(
        `UPDATE players SET spellbook = spellbook || $1::jsonb WHERE id = $2`,
        [JSON.stringify(newlyUnlockedSpells), player.id]
      );
    }
    
    const newRank = getRankFromLevel(newLevel);

    await pool.query(`UPDATE players SET level = $1, rank = $2 WHERE id = $3`, [
      newLevel,
      newRank,
      player.id,
    ]);

    return {
      leveledUp: true,
      newLevel,
      newRank,
      newSpells: newlyUnlockedSpells,
    };
  }

  return {
    leveledUp: false,
  };
}

function getRankFromLevel(level) {
  if (level >= 31) return "Ascendant";
  if (level >= 21) return "Archmage";
  if (level >= 11) return "Magus";
  if (level >= 6) return "Acolyte";
  return "Novice";
}

function getXPForNextLevel(level) {
  return Math.floor(50 + 25 * level + Math.pow(level, 1.3) * 10);
}

module.exports = checkLevelUp;
