const { Client, GatewayIntentBits, Collection, Events } = require("discord.js");
const express = require("express");
const app = express();
const dotenv = require("dotenv");
const { exec } = require("child_process");
const { MessageFlags } = require("discord.js");
const startEnergyRegenLoop =
  require("./utils/handlers/towerFunctions").startEnergyRegenLoop;

dotenv.config();

// Handlers
const handleGuildMembers = require("./utils/handlers/guildMembers");
const handleRoomViewSelect = require("./utils/handlers/handleRoomViewSelect");
const handleSpellChoice = require("./utils/handlers/handleSpellChoice");
const handleSpellCast = require("./utils/handlers/handleSpellCast");
// Create the client
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.commands = new Collection();

// Load commands dynamically
const fs = require("fs");
const commandFiles = fs
  .readdirSync("./src/commands")
  .filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  client.commands.set(command.data.name, command);
}

// Handle interactionCreate event
client.on(Events.InteractionCreate, async (interaction) => {
  if (
    interaction.isButton() &&
    interaction.customId &&
    interaction.customId.startsWith("event-choose-")
  ) {
    console.log("Spell choose event pressed:", interaction.customId);
    await handleSpellChoice(interaction); // Call the attack handler
  }

  if (interaction.isButton() && interaction.customId === "view_guild_members") {
    // Handle button interaction
    await handleGuildMembers(interaction);
    return; // Stop further handling
  }

  if (interaction.isStringSelectMenu()) {
    if (interaction.customId === "select-room-view") {
      await handleRoomViewSelect(interaction);
      return;
    } else if (interaction.customId === "spell-select") {
      return handleSpellCast(interaction);
    }
  }

  if (interaction.isChatInputCommand()) {
    // Handle slash command interaction
    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(error);
      await interaction.reply({
        content: "There was an error executing this command!",
        flags: MessageFlags.Ephemeral,
      });
    }
  }
});

// On ready
client.once(Events.ClientReady, () => {
  console.log(`Bot is now online as ${client.user.tag}`);

  startEnergyRegenLoop(); // Start the energy regeneration loop
});

app.post("/webhook", (req, res) => {
  exec("git pull", (error, stdout, stderr) => {
    if (error) {
      console.error(`exec error: ${error}`);
      return res.status(500).send("Pull failed");
    }

    console.log(`stdout:\n${stdout}`);
    console.error(`stderr:\n${stderr}`);

    if (stdout.includes("Updating") || stdout.includes("changed")) {
      console.log("Code updated. Restarting bot...");

      // Delay a bit before exiting so the response gets sent
      res.status(200).send("Updated, restarting bot.");
      setTimeout(() => {
        process.exit(0); // Replit will auto-restart the process
      }, 1000);
    } else {
      res.status(200).send("No changes, no restart needed.");
    }
  });
});

app.get("/", (req, res) => {
  res.send("Bot is alive!");
});

app.listen(3000, () => {
  console.log("Keep-alive server running on port 3000");
});

client.login(process.env.DISCORD_TOKEN);
