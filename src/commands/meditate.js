const { SlashCommandBuilder } = require("discord.js");
const pool = require("../utils/database");
const checkLevelUp = require("../utils/progression");
const checkMeditationAchievements = require("../utils/achievements/meditationAchievements/checkMeditationAchievements");
const redis = require("../utils/redisClient");

const MEDITATION_COOLDOWN_SECONDS = 2 * 60 * 60; // 2 hours

module.exports = {
  data: new SlashCommandBuilder()
    .setName("meditate")
    .setDescription("Meditate to earn mana and XP."),

  async execute(interaction) {
    try {
      const discordUserId = interaction.user.id;
      const discordGuildId = interaction.guild.id;
      const cooldownKey = `cooldown:meditation:${discordUserId}`;

      const playerResult = await pool.query(
        `SELECT * FROM players WHERE discord_user_id = $1 AND discord_guild_id = $2`,
        [discordUserId, discordGuildId]
      );

      if (playerResult.rows.length === 0) {
        return interaction.reply({
          content: "You are not registered as a mage in this guild.",
          ephemeral: true,
        });
      }

      const player = playerResult.rows[0];

      // Check Redis for cooldown
      const ttl = await redis.ttl(cooldownKey);
      if (ttl > 0) {
        const minutesLeft = Math.ceil(ttl / 60);
        return interaction.reply({
          content: `⏳ You're still on cooldown! Please wait ${minutesLeft} minute(s) before you can meditate again.`,
          ephemeral: true,
        });
      }

      // Rank-based scaling
      const rankRewards = {
        Novice: { mana: 10, xp: 20 },
        Acolyte: { mana: 20, xp: 30 },
        Magus: { mana: 40, xp: 50 },
        Archmage: { mana: 60, xp: 100 },
        Ascendant: { mana: 80, xp: 150 },
      };

      const reward = rankRewards[player.rank] || { mana: 10, xp: 20 };
      const newMana = player.mana + reward.mana;
      const newXP = player.xp + reward.xp;
      const newTotalMeditations = (player.total_meditations || 0) + 1;

      // Update player stats and meditation count
      await pool.query(
        `UPDATE players 
         SET mana = $1, xp = $2, total_meditations = $3 
         WHERE id = $4`,
        [newMana, newXP, newTotalMeditations, player.id]
      );

      // Set Redis cooldown
      await redis.setEx(cooldownKey, MEDITATION_COOLDOWN_SECONDS, "onCooldown");

      const verifyTTL = await redis.ttl(cooldownKey);
      console.log(`Meditation cooldown set. TTL: ${verifyTTL} seconds`);

      // Initial meditation reply
      await interaction.reply({
        content: `🧘 You feel refreshed after your meditation.\n✨ You gained **${reward.mana} Mana** and **${reward.xp} XP**.`,
        ephemeral: true,
      });

      // Level up check
      const levelUpResult = await checkLevelUp({ ...player, xp: newXP });
      if (levelUpResult.leveledUp) {
        await interaction.followUp({
          content: `🎉 You leveled up to **Level ${levelUpResult.newLevel}**! Your magical aura intensifies.`,
          ephemeral: true,
        });
      }

      // Achievement check
      const unlockedAchievements = await checkMeditationAchievements(player.id);
      if (unlockedAchievements.length > 0) {
        const names = unlockedAchievements
          .map((a) => `🏅 **${a.name}**: ${a.description}`)
          .join("\n");
        await interaction.followUp({
          content: `You've unlocked new meditation achievement(s):\n${names}`,
          ephemeral: true,
        });
      }
    } catch (err) {
      console.error(err);
      return interaction.reply({
        content: "There was an error meditating.",
        ephemeral: true,
      });
    }
  },
};
