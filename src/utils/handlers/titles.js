const pool = require("../database");

// Function to add a title to a player
async function addTitleToPlayer(playerId, title, source) {
  const newTitle = {
    title,
    source,
    earned_at: new Date().toISOString(),
  };

  // Update player's unlocked_titles with the new title
  await pool.query(
    `UPDATE players 
     SET unlocked_titles = jsonb_insert(
       COALESCE(unlocked_titles, '[]'::jsonb), 
       '{-1}', 
       $1
     )
     WHERE id = $2`,
    [JSON.stringify(newTitle), playerId]
  );
}

async function equipTitle(playerId, selectedTitle) {
  // Check if the title exists in unlocked_titles
  const result = await pool.query(
    `SELECT unlocked_titles FROM players WHERE id = $1`,
    [playerId]
  );

  const unlockedTitles = result.rows[0].unlocked_titles;

  const titleToEquip = unlockedTitles.find(
    (title) => title.title === selectedTitle
  );

  if (!titleToEquip) {
    throw new Error("Title not unlocked.");
  }

  // Update the player's current title
  await pool.query(
    `UPDATE players 
       SET current_title = $1 
       WHERE id = $2`,
    [selectedTitle, playerId]
  );
}

module.exports = {
  addTitleToPlayer,
  equipTitle,
};
