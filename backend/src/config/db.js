/**
 * db.js — Mongoose connection setup.
 * Throws on missing MONGO_URI so the app fails fast rather than silently.
 */
const mongoose = require("mongoose");

async function connectDB() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error("MONGO_URI is not set in environment");

  await mongoose.connect(uri);
  console.log("MongoDB connected:", mongoose.connection.host);
}

module.exports = { connectDB };
