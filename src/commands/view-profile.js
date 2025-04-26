const {
  SlashCommandBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  StringSelectMenuBuilder,
} = require("discord.js");
const pool = require("../utils/database");
const { MessageFlags } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("view-profile")
    .setDescription("View your profile"),

  async execute(interaction) {
    const discordUserId = interaction.user.id;

    try {
      const result = await pool.query(
        "SELECT * FROM players WHERE discord_user_id = $1",
        [discordUserId]
      );

      if (result.rows.length === 0) {
        return interaction.reply({
          content:
            "❌ You are not registered as a mage yet! Use /register-player to begin your journey.",
          flags: MessageFlags.Ephemeral,
        });
      }

      const player = result.rows[0];

      const embed = new EmbedBuilder()
        .setTitle(`${interaction.user.username}'s Mage Profile`)
        .setColor(0x6b4bb1)
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: "🧙 Rank", value: player.rank || "Unranked", inline: true },
          { name: "🔮 Level", value: `${player.level}`, inline: true },
          { name: "✨ XP", value: `${player.xp}`, inline: true },
          { name: "🔹 Mana", value: `${player.mana}`, inline: true },
          {
            name: "🎖️ Title",
            value: player.current_title || "None selected",
            inline: true,
          },
          {
            name: "Archetype",
            value: player.archetype || "Unaligned",
            inline: true,
          }
        )
        .setFooter({
          text: `Guild of Mages`,
        });

      const setTitleButton = new ButtonBuilder()
        .setCustomId("set_title_button")
        .setLabel("🎖️ Set Title")
        .setStyle(ButtonStyle.Primary);

      const buttonRow = new ActionRowBuilder().addComponents(setTitleButton);

      await interaction.reply({
        embeds: [embed],
        components: [buttonRow],
      });

      // Wait for button interaction

      /* 
        Makes sure the interaction is from the Set Title Button
        and the person who clicked is the same person who ran the command.
       */
      const buttonFilter = (i) =>
        i.customId === "set_title_button" && i.user.id === interaction.user.id;

      const buttonCollector =
        interaction.channel.createMessageComponentCollector({
          filter: buttonFilter,
          time: 15000,
          max: 1,
        });

      buttonCollector.on("collect", async (i) => {
        const titleQuery = await pool.query(
          "SELECT unlocked_titles FROM players WHERE id = $1",
          [player.id]
        );

        const unlockedTitles = titleQuery.rows[0].unlocked_titles || [];

        if (unlockedTitles.length === 0) {
          return i.reply({
            content: "❌ You don’t have any unlocked titles yet.",
            flags: MessageFlags.Ephemeral,
          });
        }

        const options = unlockedTitles.map((t) => ({
          label: t.title,
          description: t.source,
          value: t.title,
        }));

        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId("select_title")
          .setPlaceholder("Choose your title")
          .addOptions(options);

        const selectRow = new ActionRowBuilder().addComponents(selectMenu);

        await i.reply({
          content: "Select a title to equip:",
          components: [selectRow],
          flags: MessageFlags.Ephemeral,
        });

        const menuCollector =
          interaction.channel.createMessageComponentCollector({
            filter: (m) =>
              m.customId === "select_title" && m.user.id === i.user.id,
            time: 20000,
            max: 1,
          });

        menuCollector.on("collect", async (selection) => {
          const selectedTitle = selection.values[0];

          await pool.query(
            "UPDATE players SET current_title = $1 WHERE id = $2",
            [selectedTitle, player.id]
          );

          await selection.reply({
            content: `✅ Title set to **${selectedTitle}**.`,
            flags: MessageFlags.Ephemeral,
          });
        });
      });
    } catch (err) {
      console.error(err);
      return interaction.reply({
        content: "❌ There was an error fetching your profile.",
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
