# CareerPilot AI

A polished, responsive career workspace built with the MERN stack: MongoDB, Express, React and Node.js.

## Product features
- Public landing page with feature overview and login / registration
- JWT authentication and bcrypt password hashing
- Protected personal workspace
- Resume builder with profile, skills, education, experience and project sections
- Live resume preview and browser-based PDF export
- Resume completeness review with actionable feedback
- Skill gap comparison for MERN, Java, frontend, data analytics and AI/ML roles
- Personalized learning priorities based on missing skills
- Responsive layout for desktop and mobile

## Run locally
Requirements: Node.js 20+ and MongoDB (local or Atlas).

1. Copy `server/.env.example` to `server/.env`.
2. Set `MONGODB_URI` and a long random `JWT_SECRET` in `server/.env`.
3. Start the backend:
   ```bash
   cd server
   npm install
   npm run dev
   ```
4. In a second terminal, start the frontend:
   ```bash
   cd client
   npm install
   npm run dev
   ```
5. Open http://localhost:5173.

## Important
The current resume score is a transparent completeness checklist, not a certified ATS score. Skill matching uses starter role checklists and is not a hiring prediction. The app is ready for a later Gemini API integration; no secret API key is exposed in the browser.

## Environment variables
See `server/.env.example`. Keep `JWT_SECRET` private and never commit `.env`.
