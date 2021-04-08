const AppError = require("shared/error");
const Logger = require("shared/logger");

// Middleware
const authenticate = require("../middleware/authenticate.js");
const { body } = require("express-validator");
const { ValidateCheck } = require("shared/utilities");

// Models
const { User } = require("shared/models");

// Utilities
const { Email } = require("shared/utilities");

const ENVIRONMENT = process.env.ENVIRONMENT;

// Routes
const router = require("express").Router();

router.get("/admin",
authenticate,
(request, response, next) => {
  return response.render("admin", {
    environment: ENVIRONMENT
  });
});

router.post("/set-do-not-email",
[
  authenticate,
  body("email")
  .exists().withMessage("Missing email address.")
  .isEmail().withMessage("Invalid email address.")
  .normalizeEmail(),
  ValidateCheck
],
(request, response, next) => {
  var email = request.values.email;
  // Check that we do have this email in the database
  return User.getWithEmail(email)
    .then(user => {
      return User.setDoNotEmail(email, user.doNotEmailCode);
    })
    .then(success => {
      response.status(200).json({
        message: "Do not email set successfully."
      });
    })
    .catch(error => { next(error); });
});

router.post("/delete-user-with-email",
[
  authenticate,
  body("email")
  .exists().withMessage("Missing email address.")
  .isEmail().withMessage("Invalid email address.")
  .normalizeEmail(),
  body("reason")
  .exists().withMessage("A reason for deletion is required.")
  .not().isEmpty().withMessage("A reason for deletion is required."),
  body("banned")
  .isBoolean(),
  ValidateCheck
],
(request, response, next) => {
  var email = request.values.email;
  var reason = request.values.reason;
  var banned = request.values.banned;
  // Check that we do have this email in the database
  return User.getWithEmail(email)
    .then(user => {
      // Send email alert to user
      return Email.sendAuditAlert(email, "Delete user account and cancel all desktop subscriptions. Any iOS/Android subscriptions must be cancelled separately using the app store.", reason)
      .then(success => {
        // Delete the user
        return user.delete(reason, banned);
      })
      .then(success => {
        response.status(200).json({
          message: "Deleted user successfully. Any iOS/Android subscriptions must be deleted separately."
        });
      });
    })
    .catch(error => { next(error); });
});

router.post("/delete-user-with-id",
[
  authenticate,
  body("id")
  .isAlphanumeric().withMessage("Invalid id."),
  body("reason")
  .exists().withMessage("A reason for deletion is required.")
  .not().isEmpty().withMessage("A reason for deletion is required."),
  body("banned")
  .isBoolean(),
  ValidateCheck
],
(request, response, next) => {
  var id = request.values.id;
  var reason = request.values.reason;
  var banned = request.values.banned;
  // Check that we do have this email in the database
  return User.getWithId(id)
    .then(user => {
      // Delete the user
      return user.delete(reason, banned)
      .then(success => {
        response.status(200).json({
          message: "Deleted user successfully. Any iOS/Android subscriptions must be deleted separately."
        });
        if (user.email) {
          Email.sendAuditAlert(user.email, "Delete user account and cancel all desktop subscriptions. Any iOS/Android subscriptions must be cancelled separately using the app store.", reason)
        }
      });
    })
    .catch(error => { next(error); });
});

router.get("/change-password",
authenticate,
(request, response, next) => {
  response.render("change-password");
});

router.post("/change-password",
[
  authenticate,
  body("currentPassword")
    .exists().withMessage("Missing current password.")
    .not().isEmpty().withMessage("Missing current password.")
    .custom((value, {req, location, path}) => {
      return req.user.assertPassword(value);
    }).withMessage("Current password is incorrect."),
  body("newPassword")
    .exists().withMessage("Missing new password.")
    .not().isEmpty().withMessage("Missing new password.")
    .isLength({ min: 8, max: 50 }).withMessage("New password must be at least 8 characters long."),
  ValidateCheck
],
(request, response, next) => {
  const currentPassword = request.values.currentPassword;
  const newPassword = request.values.newPassword;
  return request.user.changePassword(currentPassword, newPassword)
    .then( success => {
      Email.sendAdminAlert("Admin Password Changed",
      `IP: ${request.ip}
      Time: ${new Date()}
      Email: ${request.user.email}`);
      request.flashRedirect("success", "Password changed successfully.", "/admin");
    })
    .catch(error => { next(error); });
});

module.exports = router;
