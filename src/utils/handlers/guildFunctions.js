const pool = require("../database");

async function getGuildData(guildId) {
  const result = await pool.query(
    `SELECT * FROM guilds WHERE discord_guild_id = $1`,
    [guildId]
  );
  if (result.rows.length === 0) {
    throw new Error("Guild not found.");
  }
  return result.rows[0];
}

async function getGuildTowerData(guildId) {
  const guildResult = await getGuildData(guildId);

  const guildIdFromResult = guildResult.id;

  const result = await pool.query(
    `SELECT * FROM guild_towers WHERE guild_id = $1`,
    [guildIdFromResult]
  );
  if (result.rows.length === 0) {
    throw new Error("Guild tower not found.");
  }
  return result.rows[0];
}

module.exports = {
  getGuildData,
  getGuildTowerData,
};
