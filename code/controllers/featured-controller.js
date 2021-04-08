const AppError = require("shared/error");
const Logger = require("shared/logger");

// Middleware
const authenticate = require("../middleware/authenticate.js");
const { body } = require("express-validator");
const { ValidateCheck } = require("shared/utilities");

// Models
const { Doc } = require("shared/models");

// Utilities
const { Email } = require("shared/utilities");

const ENVIRONMENT = process.env.ENVIRONMENT;

// Routes
const router = require("express").Router();

router.get("/featured",
authenticate,
(request, response, next) => {
  return response.render("featured");
});

router.post("/set-featured",
[
  authenticate,
  body("docId")
  .exists().withMessage("Missing docId."),
  body("newValue")
  .exists().withMessage("Missing newValue."),
  ValidateCheck
],
(request, response, next) => {
  var docId = request.values.docId;
  var newValue = request.values.newValue;

  Email.sendAdminAlert("Setting featured doc",
  `ID: ${docId} Featured: ${newValue}
  IP: ${request.ip}
  Time: ${new Date()}
  Email: ${request.user.email}`);

  return Doc.setFeatured(docId, newValue)
    .then(success => {
      response.status(200).json({
        message: "Set featured successfully."
      });
    })
    .catch(error => { next(error); });
});

module.exports = router;
