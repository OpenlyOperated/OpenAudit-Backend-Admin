const Logger = require("shared/logger");

// Load environment variables
require("shared/environment")([
  "COMMON",
  "ADMIN",
  "MAIN",
  "DEBUG"
]);

// Load database login
process.env.PG_USER = "master";
process.env.PG_PASSWORD = process.env.PG_ADMIN_PASSWORD;
