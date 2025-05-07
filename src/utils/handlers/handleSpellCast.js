const { EmbedBuilder, MessageFlags } = require("discord.js");
const pool = require("../database");
const { getAllSpells } = require("../spells/spellIndex");
const allSpells = getAllSpells();
const redis = require("../../utils/redisClient");

async function handleSpellSelect(interaction) {
  const { values, user } = interaction;

  const selected = values[0];
  const [_, eventId, spellId] = selected.split("-");

  // Lookup event
  const eventRes = await pool.query(
    "SELECT * FROM events WHERE event_id = $1",
    [eventId]
  );
  const event = eventRes.rows[0];

  if (!event || event.status !== "ACTIVE") {
    return interaction.reply({
      content: "This event is no longer active.",
      ephemeral: true,
    });
  }

  const enemyRes = await pool.query(
    "SELECT name, image_url FROM enemies WHERE enemy_id = $1",
    [event.enemy_id]
  );
  const enemy = enemyRes.rows[0];

  // Lookup player
  const playerRes = await pool.query(
    "SELECT * FROM players WHERE discord_user_id = $1",
    [user.id]
  );
  const player = playerRes.rows[0];

  if (!player) {
    return interaction.reply({
      content: "You are not registered as a mage.",
      ephemeral: true,
    });
  }

  // Get spell data
  const spell = allSpells.find((spell) => spell.id === spellId);
  console.log("Spell data:", spell);
  if (!spell || spell.type !== "combat") {
    return interaction.reply({
      content: "This spell cannot be used in combat.",
      ephemeral: true,
    });
  }

  const cooldownKey = `cooldown:${player.id}:${spell.id}`;
  const remainingCooldown = await redis.ttl(cooldownKey);

  if (remainingCooldown > 0) {
    return interaction.reply({
      content: `⏳ **${spell.name}** is on cooldown for **${remainingCooldown}s**.`,
      ephemeral: true,
    });
  } else if (remainingCooldown === -2) {
    console.log(
      `No cooldown found for player ${player.id} and spell ${spell.id}`
    );
  }

  // Mana check
  if (player.mana < spell.manaCost) {
    return interaction.reply({
      content: `Not enough mana! **${spell.manaCost}** required.`,
      ephemeral: true,
    });
  }

  // Apply spell effect
  const damage = Math.floor(
    Math.random() * (spell.damage.max - spell.damage.min + 1) + spell.damage.min
  );
  let newHp = Math.max(0, event.current_hp - damage);

  let eventCompleted = false;
  if (newHp <= 0) {
    eventCompleted = true;
    newHp = 0; // Boss HP can't be less than 0
    await pool.query(
      "UPDATE events SET status = 'COMPLETED' WHERE event_id = $1",
      [eventId]
    );
    console.log("The boss has been defeated!");

    // Optionally reward players or update other event-related data
    // You could update player XP, distribute loot, etc. here
  }

  // Update DB
  await pool.query("UPDATE events SET current_hp = $1 WHERE event_id = $2", [
    newHp,
    eventId,
  ]);

  await pool.query(
    `INSERT INTO event_participants (event_id, player_id, damage_dealt, spells_used)
       VALUES ($1, $2, $3, 1)
       ON CONFLICT (event_id, player_id) DO UPDATE
       SET damage_dealt = event_participants.damage_dealt + EXCLUDED.damage_dealt,
           spells_used = event_participants.spells_used + 1`,
    [eventId, player.id, damage]
  );

  await pool.query("UPDATE players SET mana = mana - $1 WHERE id = $2", [
    spell.manaCost,
    player.id,
  ]);

  await redis.setEx(cooldownKey, spell.cooldown, "onCooldown");
  const ttl = await redis.ttl(cooldownKey);

  // Reply
  const spellImageUrl = `https://github.com/RicNorris/Guild-Of-Mages/blob/main/public/spells/${
    spell.id || "ignis_shard"
  }.png?raw=true`;

  const embed = new EmbedBuilder()
    .setTitle(`✨ ${spell.name} Cast!`)
    .setDescription(
      `You cast **${spell.name}** and dealt **${damage}** damage!\n${enemy.name} HP: **${newHp} / ${event.max_hp}**`
    )
    .setColor("Red")
    .setImage(spellImageUrl);

  console.log(
    "Spell cast:",
    spell.name,
    "by player",
    player.id,
    "Damage dealt:",
    damage
  );
  await interaction.reply({
    embeds: [embed],
    ephemeral: true,
  });

  try {
    const channel = await interaction.client.channels.fetch(event.channel_id);
    const message = await channel.messages.fetch(event.message_id);

    const bossEmbed = new EmbedBuilder()
      .setTitle("⚔️ Guild Event: Battle in Progress")
      .setDescription(
        `**${enemy.name}** is under attack!\n**Current HP:** ${newHp} / ${event.max_hp}`
      )
      .setColor("DarkRed")
      .setImage(enemy.image_url);

    await message.edit({ embeds: [bossEmbed] });
  } catch (err) {
    console.error("Failed to update boss message:", err);
  }

  if (eventCompleted) {
    try {
      const channel = await interaction.client.channels.fetch(event.channel_id);
      const message = await channel.messages.fetch(event.message_id);

      const bossEmbed = new EmbedBuilder()
        .setTitle("⚔️ Guild Event: Battle Completed!")
        .setDescription(`**${enemy.name}** has been defeated!\nVictory!`)
        .setColor("Green");

      await message.edit({ components: [], embeds: [bossEmbed] });
    } catch (err) {
      console.error("Failed to update boss message:", err);
    }
  }
}

module.exports = handleSpellSelect;
