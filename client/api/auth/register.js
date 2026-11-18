import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

let connection;
async function db() {
  if (mongoose.connection.readyState === 1) return;
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is missing.");
  if (!connection) connection = mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  try { await connection; } catch (error) { connection = null; throw error; }
}
const User = mongoose.models.User || mongoose.model("User", new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true }
}, { timestamps: true }));

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");
  if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed." });
  try {
    await db();
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const { name, email, password } = body;
    if (!name?.trim() || !email || !String(email).includes("@") || !password || password.length < 8)
      return res.status(400).json({ message: "Enter your name, a valid email and a password of at least 8 characters." });
    const normalizedEmail = String(email).toLowerCase().trim();
    if (await User.findOne({ email: normalizedEmail }))
      return res.status(409).json({ message: "An account with this email already exists." });
    const user = await User.create({ name: name.trim(), email: normalizedEmail, password: await bcrypt.hash(password, 12) });
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error("JWT_SECRET must contain at least 32 characters.");
    const token = jwt.sign({ id: user._id, name: user.name, email: user.email }, process.env.JWT_SECRET, { expiresIn: "7d" });
    return res.status(201).json({ token, user: { id: user._id, name: user.name, email: user.email } });
  } catch (error) {
    console.error("CareerPilot registration error:", error.message);
    return res.status(500).json({ message: error.message || "Registration failed." });
  }
}