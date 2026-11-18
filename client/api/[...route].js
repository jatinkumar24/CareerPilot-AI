import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const app = express();
app.set("trust proxy", 1);
app.use(helmet());
app.use(cors({ origin: true }));
app.use(express.json({ limit: "1mb" }));
app.use("/api", rateLimit({ windowMs: 900000, limit: 180 }));
let connection;
async function db() {
  if (mongoose.connection.readyState === 1) return;
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is missing from Vercel environment variables.");
  if (!connection) connection = mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  try { await connection; } catch (e) { connection = null; throw e; }
}
const User = mongoose.models.User || mongoose.model("User", new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true }
}, { timestamps: true }));
const Resume = mongoose.models.Resume || mongoose.model("Resume", new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  title: String, personal: mongoose.Schema.Types.Mixed,
  skills: [String], experience: [mongoose.Schema.Types.Mixed],
  education: [mongoose.Schema.Types.Mixed], projects: [mongoose.Schema.Types.Mixed]
}, { timestamps: true }));
const router = express.Router();
const secret = () => {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error("JWT_SECRET must contain at least 32 characters.");
  return process.env.JWT_SECRET;
};
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const auth = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Please sign in to continue." });
    req.user = jwt.verify(token, secret());
    next();
  } catch { return res.status(401).json({ message: "Your session expired. Please sign in again." }); }
};
const tokenFor = user => jwt.sign({ id: user._id, name: user.name, email: user.email }, secret(), { expiresIn: "7d" });

router.post("/auth/register", wrap(async (req, res) => {
  await db();
  const { name, email, password } = req.body || {};
  if (!name?.trim() || !email || !String(email).includes("@") || !password || password.length < 8)
    return res.status(400).json({ message: "Enter your name, a valid email and a password of at least 8 characters." });
  if (await User.findOne({ email: email.toLowerCase() }))
    return res.status(409).json({ message: "An account with this email already exists." });
  const user = await User.create({ name: name.trim(), email: email.toLowerCase(), password: await bcrypt.hash(password, 12) });
  res.status(201).json({ token: tokenFor(user), user: { id: user._id, name: user.name, email: user.email } });
}));
router.post("/auth/login", wrap(async (req, res) => {
  await db();
  const user = await User.findOne({ email: String(req.body?.email || "").toLowerCase() });
  if (!user || !await bcrypt.compare(req.body?.password || "", user.password))
    return res.status(401).json({ message: "Email or password is incorrect." });
  res.json({ token: tokenFor(user), user: { id: user._id, name: user.name, email: user.email } });
}));
router.get("/resumes", auth, wrap(async (req, res) => { await db(); res.json(await Resume.find({ user: req.user.id }).sort({ updatedAt: -1 })); }));
router.post("/resumes", auth, wrap(async (req, res) => {
  await db();
  const { title, personal, skills, experience, education, projects } = req.body || {};
  res.status(201).json(await Resume.create({ user: req.user.id, title, personal, skills, experience, education, projects }));
}));
router.put("/resumes/:id", auth, wrap(async (req, res) => {
  await db();
  const { title, personal, skills, experience, education, projects } = req.body || {};
  const doc = await Resume.findOneAndUpdate({ _id: req.params.id, user: req.user.id },
    { $set: { title, personal, skills, experience, education, projects } }, { new: true, runValidators: true });
  if (!doc) return res.status(404).json({ message: "Resume not found." });
  res.json(doc);
}));
router.delete("/resumes/:id", auth, wrap(async (req, res) => {
  await db();
  const doc = await Resume.findOneAndDelete({ _id: req.params.id, user: req.user.id });
  if (!doc) return res.status(404).json({ message: "Resume not found." });
  res.json({ message: "Resume deleted." });
}));

const roles = {
  "MERN Stack Developer": ["JavaScript","React","Node.js","Express.js","MongoDB","REST APIs","Git","HTML","CSS","Authentication","Deployment"],
  "Java Developer": ["Java","OOP","Data Structures","Algorithms","Spring Boot","SQL","REST APIs","Git","JUnit","Maven"],
  "Frontend Developer": ["HTML","CSS","JavaScript","React","Responsive Design","Accessibility","Git","REST APIs","Testing"],
  "Data Analyst": ["SQL","Excel","Python","Pandas","Power BI","Statistics","Data Cleaning","Data Visualization","Communication"],
  "AI / ML Engineer": ["Python","Machine Learning","Statistics","Pandas","NumPy","Scikit-learn","Deep Learning","SQL","Model Evaluation"]
};
router.get("/analysis/roles", auth, (_req, res) => res.json(Object.keys(roles)));
router.post("/analysis/skills", auth, (req, res) => {
  const role = roles[req.body?.role] ? req.body.role : "MERN Stack Developer";
  const input = (req.body?.skills || []).map(x => String(x).trim().toLowerCase());
  const required = roles[role], matched = required.filter(x => input.includes(x.toLowerCase()));
  const missing = required.filter(x => !input.includes(x.toLowerCase()));
  res.json({ role, score: Math.round(matched.length / required.length * 100), matched, missing,
    plan: missing.slice(0, 5).map((skill, i) => ({ skill, priority: i < 2 ? "High" : "Medium",
      action: "Learn " + skill + " fundamentals, build a practical project and document the result in your portfolio." })) });
});
router.post("/analysis/resume", auth, (req, res) => {
  const { personal = {}, skills = [], experience = [], education = [], projects = [] } = req.body || {};
  const checks = [
    ["Contact details", !!(personal.email && personal.phone), "Add a professional email and phone number."],
    ["Professional summary", !!personal.summary?.trim(), "Write a tailored 2–3 sentence summary."],
    ["Relevant skills", skills.length >= 5, "Include at least five relevant skills."],
    ["Experience", experience.some(x => x.role && x.details), "Add experience with outcomes."],
    ["Education", education.length > 0, "Add your degree and institution."],
    ["Projects", projects.some(x => x.name && x.details), "Showcase projects with technologies and outcomes."]
  ];
  const score = Math.round(checks.filter(x => x[1]).length / checks.length * 100);
  res.json({ score, checks: checks.map(([label, passed, tip]) => ({ label, passed, tip })),
    summary: score >= 85 ? "Strong foundation. Refine keywords and quantify your impact." : "Good start. Complete these recommendations to strengthen your resume.",
    disclaimer: "This is a guidance score, not a certified ATS result or a guarantee of interview selection." });
});
app.use("/api", router);
app.get("/api/health", wrap(async (_req, res) => { await db(); res.json({ status: "ok", database: "connected" }); }));
app.use((err, _req, res, _next) => {
  console.error("CareerPilot API error:", err.message);
  const configError = err.message.includes("MONGODB_URI") || err.message.includes("JWT_SECRET");
  res.status(configError ? 503 : 500).json({ message: err.message || "Server error." });
});
export default app;
