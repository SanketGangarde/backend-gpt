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

// Trust reverse proxy (Nginx / Cloudflare Tunnel) to identify HTTPS connections
app.set("trust proxy", 1);

const allowedOrigins = [
  "https://frontend-gpt-livid.vercel.app",
];

if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL.replace(/\/+$/, ""));
}
if (process.env.FRONT_END_URL) {
  allowedOrigins.push(process.env.FRONT_END_URL.replace(/\/+$/, ""));
}

// CORS — allow credentials for session cookies
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, cURL)
    if (!origin) return callback(null, true);
    
    // Match exact origin or any vercel.app preview domain
    if (allowedOrigins.includes(origin) || origin.endsWith(".vercel.app")) {
      return callback(null, true);
    }
    
    // Fallback: reflect origin to prevent CORS blocking
    return callback(null, true);
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));


app.use(express.json());

const isCrossSite = true;

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || "mitra-secret-key-change-in-production",
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    httpOnly: true,
    secure: isCrossSite,
    sameSite: isCrossSite ? "none" : "lax",
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
