const AppError = require("shared/error");
const Logger = require("shared/logger");

// Middleware
const { body, query, check, oneOf } = require("express-validator");
const { ValidateCheck } = require("shared/utilities");

// Utilities
const { Email } = require("shared/utilities");

// Models
const { AdminUser } = require("shared/models");

const DOMAIN = process.env.DOMAIN;

// Routes
const router = require("express").Router();

/*********************************************
 *
 * Sign In Page
 *
 *********************************************/

router.get("/signin",
(request, response, next) => {
  response.render("signin");
});

router.post("/signin",
[
  // Email/Password in POST
  body("email")
    .exists().withMessage("Missing email address.")
    .isEmail().withMessage("Invalid email address.")
    .normalizeEmail()
    .custom((email, { request }) => {
      return email.endsWith("@" + DOMAIN);
    }).withMessage("Email address must end in: @" + DOMAIN),
  body("password")
    .exists().withMessage("Missing password.")
    .not().isEmpty().withMessage("Missing password."),
  ValidateCheck
],
(request, response, next) => {
  const email = request.values.email;
  const password = request.values.password;
  return AdminUser.getWithEmailAndPassword(email, password)
    .then( user => {
      if (user.emailConfirmed === true) {
        request.session.regenerate(error => {
          if (error) {
            throw new AppError(500, 2, "Couldn't regenerate session", error);
          }
          request.session.userEmail = user.email;
          request.session.save(error => {
            if (error) {
              throw new AppError(500, 2, "Couldn't save session", error);
            }
            Email.sendAdminAlert("Successful Sign In",
`Successful Sign In
IP: ${request.ip}
Time: ${new Date()}
Email: ${email}`);
            return response.redirect("/admin");
          });
        });
      }
      else {
        throw new AppError(200, 1, "Email Not Confirmed");
      }
    })
    .catch( error => {
      next(error);
    });
});

/*********************************************
 *
 * Log Out
 *
 *********************************************/

router.get("/logout",
(request, response, next) => {
  if (request.session) {
    request.session.destroy(error => {
      if (error) {
        // Deleting an invalid session is not a throwing error
        Logger.error("Couldn't delete session: " + error.stack);
      }
      return response.redirect("/signin");
    });
  }
  else {
    response.redirect("/signin");
  }
});

module.exports = router;
