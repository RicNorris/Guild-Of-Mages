const { Client, GatewayIntentBits, Collection, Events } = require("discord.js");
const express = require("express");
const app = express();
const dotenv = require("dotenv");
const { exec } = require("child_process");

dotenv.config();

// Handlers
const handleGuildMembers = require("./utils/handlers/guildMembers");

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
  if (interaction.isButton()) {
    // Handle button interaction
    await handleGuildMembers(interaction);
    return; // Stop further handling
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
        ephemeral: true,
      });
    }
  }
});

// On ready
client.once(Events.ClientReady, () => {
  console.log(`Bot is online as ${client.user.tag}`);
});

app.post("/webhook", (req, res) => {
  console.log("Received webhook:", req.body);
  exec("git pull origin main", (err, stdout, stderr) => {
    if (err) {
      console.error(`Error: ${stderr}`);
      return res.status(500).send("Pull failed");
    }
    console.log(`Pulled: ${stdout}`);
    res.send("Pulled!");
  });
});

app.get("/", (req, res) => {
  res.send("Bot is alive!");
});

app.listen(3000, () => {
  console.log("Keep-alive server running on port 3000");
});

client.login(process.env.DISCORD_TOKEN);
