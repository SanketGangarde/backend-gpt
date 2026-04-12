import express from "express";
import axios from "axios";
import cors from "cors";
import "dotenv/config";
import dotenv from "dotenv";
import mongoose from "mongoose";
import chatRoutes from "./routes/chat.js"
dotenv.config();



const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("API is running");
});

app.use("/api",chatRoutes);

app.listen(3000, () => {
  console.log("Backend is listening on port 3000");
  connectDb();
});

const connectDb = async () => {
  try{
       await mongoose.connect(process.env.MONGODB_URI)
       .then(console.log("mongodb connected successfully!"));
  }catch(err) {
    console.log(err,"mongodb connection failed!");
  }
}
 




