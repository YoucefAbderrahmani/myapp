const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: false,
    unique: true,
    sparse: true,
  },
  email: {
    type: String,
    required: false,
    unique: true,
    sparse: true,
  },
  password: {
    type: String,
    required: false
  },
  googleId: {
    type: String,
    required: false,
    unique: true,
    sparse: true
  },
  phone: {
    type: String,
    required: false,
    unique: true,
    sparse: true // Allows multiple users to not have a phone
  }
}, {
  timestamps: true
});

module.exports = mongoose.model("User", userSchema);
