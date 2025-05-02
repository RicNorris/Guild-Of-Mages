const {
  ButtonInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require("discord.js");
const pool = require("../database");

async function handleButton(interaction) {
  const { customId, user } = interaction;
  const eventId = customId.split("-")[2]; // Extract event_id from the customId
  console.log("Event ID:", eventId);

  // Defer the update to acknowledge the button press
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  // Retrieve the current event and enemy data
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

  const guildId = event.guild_id;

  const guildTowerRes = await pool.query(
    "SELECT * FROM guild_towers WHERE guild_id = $1",
    [guildId]
  );
  const guildTower = guildTowerRes.rows[0];

  const enemyRes = await pool.query(
    "SELECT * FROM enemies WHERE enemy_id = $1",
    [event.enemy_id]
  );
  const enemy = enemyRes.rows[0];

  if (!enemy || event.status !== "ACTIVE") {
    return interaction.followUp({
      content: "This event is no longer active.",
      flags: MessageFlags.Ephemeral,
    });
  }

  const damage = 800;
  const newHp = event.current_hp - damage;

  // Get player ID from players table
  const playerRes = await pool.query(
    "SELECT id FROM players WHERE discord_user_id = $1",
    [user.id]
  );

  const playerId = playerRes.rows[0]?.id;

  if (!playerId) {
    return interaction.followUp({
      content: "You are not registered as a mage.",
      flags: MessageFlags.Ephemeral,
    });
  }

  // Insert or update participant info
  await pool.query(
    `INSERT INTO event_participants (event_id, player_id, damage_dealt, spells_used)
   VALUES ($1, $2, $3, 0)
   ON CONFLICT (event_id, player_id) DO UPDATE
   SET damage_dealt = event_participants.damage_dealt + EXCLUDED.damage_dealt`,
    [eventId, playerId, damage]
  );

  if (newHp <= 0) {
    await pool.query(
      "UPDATE events SET status = 'ended', current_hp = 0 WHERE event_id = $1",
      [eventId]
    );

    await pool.query("UPDATE guild_towers SET xp = xp + 20 WHERE id = $1", [
      guildTower.id,
    ]);

    await pool.query(
      "UPDATE players SET xp = xp + 50 WHERE discord_user_id = $1",
      [user.id]
    );

    const completionEmbed = new EmbedBuilder()
      .setTitle("🎉 Guild Event Complete!")
      .setDescription(
        `The enemy **${enemy.name}** has been defeated!\nYou have gained 50 XP!`
      )
      .setColor("Green");

    const rewardButton = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("claim-rewards")
        .setLabel("Claim Rewards")
        .setStyle(ButtonStyle.Success)
    );

    // Top 5 participants
    const topParticipantsRes = await pool.query(
      `SELECT ep.player_id, ep.damage_dealt
     FROM event_participants ep
     WHERE ep.event_id = $1
     ORDER BY ep.damage_dealt DESC
     LIMIT 5`,
      [eventId]
    );

    const leaderboard = await Promise.all(
      topParticipantsRes.rows.map(async (row, index) => {
        const playerRes = await pool.query(
          "SELECT discord_user_id FROM players WHERE id = $1",
          [row.player_id]
        );

        const discordUserId = playerRes.rows[0]?.discord_user_id;
        let username = "Unknown Player";

        if (discordUserId) {
          try {
            const user = await interaction.client.users.fetch(discordUserId);
            username = user.username;
          } catch (err) {
            console.warn(`Failed to fetch user ${discordUserId}:`, err);
          }
        }

        return `**${index + 1}.** ${username} – 🗡️ ${row.damage_dealt} damage`;
      })
    ).then((entries) => entries.join("\n"));

    // Edit the original event message to show it's over
    try {
      const channel = await interaction.client.channels.fetch(event.channel_id);
      const eventMessage = await channel.messages.fetch(event.message_id);

      const updatedEventEmbed = new EmbedBuilder()
        .setTitle(`🛡️ Guild Event: ${enemy.name}`)
        .setDescription(`✅ The enemy has been defeated!`)
        .addFields({
          name: "🏆 Top 5 Damage Dealers",
          value: leaderboard || "No participants recorded.",
        })
        .setColor("Grey");

      await eventMessage.edit({ embeds: [updatedEventEmbed], components: [] });
    } catch (err) {
      console.error("Failed to update event message:", err);
    }

    await interaction.followUp({
      embeds: [completionEmbed],
      components: [rewardButton],
    });
    return;
  }

  // Update the event's current HP
  await pool.query("UPDATE events SET current_hp = $1 WHERE event_id = $2", [
    newHp,
    eventId,
  ]);

  // Update the original event message to reflect new HP
  try {
    const channel = await interaction.client.channels.fetch(event.channel_id);
    const eventMessage = await channel.messages.fetch(event.message_id);
    console.log(
      "Event message found:",
      eventMessage.id,
      "in",
      eventMessage.channel.id
    );

    const updatedEventEmbed = new EmbedBuilder()
      .setTitle(`🛡️ Guild Event: ${enemy.name}`)
      .setDescription(
        `The guild is fighting **${enemy.name}**!\n\n🧠 HP: **${newHp} / ${event.max_hp}**`
      )
      .setColor("Purple");

    await eventMessage.edit({ embeds: [updatedEventEmbed] });
  } catch (err) {
    if (err.code === 10008) {
      console.warn("Original event message not found — possibly deleted.");
    } else {
      console.error("Failed to update event message:", err);
    }
  }

  // Inform the attacker
  const attackEmbed = new EmbedBuilder()
    .setTitle("⚔️ You attacked the enemy!")
    .setDescription(
      `You dealt **${damage}** damage to **${enemy.name}**.\nEnemy HP: **${newHp}**`
    )
    .setColor("Red");

  await interaction.followUp({ embeds: [attackEmbed] });
}

module.exports = handleButton;
