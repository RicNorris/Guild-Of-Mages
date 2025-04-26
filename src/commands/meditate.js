const { SlashCommandBuilder } = require("discord.js");
const pool = require("../utils/database");
const checkLevelUp = require("../utils/progression");
const meditationAchievements = require("../utils/achievements/meditationAchievements");
const checkAchievements = require("../utils/achievements/checkAchievements");
const redis = require("../utils/redisClient");
const { MessageFlags } = require("discord.js");

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
          flags: MessageFlags.Ephemeral,
        });
      }

      const player = playerResult.rows[0];

      // Check Redis for cooldown
      const ttl = await redis.ttl(cooldownKey);
      if (ttl > 0) {
        const minutesLeft = Math.ceil(ttl / 60);
        return interaction.reply({
          content: `⏳ You're still on cooldown! Please wait ${minutesLeft} minute(s) before you can meditate again.`,
          flags: MessageFlags.Ephemeral,
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

      // Update player stats
      await pool.query(`UPDATE players SET mana = $1, xp = $2 WHERE id = $3`, [
        newMana,
        newXP,
        player.id,
      ]);

      // Upsert meditation progress into player_progress
      await pool.query(
        `INSERT INTO player_progress (player_id, progress_type, progress_count)
         VALUES ($1, 'meditations', 1)
         ON CONFLICT (player_id, progress_type)
         DO UPDATE SET progress_count = player_progress.progress_count + 1,
                       updated_at = now()`,
        [player.id]
      );

      // Set Redis cooldown
      await redis.setEx(cooldownKey, MEDITATION_COOLDOWN_SECONDS, "onCooldown");

      const verifyTTL = await redis.ttl(cooldownKey);
      console.log(`Meditation cooldown set. TTL: ${verifyTTL} seconds`);

      // Initial meditation reply
      await interaction.reply({
        content: `🧘 You feel refreshed after your meditation.\n✨ You gained **${reward.mana} Mana** and **${reward.xp} XP**.`,
        flags: MessageFlags.Ephemeral,
      });

      // Level up check
      const levelUpResult = await checkLevelUp({ ...player, xp: newXP });
      if (levelUpResult.leveledUp) {
        let levelUpMessage = `🎉 You leveled up to **Level ${levelUpResult.newLevel}**! Your magical aura intensifies.`;

        if (levelUpResult.newRank && levelUpResult.newRank !== player.rank) {
          levelUpMessage += `\n🏅 You've ascended to the rank of **${levelUpResult.newRank}**!`;
        }

        await interaction.followUp({
          content: levelUpMessage,
          flags: MessageFlags.Ephemeral,
        });
      }

      // Achievement check
      const unlockedAchievements = await checkAchievements(
        player.id,
        "meditations",
        meditationAchievements
      );

      if (unlockedAchievements.length > 0) {
        const names = unlockedAchievements
          .map((a) => `🏅 **${a.name}**: ${a.description}`)
          .join("\n");

        await interaction.followUp({
          content: `You've unlocked new meditation achievement(s):\n${names}`,
          flags: MessageFlags.Ephemeral,
        });
      }
    } catch (err) {
      console.error(err);
      return interaction.reply({
        content: "There was an error meditating.",
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
