const pool = require("../../database");
const meditationAchievements = require("../meditationAchievements/meditation_achievements");
const { addTitleToPlayer } = require("../../handlers/titles");

async function checkMeditationAchievements(playerId) {
  const unlocked = [];

  // Get total meditation sessions
  const { rows } = await pool.query(
    `SELECT COUNT(*) FROM player_meditations WHERE player_id = $1`,
    [playerId]
  );
  const totalSessions = parseInt(rows[0].count);

  for (const achievement of meditationAchievements) {
    if (totalSessions >= achievement.sessionsRequired) {
      // Check if already unlocked
      const exists = await pool.query(
        `SELECT 1 FROM player_achievements WHERE player_id = $1 AND achievement_name = $2`,
        [playerId, achievement.name]
      );

      if (exists.rows.length === 0) {
        // Unlock achievement
        await pool.query(
          `INSERT INTO player_achievements (player_id, achievement_name, description, unlocked_at)
           VALUES ($1, $2, $3, NOW())`,
          [playerId, achievement.name, achievement.description]
        );

        unlocked.push(achievement);

        // If the achievement unlocks a title, add it to the player
        if (achievement.title) {
          await addTitleToPlayer(
            playerId,
            achievement.title,
            `Achievement: ${achievement.name}`
          );
        }
      }
    }
  }

  return unlocked;
}

module.exports = checkMeditationAchievements;
