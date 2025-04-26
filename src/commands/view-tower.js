const { SlashCommandBuilder } = require("discord.js");
const displayTower = require("../utils/handlers/displayTower");
const { MessageFlags } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("view-tower")
    .setDescription("View your guild tower's current state"),

  async execute(interaction) {
    const { embed, error } = await displayTower(interaction.user.id);

    if (error) {
      return interaction.reply({
        content: error,
        flags: MessageFlags.Ephemeral,
      });
    }

    return interaction.reply({ embeds: [embed] });
  },
};
