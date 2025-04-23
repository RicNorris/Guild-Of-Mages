const express = require("express");
const app = express();
const PORT = process.env.PORT || 3001;

// Serve static files from /public
app.use("/assets", express.static("public"));

app.listen(PORT, () => {
  console.log(`Static file server running at http://localhost:${PORT}/assets`);
});
