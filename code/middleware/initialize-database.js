const AppError = require("shared/error");
const Logger = require("shared/logger");

// Constants
const PG_MAIN_PASSWORD = process.env.PG_MAIN_PASSWORD;
const PG_DEBUG_PASSWORD = process.env.PG_DEBUG_PASSWORD;

// Utilities
const { Database } = require("shared/utilities");
const Schema = require("shared/schema");

module.exports = (request, response, next) => {
  if (request.query.initialize == "true" && !request.originalUrl.includes("/notification")) {
    Logger.info("Initialize query parameter detected, checking if database initialized.");
    // If database is not initialized, then initialize it
    return Database.query(
      `SELECT email FROM admin_users
        WHERE 1=1
        LIMIT 1`)
      .then( result => {
        Logger.info("Database already initialized -- continuing. ");
        next();
      })
      .catch( error => {
        Logger.info("Database not initialized -- attempting to initialize.");
        return Schema.getTemplated(
          PG_MAIN_PASSWORD,
          PG_DEBUG_PASSWORD
        )
        .then( schema => {
          return Database.query(schema);
        })
        .then( result => {
          Logger.info("Schema applied. Continuing...");
          next();
        })
        .catch( error => {
          Logger.error(error);
          next(new AppError(500, 99, "Error initializing database: ", error));
        });
      });
  }
  else {
    next();
  }
};
