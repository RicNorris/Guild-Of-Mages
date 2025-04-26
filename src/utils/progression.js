const pool = require("../utils/database");

async function checkLevelUp(player) {
  const xp = player.xp;
  const level = player.level;

  const xpNeeded = getXPForNextLevel(level);

  if (xp >= xpNeeded) {
    const newLevel = level + 1;
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
