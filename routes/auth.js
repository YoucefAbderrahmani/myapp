const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const { body, validationResult } = require("express-validator");
const passport = require("passport");
const User = require("../models/User");

// Helper: Check if user is logged in and has complete profile
function isLoggedIn(req) {
  return req.isAuthenticated() && req.user && req.user.username && req.user.phone;
}

// GET /register
router.get("/register", (req, res) => {
  if (isLoggedIn(req)) return res.redirect("/main/home");
  res.render("register", { errors: [], username: "", error: null });
});

// POST /register
router.post(
  "/register",
  [
    body("username").trim().isLength({ min: 3 }).withMessage("Username must be at least 3 characters")
      .matches(/^[a-zA-Z0-9_]+$/).withMessage("Only letters, numbers, and underscores allowed"),
    body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters"),
    body("phone").notEmpty().withMessage("Phone number is required"),
  ],
  async (req, res, next) => {
    const { username, password, phone } = req.body;
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.render("register", {
        errors: errors.array(),
        username,
        error: null
      });
    }

    try {
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.render("register", {
          errors: [{ msg: "Username already exists" }],
          username,
          error: "Username already exists"
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = new User({ 
        username, 
        password: hashedPassword,
        phone
      });
      
      await newUser.save();

      req.login(newUser, (err) => {
        if (err) return next(err);
        req.session.userId = newUser._id;
        return res.redirect("/main/home");
      });

    } catch (err) {
      console.error("Registration error:", err);
      res.render("register", {
        errors: [{ msg: "Registration failed" }],
        username,
        error: "Could not complete registration"
      });
    }
  }
);

// GET /login
router.get("/login", (req, res) => {
  if (isLoggedIn(req)) return res.redirect("/main/home");
  res.render("login", { error: null });
});

// POST /login
router.post("/login", async (req, res, next) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });
    if (!user) return res.render("login", { error: "Invalid username or password" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.render("login", { error: "Invalid username or password" });

    req.login(user, (err) => {
      if (err) return next(err);
      req.session.userId = user._id;
      
      // Check if profile is complete
      if (!user.username || !user.phone) {
        return res.redirect("/complete-profile");
      }
      
      return res.redirect("/main/home");
    });

  } catch (err) {
    console.error("Login error:", err);
    res.render("login", { error: "Login failed. Please try again." });
  }
});

// Passport session handling
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

// Google Auth
router.get('/auth/google', passport.authenticate('google', {
  scope: ['profile', 'email']
}));

router.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  async (req, res) => {
    try {
      req.session.userId = req.user._id;

      // Check for required profile fields
      if (!req.user.username || !req.user.phone) {
        return res.redirect('/complete-profile');
      }

      return res.redirect('/main/home');
    } catch (err) {
      console.error("Google login error:", err);
      res.redirect('/login');
    }
  }
);

// GET /logout
router.get("/logout", (req, res, next) => {
  req.logout(err => {
    if (err) return next(err);
    req.session.destroy(err => {
      if (err) console.error("Session destruction error:", err);
      res.redirect("/login");
    });
  });
});

module.exports = router;