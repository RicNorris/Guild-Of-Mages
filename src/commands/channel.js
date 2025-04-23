const { SlashCommandBuilder } = require("discord.js");
const pool = require("../utils/database");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("channel")
    .setDescription("Channel energy into the guild"),

  async execute(interaction) {
    try {
      // Fetch the player info
      const discordUserId = interaction.user.id;
      const discordGuildId = interaction.guild.id;

      const playerResult = await pool.query(
        "SELECT * FROM players WHERE discord_user_id = $1",
        [discordUserId]
      );

      // Check if player is channeling in the right guild
      if (playerResult.rows.length === 0) {
        return interaction.reply({
          content: "You are not registered as a mage in this guild.",
          ephemeral: true,
        });
      }

      const player = playerResult.rows[0];

      //Check if player has meditated in the last 2 hours
      const now = new Date();
      const elapsed = now - new Date(player.last_meditation_at);
      //const cooldown = 2 * 60 * 60 * 1000; //2 hours in ms 
      
      const cooldown = 0;
    } catch (err) {
      console.error(err);
      return interaction.reply({
        content: "There was an error channeling energy.",
        ephemeral: true,
      });
    }
  },
};
