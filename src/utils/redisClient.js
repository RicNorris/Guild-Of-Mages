const { createClient } = require("redis");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

const redis = createClient({
  url: process.env.REDIS_URL,
  socket: {
    tls: true,
    rejectUnauthorized: false,
  },
});

redis.on("error", (err) => console.error("Redis Client Error", err));

(async () => {
  await redis.connect();
})();

module.exports = redis;
