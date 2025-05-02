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
