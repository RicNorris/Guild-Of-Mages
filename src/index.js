const { Client, GatewayIntentBits, Collection, Events } = require("discord.js");
const dotenv = require("dotenv");
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

client.login(process.env.DISCORD_TOKEN);
