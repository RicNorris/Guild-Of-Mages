const ROOM_UPGRADES = {
  "Guildstone Room": {
    1: {
      level: 1,
      description: "The heart of the guild. Stores and channels Guild Energy.",
      // No effect at level 1
    },
    2: {
      level: 2,
      description: "Increased capacity to store Guild Energy.",
      effect: (tower) => {
        // When tower reaches level 2, Guildstone Room's energy pool increases and energy regen rate is increased.
        tower.max_energy_pool += 100;
        tower.energy_regen_rate += 5;
      },
    },
    3: {
      level: 3,
      description: "Guildstone Room enhanced with mystical runes.",
      effect: (tower) => {
        // Example effect: increase energy regeneration rate.
        tower.energy_regen_rate += 10;
      },
    },
  },
  "Arcane Library": {
    1: {
      level: 1,
      description: "The foundational library for spell research.",
      effect: null, // No effect at level 1
    },
    2: {
      level: 2,
      description: "Boosts spell research speed and unlocks new spells.",
      effect: (tower) => {
        // Increase spell research speed when reaching level 2
        tower.research_speed += 20;
      },
    },
    // Add more levels for Arcane Library
  },
};

module.exports = ROOM_UPGRADES;
