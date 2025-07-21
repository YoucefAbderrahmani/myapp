require('dotenv').config();

const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const mongoose = require('mongoose');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// ✅ Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// ✅ View Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ✅ Middleware
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ✅ Session
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// ✅ Passport setup
app.use(passport.initialize());
app.use(passport.session());

const User = require('./models/User');

// ✅ Google OAuth Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL
}, async (accessToken, refreshToken, profile, done) => {
  try {
    let user = await User.findOne({ googleId: profile.id });

    if (!user) {
      user = new User({
        googleId: profile.id,
        username: null,
        phone: null,
        email: profile.emails?.[0]?.value || '',
        avatarUrl: profile.photos?.[0]?.value || '/images/default-avatar.png'
      });
      await user.save();
    }

    return done(null, user);
  } catch (err) {
    return done(err);
  }
}));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    return done(null, user);
  } catch (err) {
    return done(err);
  }
});

// ✅ Google Auth Routes
app.get('/auth/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    prompt: 'select_account'
  })
);

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  async (req, res, next) => {
    try {
      const user = req.user;

      req.login(user, (err) => {
        if (err) {
          console.error('Login error after Google callback:', err);
          return next(err);
        }

        req.session.userId = user._id;

        if (!user.username?.trim() || !user.phone?.trim()) {
          return res.redirect('/complete-profile');
        }

        return res.redirect('/main/home');
      });
    } catch (err) {
      console.error("Callback error:", err);
      res.redirect('/login');
    }
  }
);

// ✅ Logout
app.get('/logout', (req, res, next) => {
  req.logout(err => {
    if (err) {
      console.error('❌ Logout error:', err);
      return next(err);
    }
    req.session.destroy(() => {
      res.redirect('/login');
    });
  });
});

// ✅ App Routes
const authRoutes = require('./routes/auth');
const mainRoutes = require('./routes/mainRoutes');

app.use('/', authRoutes);
app.use('/', mainRoutes);

// ✅ 404 Handler
app.use((req, res) => {
  res.status(404).render('error', {
    title: 'Page Not Found',
    error: '404 - Page Not Found',
    user: req.user || null,
    profileError: null
  });
});

// ✅ Global Error Handler
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err);
  res.status(500).render('error', {
    title: 'Server Error',
    error: err.message || 'Something went wrong',
    user: req.user || null,
    profileError: null
  });
});

// ✅ Chat with Socket.io
let messageHistory = [];

io.on('connection', (socket) => {
  console.log('💬 A user connected');
  socket.emit('chat history', messageHistory);

  socket.on('chat message', ({ username, msg }) => {
    if (username && msg) {
      const messageData = { username, msg };
      messageHistory.push(messageData);
      if (messageHistory.length > 100) messageHistory.shift();
      io.emit('chat message', messageData);
    }
  });

  socket.on('disconnect', () => {
    console.log('❌ A user disconnected');
  });
});

// ✅ Start Server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log('🌐 Callback URL:', process.env.GOOGLE_CALLBACK_URL);
});
