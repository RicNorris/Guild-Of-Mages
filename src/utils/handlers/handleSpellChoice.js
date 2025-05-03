const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  MessageFlags,
} = require("discord.js");
const pool = require("../database");
const { getSpellById } = require("../spells/spellIndex");

async function handleSpellChoice(interaction) {
  const { customId, user } = interaction;
  const [prefix, action, eventId] = customId.split("-");

  if (prefix !== "event" || action !== "choose") return;

  // Acknowledge interaction
  await interaction.deferReply({ ephemeral: true });

  // Get event
  const eventRes = await pool.query(
    "SELECT * FROM events WHERE event_id = $1",
    [eventId]
  );
  const event = eventRes.rows[0];

  if (!event) {
    return interaction.followUp({
      content: "This event no longer exists.",
      flags: MessageFlags.Ephemeral,
    });
  }

  if (event.status !== "ACTIVE") {
    return interaction.followUp({
      content: "This event is no longer active.",
      flags: MessageFlags.Ephemeral,
    });
  }

  // Check player registration
  const playerRes = await pool.query(
    "SELECT * FROM players WHERE discord_user_id = $1",
    [user.id]
  );
  const player = playerRes.rows[0];

  if (!player) {
    return interaction.followUp({
      content: "You are not registered as a mage.",
      flags: MessageFlags.Ephemeral,
    });
  }

  const spellbook = player.spellbook || [];

  if (!Array.isArray(spellbook) || spellbook.length === 0) {
    return interaction.followUp({
      content: "You haven't learned any combat spells yet.",
      flags: MessageFlags.Ephemeral,
    });
  }

  // Build select menu options
  const options = spellbook
    .slice(0, 25)
    .map((spellId) => {
      const spell = getSpellById(spellId);
      if (!spell || spell.type !== "combat") return null;

      const label = `${spell.emoji || ""} ${spell.name} — ${spell.damage.min}-${
        spell.damage.max
      } dmg • ${spell.manaCost} mana`;
      const description = `${spell.description.slice(0, 50)} • ${
        spell.cooldown / 1000
      }s cd`;

      return {
        label,
        description,
        value: `cast-${eventId}-${spellId}`,
      };
    })
    .filter(Boolean);

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId("spell-select")
    .setPlaceholder("Choose a spell to cast...")
    .addOptions(options);

  const actionRow = new ActionRowBuilder().addComponents(selectMenu);

  const embed = new EmbedBuilder()
    .setTitle("📖 Choose a Spell")
    .setDescription("Select one of your known spells to cast in the event.")
    .setColor("Blue");

  await interaction.followUp({
    embeds: [embed],
    components: [actionRow],
    ephemeral: true,
  });
}

module.exports = handleSpellChoice;
