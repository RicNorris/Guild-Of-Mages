const { SlashCommandBuilder } = require("discord.js");
const pool = require("../utils/database");
const redis = require("../utils/redisClient");
const { getMaxTowerEnergy } = require("../utils/towerEnergyCaps");
const { MessageFlags } = require("discord.js");

const CHANNEL_COOLDOWN_SECONDS = 2 * 60 * 60; // 2 hours

module.exports = {
  data: new SlashCommandBuilder()
    .setName("channel")
    .setDescription("Channel energy into the guild"),

  async execute(interaction) {
    try {
      // Fetch the player info
      const discordUserId = interaction.user.id;
      const discordGuildId = interaction.guild.id;
      const cooldownKey = `cooldown:channel:${discordUserId}`;

      const playerResult = await pool.query(
        `SELECT * FROM players WHERE discord_user_id = $1 AND discord_guild_id = $2`,
        [discordUserId, discordGuildId]
      );

      // Check if player is channeling in the right guild
      if (playerResult.rows.length === 0) {
        return interaction.reply({
          content: "You are not registered as a mage in this guild.",
          flags: MessageFlags.Ephemeral,
        });
      }

      const player = playerResult.rows[0];
      const guildId = player.guild_id;

      // Fetch the guild tower info
      const towerResult = await pool.query(
        `SELECT * FROM guild_towers WHERE guild_id = $1`,
        [guildId]
      );

      if (towerResult.rows.length === 0) {
        return interaction.reply({
          content: "This guild tower does not exist yet",
          flags: MessageFlags.Ephemeral,
        });
      }

      const tower = towerResult.rows[0];

      // Check if tower energy is at max
      const maxTowerEnergy = tower.max_energy_pool;

      if (tower.energy_pool === maxTowerEnergy) {
        return interaction.reply({
          content: "Maximum ammount of energy stored in the tower",
          flags: MessageFlags.Ephemeral,
        });
      }

      const ttl = await redis.ttl(cooldownKey);
      if (ttl > 0) {
        const minutesLeft = Math.ceil(ttl / 60);
        return interaction.reply({
          content: `⏳ You're still on cooldown! Please wait ${minutesLeft} minute(s) before you can meditate again.`,
          flags: MessageFlags.Ephemeral,
        });
      }

      // Rank-based scaling
      const rankEnergy = {
        Novice: { energy: 10 },
        Acolyte: { energy: 15 },
        Magus: { energy: 30 },
        Archmage: { energy: 45 },
        Ascendant: { energy: 60 },
      };

      const energyToChannel = rankEnergy[player.rank] || { energy: 10 };

      const channeledEnergy = energyToChannel.energy;

      const newEnergy = tower.energy_pool + channeledEnergy;

      // Make sure tower energy doesnt go over the max
      if (newEnergy > maxTowerEnergy) {
        newEnergy = maxTowerEnergy;
      }

      // Update tower energy
      await pool.query(
        `UPDATE guild_towers SET energy_pool = $1 WHERE id = $2`,
        [newEnergy, tower.id]
      );

      // Set Redis cooldown
      await redis.setEx(cooldownKey, CHANNEL_COOLDOWN_SECONDS, "onCooldown");

      const verifyTTL = await redis.ttl(cooldownKey);
      console.log(`Channel cooldown set. TTL: ${verifyTTL} seconds`);

      // Channel energy phrases
      const phrases = [
        `🔮 Your essence flows into the guildstone.\n🏛️ The tower hums with newfound strength.\n✨ You offered **${channeledEnergy} Energy**.`,
        `🌠 You focus your will into the heart of the guild.\n🏛️ The tower stirs, quietly acknowledging your gift.\n✨ You offered **${channeledEnergy} Energy**.`,
        `🌀 Energy flows from you in steady waves.\n🏛️ The guild tower resonates with quiet power.\n✨ You offered **${channeledEnergy} Energy**.`,
      ];

      // Randomly select one of the phrases
      const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];

      // Initial channel reply
      await interaction.reply({
        content: randomPhrase,
        flags: MessageFlags.Ephemeral,
      });
    } catch (err) {
      console.error(err);
      return interaction.reply({
        content: "There was an error channeling energy.",
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
