
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();

// =======================
// ✅ MIDDLEWARE
// =======================
app.use(cors());
app.use(express.json());

// =======================
// 🔗 MongoDB
// =======================
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.log("DB ERROR:", err.message));

// =======================
// 📦 SCHEMAS
// =======================
const jobSchema = new mongoose.Schema({
  title: String,
  location: String,
  description: String
});
const Job = mongoose.model('Job', jobSchema);

const candidateSchema = new mongoose.Schema({
  name: String,
  prenom: String,
  email: String,
  phone: String,
  education: String,
  languages: [String],
  experience: String,
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job'
  }
});
const Candidate = mongoose.model("Candidate", candidateSchema);

// =======================
// 🔐 AUTH
// =======================
function auth(req, res, next) {
  const token = req.headers['authorization'];

  if (!token) return res.status(403).send("No token");

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).send("Invalid token");
    req.admin = decoded;
    next();
  });
}

// =======================
// 📥 JOB ROUTES
// =======================

// ✔ GET jobs (avec filtre city)
app.get("/jobs", async (req, res) => {
  const { city } = req.query;

  console.log("🔥 NEW SERVER VERSION LOADED");
  console.log("CITY:", city);

  try {
    let jobs;

    if (city) {
      jobs = await Job.find({
        location: { $regex: new RegExp("^" + city + "$", "i") }
      });
    } else {
      jobs = await Job.find();
    }

    res.json(jobs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ADD job
app.post('/add-job', auth, async (req, res) => {
  const { title, location, description } = req.body;

  const newJob = new Job({ title, location, description });
  await newJob.save();

  res.send("Job added");
});

// DELETE job
app.delete('/delete-job/:id', auth, async (req, res) => {
  await Job.findByIdAndDelete(req.params.id);
  res.send("Deleted");
});

// =======================
// 🔐 LOGIN
// =======================
app.post('/login', (req, res) => {
  const { email, password } = req.body;

  const ADMINS = [
    { email: "mayssamhaddadi@gmail.com", password: "123456" },
    { email: "s.jardi@voxerahire", password: "Tangertanger2025!" },
    { email: "hatimalfilali@gmail.com", password: "Maisam291104!" },
  ];

  const admin = ADMINS.find(a => a.email === email && a.password === password);

  if (admin) {
    const token = jwt.sign(
      { email: admin.email },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );
    return res.json({ token });
  }

  res.status(401).json({ message: "Email ou mot de passe incorrect" });
});

// =======================
// 📩 APPLY
// =======================
app.post("/apply", async (req, res) => {
  try {
    const {
      name,
      prenom,
      email,
      phone,
      education,
      languages,
      experience,
      jobId
    } = req.body;

    if (!name || !prenom || !email || !phone || !education || !languages || !experience || !jobId) {
      return res.status(400).send("Champs manquants");
    }

    const newCandidate = new Candidate({
      name,
      prenom,
      email,
      phone,
      education,
      languages,
      experience,
      jobId
    });

    await newCandidate.save();

    res.send("Candidature envoyée ✔");

  } catch (err) {
    console.log("ERROR:", err);
    res.status(500).send("Erreur serveur");
  }
});

// =======================
// 📊 CANDIDATS PAR JOB
// =======================
app.get("/candidates", async (req, res) => {
  try {
    const jobs = await Job.find();
    const candidates = await Candidate.find();

    const result = jobs.map(job => ({
      jobTitle: job.title,
      jobId: job._id,
      candidates: candidates.filter(
        c => c.jobId.toString() === job._id.toString()
      )
    }));

    res.json(result);

  } catch (err) {
    res.status(500).send("Erreur récupération candidats");
  }
});

// =======================
// 🚀 START SERVER
// =======================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
