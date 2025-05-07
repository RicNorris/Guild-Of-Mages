const pool = require("../database");
async function getPlayerData(playerId) {
  // get player data from the database
  const result = await pool.query(`SELECT * FROM players WHERE id = $1`, [
    playerId,
  ]);
  if (result.rows.length === 0) {
    throw new Error("Player not found.");
  }
  return result.rows[0];
}

async function regeneratePlayerMana() {
  try {
    // Query to update player mana
    const result = await pool.query(
      `UPDATE players
       SET mana = LEAST(mana + mana_regen_rate, max_mana)
       WHERE mana < max_mana`
    );

    console.log(`Regenerated mana for ${result.rowCount} players`);
  } catch (err) {
    console.error("Error regenerating mana:", err);
  }
}

module.exports = {
  getPlayerData,
  startManaRegenLoop: function startManaRegenLoop(intervalMs = 60_000) {
    setInterval(regeneratePlayerMana, intervalMs);
  },
};
