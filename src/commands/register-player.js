const { SlashCommandBuilder } = require("discord.js");
const pool = require("../utils/database");
const { MessageFlags } = require("discord.js");
const combatSpellsArray = require("../utils/spells/combatSpells");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("register-player")
    .setDescription("Registers player as an mage for this server's guild.")
    .addStringOption((option) =>
      option
        .setName("title")
        .setDescription("Choose your initial mage title")
        .setRequired(true)
        .addChoices(
          { name: "Initiate of the Arcane", value: "Initiate of the Arcane" },
          { name: "First Ember", value: "First Ember" },
          { name: "Awakened One", value: "Awakened One" },
          { name: "Apprentice of the Tower", value: "Apprentice of the Tower" },
          { name: "Oathbound", value: "Oathbound" }
        )
    )
    .addStringOption((option) =>
      option
        .setName("starter-spell")
        .setDescription("Choose your starting spell")
        .setRequired(true)
        .addChoices(
          { name: "Stone Flick", value: "stone_flick" },
          { name: "Aqua Dart", value: "aqua_dart" }
        )
    ),
  async execute(interaction) {
    const discordUserId = interaction.user.id;
    const discordGuildId = interaction.guild.id;
    const title = interaction.options.getString("title");
    const starterSpellId = interaction.options.getString("starter-spell");
    const earnedAt = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    try {
      // Check if player already exists
      const existingPlayer = await pool.query(
        "SELECT * FROM players WHERE discord_user_id = $1",
        [discordUserId]
      );

      if (existingPlayer.rows.length > 0) {
        return interaction.reply({
          content: "You are already registered as a mage in this guild.",
          flags: MessageFlags.Ephemeral,
        });
      }

      // Get the guild ID for this server
      const guildResult = await pool.query(
        "SELECT id FROM guilds WHERE discord_guild_id = $1",
        [discordGuildId]
      );

      if (guildResult.rows.length === 0) {
        return interaction.reply({
          content: "No guild has been created in this server yet!",
          flags: MessageFlags.Ephemeral,
        });
      }

      const guild = guildResult.rows[0];
      const guildId = guild.id;

      // Determine player role
      const role =
        String(guild.owner_id) === discordUserId ? "owner" : "member";

      // Initial title for the player
      const initialTitleObject = [
        {
          title: title,
          source: "Guild Registration",
          earned_at: earnedAt,
        },
      ];

      const combatSpells = {};
      for (const spell of combatSpellsArray) {
        combatSpells[spell.id] = spell;
      }

      const starterSpell = combatSpells[starterSpellId];

      if (!starterSpell) {
        return interaction.reply({
          content: "The selected spell is invalid.",
          ephemeral: true,
        });
      }

      const spellbook = [starterSpellId];

      // Insert the player
      await pool.query(
        `INSERT INTO players (
              discord_user_id, discord_guild_id, guild_id, role, current_title, unlocked_titles, spellbook
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          discordUserId,
          discordGuildId,
          guildId,
          role,
          title,
          JSON.stringify(initialTitleObject),
          JSON.stringify(spellbook),
        ]
      );

      console.log(
        `Player ${discordUserId} registered in guild ${guildId} with title ${title}`
      );

      return interaction.reply({
        content: `You have joined the guild as **${title}** and learned **${starterSpell.name}**. Welcome, mage! ✨`,
      });
    } catch (err) {
      console.error(err);
      return interaction.reply({
        content: "An error occurred while registering you.",
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
