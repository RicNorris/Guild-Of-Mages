const pool = require("../utils/database");

async function checkLevelUp(player) {
  const xp = player.xp;
  const level = player.level;

  const xpNeeded = getXPForNextLevel(level);

  if (xp >= xpNeeded) {
    const newLevel = level + 1;

    await pool.query(`UPDATE players SET level = $1 WHERE id = $2`, [
      newLevel,
      player.id,
    ]);

    return {
      leveledUp: true,
      newLevel,
    };
  }

  return {
    leveledUp: false,
  };
}

function getXPForNextLevel(level) {
  return Math.floor(50 + 25 * level + Math.pow(level, 1.3) * 10);
}

module.exports = checkLevelUp;
