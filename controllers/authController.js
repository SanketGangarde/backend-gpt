import bcrypt from "bcrypt";
import passport from "passport";
import User from "../models/User.js";

// Register a new user
export const register = async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: "All fields are required." });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters." });
  }

  try {
    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [
        { email: email.toLowerCase().trim() },
        { username: username.trim() },
      ],
    });

    if (existingUser) {
      const field = existingUser.email === email.toLowerCase().trim() ? "Email" : "Username";
      return res.status(409).json({ error: `${field} already exists.` });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = new User({
      username: username.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
    });

    await user.save();

    // Auto-login after registration
    req.login(user, (err) => {
      if (err) {
        console.error("Auto-login after register failed:", err);
        return res.status(201).json({ message: "Registered successfully. Please log in." });
      }
      return res.status(201).json({
        message: "Registered successfully!",
        user: { id: user._id, username: user.username, email: user.email },
      });
    });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ error: "Server error during registration." });
  }
};

// Login
export const login = (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) {
      console.error("Login error:", err);
      return res.status(500).json({ error: "Server error during login." });
    }

    if (!user) {
      return res.status(401).json({ error: info?.message || "Invalid credentials." });
    }

    req.login(user, (err) => {
      if (err) {
        console.error("Session login error:", err);
        return res.status(500).json({ error: "Failed to create session." });
      }
      return res.json({
        message: "Logged in successfully!",
        user: { id: user._id, username: user.username, email: user.email },
      });
    });
  })(req, res, next);
};

// Logout
export const logout = (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error("Logout error:", err);
      return res.status(500).json({ error: "Failed to logout." });
    }
    req.session.destroy((err) => {
      if (err) {
        console.error("Session destroy error:", err);
      }
      res.clearCookie("connect.sid");
      res.json({ message: "Logged out successfully." });
    });
  });
};

// Get current user
export const getMe = (req, res) => {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ error: "Not authenticated." });
  }
  res.json({
    user: { id: req.user._id, username: req.user.username, email: req.user.email },
  });
};
