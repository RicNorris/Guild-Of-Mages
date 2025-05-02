const {
  SlashCommandBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  MessageFlags,
} = require("discord.js");

const { getGuildTowerData } = require("../utils/handlers/guildFunctions");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("view-room")
    .setDescription("View the details of a specific room in the tower"),

  async execute(interaction) {
    const guildId = interaction.guild.id;
    const tower = await getGuildTowerData(guildId);
    const unlockedRooms = Object.keys(tower.rooms || {});
    console.log("Unlocked rooms:", unlockedRooms);
    if (unlockedRooms.length === 0) {
      return interaction.reply({
        content: "No rooms have been unlocked yet.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId("select-room-view")
      .setPlaceholder("Choose a room to view")
      .addOptions(
        unlockedRooms.map((roomKey) => ({
          label: roomKey,
          value: roomKey,
        }))
      );

    const row = new ActionRowBuilder().addComponents(selectMenu);

    return interaction.reply({
      content: "Select a room to view its details:",
      components: [row],
      flags: MessageFlags.Ephemeral,
    });
  },
};
