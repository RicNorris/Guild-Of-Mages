// src/interactions/handleRoomViewSelect.js
const { EmbedBuilder } = require("discord.js");
const { getGuildTowerData } = require("./guildFunctions");

const ROOM_DESCRIPTIONS = require("../../utils/rooms_metadata");
const ROOM_IMAGES = require("../../utils/roomImages");

async function handleRoomViewSelect(interaction) {
  const selectedRoom = interaction.values[0];
  const guildId = interaction.guild.id;

  const tower = await getGuildTowerData(guildId);
  const roomData = tower.rooms[selectedRoom];

  if (!roomData) {
    return interaction.update({
      content: "That room is no longer available.",
      components: [],
    });
  }

  const meta = ROOM_DESCRIPTIONS[selectedRoom] || {
    name: selectedRoom,
    description: "No description available.",
  };

  const imageUrl = ROOM_IMAGES[selectedRoom] || ROOM_IMAGES.default;
  console.log(imageUrl);
  const embed = new EmbedBuilder()
    .setTitle(meta.name)
    .setDescription(meta.description)
    .addFields(
      { name: "Level", value: `${roomData.level}`, inline: true },
      {
        name: "Unlocked At",
        value: `<t:${Math.floor(
          new Date(roomData.unlockedAt).getTime() / 1000
        )}:F>`,
        inline: true,
      }
    )
    .setImage(imageUrl)
    .setColor("Blue");

  return interaction.update({
    content: "",
    embeds: [embed],
    components: [],
  });
}

module.exports = handleRoomViewSelect;
