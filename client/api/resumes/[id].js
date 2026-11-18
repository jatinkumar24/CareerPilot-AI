import mongoose from "mongoose";
import jwt from "jsonwebtoken";

let connection;
async function db() {
  if (mongoose.connection.readyState === 1) return;
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is missing from Vercel environment variables.");
  if (!connection) connection = mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  try { await connection; } catch (error) { connection = null; throw error; }
}
const Resume = mongoose.models.Resume || mongoose.model("Resume", new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  title: String, template: { type: String, default: "modern" }, personal: mongoose.Schema.Types.Mixed,
  skills: [String], experience: [mongoose.Schema.Types.Mixed],
  education: [mongoose.Schema.Types.Mixed], projects: [mongoose.Schema.Types.Mixed]
}, { timestamps: true }));
function userId(req) {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error("JWT_SECRET must contain at least 32 characters.");
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return null;
  try { return jwt.verify(token, process.env.JWT_SECRET).id; } catch { return null; }
}
function bodyOf(req) { return typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {}); }
export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");
  if (!["PUT", "DELETE"].includes(req.method)) return res.status(405).json({ message: "Method not allowed." });
  try {
    const user = userId(req);
    if (!user) return res.status(401).json({ message: "Please sign in to continue." });
    await db();
    const id = req.query.id;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: "Invalid resume ID." });
    if (req.method === "DELETE") {
      const deleted = await Resume.findOneAndDelete({ _id: id, user });
      if (!deleted) return res.status(404).json({ message: "Resume not found." });
      return res.status(200).json({ message: "Resume deleted." });
    }
    const data = bodyOf(req);
    const updated = await Resume.findOneAndUpdate({ _id: id, user }, { $set: {
      title: String(data.title || "My professional resume").slice(0, 160),
      template: ["modern", "professional", "minimal", "creative"].includes(data.template) ? data.template : "modern",
      personal: data.personal || {}, skills: Array.isArray(data.skills) ? data.skills : [],
      experience: Array.isArray(data.experience) ? data.experience : [],
      education: Array.isArray(data.education) ? data.education : [],
      projects: Array.isArray(data.projects) ? data.projects : []
    } }, { new: true, runValidators: true });
    if (!updated) return res.status(404).json({ message: "Resume not found." });
    return res.status(200).json(updated);
  } catch (error) {
    console.error("CareerPilot resume update/delete error:", error.message);
    return res.status(500).json({ message: error.message || "Could not update resume." });
  }
}