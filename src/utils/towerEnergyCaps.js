// Define max energy for each tower level
const towerEnergyCaps = {
  1: 100,
  2: 150,
  3: 200,
  4: 275,
  5: 350,
  6: 450,
  7: 600,
  8: 800,
  9: 1000,
  10: 1200,
  // Add more levels as needed
};

/**
 * Get the max energy for a specific tower level.
 * Falls back to a default formula if level isn't predefined.
 */
function getMaxTowerEnergy(level) {
  return towerEnergyCaps[level] || 1000; // fallback cap
}

module.exports = { getMaxTowerEnergy };
