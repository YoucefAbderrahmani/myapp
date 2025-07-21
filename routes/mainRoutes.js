const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Tournament = require('../models/Tournament');
const StoreItem = require('../models/StoreItem');

// ✅ Fix: Handle root route so / shows home page
router.get('/', (req, res) => {
  res.redirect('/main/home');
});

// Middleware to check authentication
function ensureAuthenticated(req, res, next) {
  if (!req.isAuthenticated() || !req.session.userId) {
    console.log('[Auth] Not authenticated or missing session userId');
    return res.redirect('/login');
  }

  User.findById(req.session.userId)
    .then(user => {
      if (!user) {
        console.log('[Auth] No user found for session userId');
        return res.redirect('/login');
      }

      console.log('[Auth] User found:', user.username, user.phone);

      req.user = user;

      const profileIncomplete = !user.username?.trim() || !user.phone?.trim();
      console.log('[Auth] Profile complete?', !profileIncomplete);

      if (profileIncomplete && !req.originalUrl.startsWith('/complete-profile')) {
        return res.redirect('/complete-profile');
      }

      next();
    })
    .catch(err => {
      console.error('Auth middleware error:', err);
      res.redirect('/login');
    });
}

// Apply middleware to protected routes
router.use(['/main', '/complete-profile'], ensureAuthenticated);

// Main page redirect
router.get('/main', (req, res) => {
  res.redirect('/main/home');
});

// Dynamic main pages
router.get('/main/:page', async (req, res) => {
  const validPages = ['home', 'tournaments', 'store', 'profile', 'about'];
  const currentPage = req.params.page;

  if (!validPages.includes(currentPage)) {
    return res.redirect('/main/home');
  }

  try {
    const data = {
      title: currentPage.charAt(0).toUpperCase() + currentPage.slice(1),
      username: req.user?.username || 'Guest',
      avatarUrl: req.user.avatarUrl || '/images/default-avatar.png',
      currentPage,
      user: null,
      tournaments: [],
      items: [],
    };

    if (currentPage === 'profile') {
      data.user = await User.findById(req.session.userId)
        .select('username avatarUrl stats bio phone socialLinks')
        .lean();
    } else if (currentPage === 'tournaments') {
      data.tournaments = await Tournament.find({}).lean();
    } else if (currentPage === 'store') {
      data.items = await StoreItem.find({}).lean();
    }

    res.render('main', data);
  } catch (err) {
    console.error('Main page error:', err);
    res.redirect('/main/home');
  }
});

// Complete profile GET
router.get('/complete-profile', (req, res) => {
  if (req.user.username && req.user.phone) {
    return res.redirect('/main/home');
  }

  res.render('complete-profile', {
    profileError: null,
    username: req.user.username || '',
    phone: req.user.phone || ''
  });
});

// Complete profile POST
router.post('/complete-profile', async (req, res) => {
  const { username, phone } = req.body;

  if (!username || !phone) {
    return res.render('complete-profile', {
      profileError: 'Both username and phone are required',
      username,
      phone
    });
  }

  try {
    // Check if username is already taken
    const existingUser = await User.findOne({
      username,
      _id: { $ne: req.user._id }
    });

    if (existingUser) {
      return res.render('complete-profile', {
        profileError: 'Username already taken',
        username,
        phone
      });
    }

    // Check if phone number is already in use
    const existingPhone = await User.findOne({
      phone,
      _id: { $ne: req.user._id }
    });

    if (existingPhone) {
      return res.render('complete-profile', {
        profileError: 'Phone number already in use',
        username,
        phone
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { username, phone },
      { new: true }
    );

    req.login(updatedUser, (err) => {
      if (err) {
        console.error('Login refresh error:', err);
        return res.render('complete-profile', {
          profileError: 'Error updating session',
          username,
          phone
        });
      }

      req.session.userId = updatedUser._id;

      req.session.save((saveErr) => {
        if (saveErr) {
          console.error('Session save error:', saveErr);
          return res.render('complete-profile', {
            profileError: 'Error saving session',
            username,
            phone
          });
        }

        return res.redirect('/main/home');
      });
    });

  } catch (err) {
    console.error('Profile completion error:', err);
    return res.render('complete-profile', {
      profileError: 'An error occurred. Please try again.',
      username,
      phone
    });
  }
});

// Logout
router.get('/logout', (req, res) => {
  req.logout(() => {
    req.session.destroy(err => {
      if (err) console.error('Logout error:', err);
      res.redirect('/login');
    });
  });
});

module.exports = router;
