const { SlashCommandBuilder } = require("discord.js");
const pool = require("../utils/database");
const checkLevelUp = require("../utils/progression");
const checkMeditationAchievements = require("../utils/achievements/meditationAchievements/checkMeditationAchievements");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("meditate")
    .setDescription("Meditate to earn mana and XP."),

  async execute(interaction) {
    try {
      // Fetch the player info
      const discordUserId = interaction.user.id;
      const discordGuildId = interaction.guild.id;

      const playerResult = await pool.query(
        `SELECT * FROM players WHERE discord_user_id = $1 AND discord_guild_id = $2`,
        [discordUserId, discordGuildId]
      );

      // Check if player is meditating in the right server
      if (playerResult.rows.length === 0) {
        return interaction.reply({
          content: "You are not registered as a mage in this guild.",
          ephemeral: true,
        });
      }

      const player = playerResult.rows[0];

      //Check if player has meditated in the last 2 hours
      const now = new Date();
      const elapsed = now - new Date(player.last_meditation_at);
      //const cooldown = 2 * 60 * 60 * 1000; //2 hours in ms
      const cooldown = 0;

      if (elapsed < cooldown) {
        const remainingTime = cooldown - elapsed;

        // Convert remaining time into minutes
        const minutesLeft = Math.floor(remainingTime / (1000 * 60)); // Convert ms to minutes

        return interaction.reply({
          content: `⏳ You have not passed the meditation cooldown! Please wait ${minutesLeft} minute(s) before you can meditate again.`,
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

      const reward = rankRewards[player.rank] || { mana: 10, xp: 20 }; // fallback

      const newMana = player.mana + reward.mana;
      const newXP = player.xp + reward.xp;

      // Update player stats and cooldown
      await pool.query(
        `UPDATE players SET mana = $1, xp = $2, last_meditation_at = NOW() WHERE id = $3`,
        [newMana, newXP, player.id]
      );

      // Update meditation total
      await pool.query(
        `INSERT INTO player_meditations (player_id, meditated_at) VALUES ($1, $2)`,
        [player.id, new Date()]
      );

      // Reply with meditation result first
      await interaction.reply({
        content: `🧘 You feel refreshed after your meditation.\n✨ You gained **${reward.mana} Mana** and **${reward.xp} XP**.`,
        ephemeral: true,
      });

      // Then check and follow up with level up
      const levelUpResult = await checkLevelUp({ ...player, xp: newXP });

      if (levelUpResult.leveledUp) {
        await interaction.followUp({
          content: `🎉 You leveled up to **Level ${levelUpResult.newLevel}**! Your magical aura intensifies.`,
          ephemeral: true,
        });
      }

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
