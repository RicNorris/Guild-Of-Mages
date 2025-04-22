const {
  SlashCommandBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  EmbedBuilder,
} = require("discord.js");
const pool = require("../utils/database");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("view-guild")
    .setDescription("View the mage guild associated with this server"),

  async execute(interaction) {
    const discordGuildId = interaction.guild.id;

    try {
      const result = await pool.query(
        "SELECT * FROM guilds WHERE discord_guild_id = $1",
        [discordGuildId]
      );

      if (result.rows.length === 0) {
        return interaction.reply({
          content:
            "❌ This server does not have a guild yet. Use `/create-guild` to summon one!",
          ephemeral: true,
        });
      }

      const guild = result.rows[0];

      const guildMageNumber = await pool.query(
        "SELECT COUNT(discord_guild_id) FROM players WHERE discord_guild_id = $1",
        [discordGuildId]
      );

      const mageCount = parseInt(guildMageNumber.rows[0].count, 10);

      const description = guild.description || "_No description set._";
      const alignment = guild.alignment
        ? `\n🔮 **Alignment:** ${guild.alignment}`
        : "";
      const crest = guild.crest_url ? `\n🛡️ **Crest:** ${guild.crest_url}` : "";

      // Create the guild info embed
      const guildEmbed = new EmbedBuilder()
        .setTitle(`🏰 **${guild.name}**`)
        .setDescription(
          `
          📜**Description:** ${description}
          🧙‍♂️**Created By:** <@${guild.owner_id}>
          📈**Level:** ${guild.level} — **XP:** ${guild.xp}
          💠**Mana Pool:** ${guild.mana_pool}${alignment}${crest}
          🧙**Registered Mages:** ${mageCount}
          📅**Created At:** ${new Date(guild.created_at).toLocaleDateString()}
        `
        )
        .setColor(0x6e00ff);

      // Create the "View Members" button
      const viewMembersButton = new ButtonBuilder()
        .setCustomId("view_guild_members")
        .setLabel("View Members")
        .setStyle(ButtonStyle.Primary);

      // Create an action row with the button
      const row = new ActionRowBuilder().addComponents(viewMembersButton);

      // Send the embed with the button
      await interaction.reply({
        embeds: [guildEmbed],
        components: [row],
        ephemeral: false,
      });
    } catch (err) {
      console.error(err);
      return interaction.reply({
        content: "❌ There was an error fetching the guild.",
        ephemeral: true,
      });
    }
  },
};
