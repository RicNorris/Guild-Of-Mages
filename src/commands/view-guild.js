const {
  SlashCommandBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  EmbedBuilder,
} = require("discord.js");
const pool = require("../utils/database");
const displayTower = require("../utils/handlers/displayTower");
const { MessageFlags } = require("discord.js");

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
          flags: MessageFlags.Ephemeral,
        });
      }

      const guild = result.rows[0];

      // Get Guild Tower
      const towerRes = await pool.query(
        "SELECT level, xp, energy_pool FROM guild_towers WHERE guild_id = $1",
        [guild.id]
      );

      const tower = towerRes.rows[0] || { level: 1, xp: 0, energy_pool: 0 };

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
          📈**Level:** ${tower.level} — **XP:** ${tower.xp}
          💠**Energy Pool:** ${tower.energy_pool}${alignment}${crest}
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

      // Create the "View Tower" button
      const viewTowerButton = new ButtonBuilder()
        .setCustomId("view_guild_tower")
        .setLabel("View Tower")
        .setStyle(ButtonStyle.Secondary);

      // Add both buttons to a row
      const row = new ActionRowBuilder().addComponents(
        viewMembersButton,
        viewTowerButton
      );

      await interaction.reply({
        embeds: [guildEmbed],
        components: [row],
      });

      const collector = interaction.channel.createMessageComponentCollector({
        filter: (i) =>
          ["view_guild_members", "view_guild_tower"].includes(i.customId) &&
          i.user.id === interaction.user.id,
        time: 60000,
      });

      collector.on("collect", async (i) => {
        try {
          await i.deferReply({ flags: MessageFlags.Ephemeral });

          if (i.customId === "view_guild_tower") {
            const { embed, error } = await displayTower(i.user.id);
            if (error) {
              return await i.editReply({ content: error });
            }
            return await i.editReply({ embeds: [embed] });
          }

          if (i.customId === "view_guild_members") {
            // In the future: return a real member list
            return await i.editReply({
              content: "🔍 Member viewing isn't implemented yet!",
            });
          }
        } catch (err) {
          console.error("Error during button interaction:", err);
          if (!i.replied && !i.deferred) {
            try {
              await i.reply({
                content: "❌ Something went wrong.",
                flags: MessageFlags.Ephemeral,
              });
            } catch (e) {
              console.error("Error sending fallback reply:", e);
            }
          }
        }
      });

      // Makes sure buttons are disabled after the collector timer ends
      collector.on("end", async () => {
        try {
          const disabledRow = new ActionRowBuilder().addComponents(
            viewMembersButton.setDisabled(true),
            viewTowerButton.setDisabled(true)
          );

          const message = await interaction.fetchReply();
          await message.edit({ components: [disabledRow] });
        } catch (err) {
          console.error("Error disabling buttons:", err);
        }
      });
    } catch (err) {
      console.error(err);
      return interaction.reply({
        content: "❌ There was an error fetching the guild.",
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
