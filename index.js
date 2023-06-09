const express = require("express");
const app = express();
const port = 5000;

// Define routes
app.get("/", (req, res) => {
  res.send("TuneTutor is ready for teaching");
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
