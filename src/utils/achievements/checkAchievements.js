const pool = require("../database");
const { addTitleToPlayer } = require("../handlers/titles");

async function checkAchievements(playerId, progressType, achievementList) {
  const unlocked = [];

  // Get current progress
  const { rows } = await pool.query(
    `SELECT progress_count FROM player_progress 
     WHERE player_id = $1 AND progress_type = $2`,
    [playerId, progressType]
  );

  const currentProgress =
    rows.length > 0 ? parseInt(rows[0].progress_count) : 0;

  for (const achievement of achievementList) {
    if (currentProgress >= achievement.required) {
      // Check if already unlocked
      const exists = await pool.query(
        `SELECT 1 FROM player_achievements 
         WHERE player_id = $1 AND achievement_name = $2`,
        [playerId, achievement.name]
      );

      if (exists.rows.length === 0) {
        // Unlock it
        await pool.query(
          `INSERT INTO player_achievements 
           (player_id, achievement_name, description, unlocked_at)
           VALUES ($1, $2, $3, NOW())`,
          [playerId, achievement.name, achievement.description]
        );

        unlocked.push(achievement);

        // Grant title if applicable
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

module.exports = checkAchievements;
