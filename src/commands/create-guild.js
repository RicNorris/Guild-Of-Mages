const { SlashCommandBuilder } = require("discord.js");
const pool = require("../utils/database");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("create-guild")
    .setDescription("Create a new mage guild for this server.")
    .addStringOption((option) =>
      option
        .setName("name")
        .setDescription("Name of the guild")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("description")
        .setDescription("Description of the guild")
        .setRequired(false)
    ),

  async execute(interaction) {
    const name = interaction.options.getString("name");
    const description = interaction.options.getString("description");
    const discord_guild_id = interaction.guild.id;
    const owner_id = interaction.user.id;

    try {
      // Check if the server already has a guild
      const serverCheck = await pool.query(
        "SELECT * FROM guilds WHERE discord_guild_id = $1",
        [discord_guild_id]
      );

      if (serverCheck.rows.length > 0) {
        return interaction.reply({
          content: "This server already has a guild.",
          ephemeral: true,
        });
      }

      // Check if the user already created a guild
      const userCheck = await pool.query(
        "SELECT * FROM guilds WHERE owner_id = $1",
        [owner_id]
      );

      if (userCheck.rows.length > 0) {
        return interaction.reply({
          content: "You've already created a guild in another server.",
          ephemeral: true,
        });
      }

      // Check if user is already in another guild
      const userInAnotherGuildCheck = await pool.query(
        "SELECT * FROM players WHERE discord_user_id = $1",
        [owner_id]
      );

      if (userInAnotherGuildCheck.rows.length > 0) {
        return interaction.reply({
          content: "You are already in a guild",
          ephemeral: true,
        });
      }

      // Check if there is already an guild with that name
      const guildNameCheck = await pool.query(
        "SELECT * FROM guilds WHERE name = $1",
        [name]
      );

      if (guildNameCheck.rows.length > 0) {
        return interaction.reply({
          content: "There already exists an guild with that name.",
          ephemeral: true,
        });
      }

      // Create the guild and return the inserted row
      const insertResult = await pool.query(
        `INSERT INTO guilds (name, description, discord_guild_id, owner_id)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [name, description, discord_guild_id, owner_id]
      );

      const guildId = insertResult.rows[0].id;
      console.log("Guild id going into the tower: ", guildId);

      // Create the associated guild tower
      await pool.query(
        `INSERT INTO guild_towers (guild_id)
         VALUES ($1)`,
        [guildId]
      );

      return interaction.reply(
        `🏰 Guild **${name}** has been created, and your guild tower has risen! 🗼`
      );
    } catch (err) {
      console.error(err);
      return interaction.reply({
        content: "There was an error creating the guild.",
        ephemeral: true,
      });
    }
  },
};
