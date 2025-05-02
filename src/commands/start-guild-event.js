const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require("discord.js");
const pool = require("../utils/database");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("start-guild-event")
    .setDescription("Start a guild-wide event."),

  async execute(interaction) {
    const guildId = interaction.guild.id;
    const channelId = interaction.channel.id;
    const startedBy = interaction.user.id;

    // Check if player has permission to start an event
    const playerRes = await pool.query(
      "SELECT * FROM players WHERE discord_user_id = $1",
      [startedBy]
    );

    const player = playerRes.rows[0];

    if (!player) {
      return interaction.reply({
        content: "You are not registered as a mage in this guild.",
        flags: MessageFlags.Ephemeral,
      });
    }

    if (player.role !== "officer" && player.role !== "owner") {
      return interaction.reply({
        content: "You do not have permission to start a guild event.",
        flags: MessageFlags.Ephemeral,
      });
    }

    // Pick a test enemy
    const enemyRes = await pool.query(
      "SELECT * FROM enemies WHERE is_guild_only = TRUE ORDER BY RANDOM() LIMIT 1"
    );

    const enemy = enemyRes.rows[0];

    if (!enemy) {
      return interaction.reply({
        content: "No guild-only enemies are available at the moment.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const eventRes = await pool.query(
      `INSERT INTO events (
        event_type_id, guild_id, started_by, channel_id, enemy_id,
        current_hp, max_hp
      )
      VALUES (2, (SELECT id FROM guilds WHERE discord_guild_id = $1), 
              (SELECT id FROM players WHERE discord_user_id = $2), $3, $4, $5, $5)
      RETURNING event_id`,
      [guildId, startedBy, channelId, enemy.enemy_id, enemy.max_hp]
    );

    const eventId = eventRes.rows[0].event_id;
    console.log("Event ID:", eventId);
    const attackBtn = new ButtonBuilder()
      .setCustomId(`event-attack-${eventId}`)
      .setLabel("Attack!")
      .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder().addComponents(attackBtn);

    const embed = new EmbedBuilder()
      .setTitle(`🛡️ Guild Event Started!`)
      .setDescription(
        `An enemy has appeared: **${enemy.name}**\nHP: **${enemy.max_hp}**`
      )
      .setColor("Red");

    const msg = await interaction.reply({
      embeds: [embed],
      components: [row],
      fetchReply: true,
    });

    await pool.query(`UPDATE events SET message_id = $1 WHERE event_id = $2`, [
      msg.id,
      eventId,
    ]);
  },
};
