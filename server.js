import express from "express";
import axios from "axios";
import cors from "cors";
import "dotenv/config";
import dotenv from "dotenv";
import mongoose from "mongoose";
import session from "express-session";
import passport from "passport";
import configurePassport from "./config/passport.js";
import chatRoutes from "./routes/chat.js";
import authRoutes from "./routes/auth.js";

dotenv.config();

const app = express();

const allowedOrigin = (process.env.FRONTEND_URL || process.env.FRONT_END_URL || "http://localhost:5173").replace(/\/+$/, "");

// CORS — allow credentials for session cookies
app.use(cors({
  origin: allowedOrigin,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));

app.use(express.json());

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || "mitra-secret-key-change-in-production",
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    httpOnly: true,
    secure: false, // set to true in production with HTTPS
    sameSite: "lax",
  },
}));

// Passport middleware
configurePassport(passport);
app.use(passport.initialize());
app.use(passport.session());

app.get("/", (req, res) => {
  res.send("Updated  API is running");
});

app.get("/hello", (req, res) => {
  res.send("updated 4 hello replied by api");
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api", chatRoutes);

app.listen(3000, () => {
  console.log("Backend is listening on port 3000");
  connectDb();
});

const connectDb = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("mongodb connected successfully!");
  } catch (err) {
    console.log(err, "mongodb connection failed!");
  }
};
