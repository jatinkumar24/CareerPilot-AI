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

## Deploying the full application to Vercel

The React frontend and serverless API are both deployed from the `client` directory. Before authentication, resume cloud storage and analysis can work in production, configure these Environment Variables in the Vercel project (Production and Preview as needed):

- `MONGODB_URI`: a MongoDB Atlas connection string. Create a database user and allow Vercel deployments to connect in Atlas Network Access.
- `JWT_SECRET`: a long, random secret (at least 32 characters). Do not commit it to GitHub.
- `CLIENT_URL`: the deployed website origin, for example `https://career-pilot-ai-opal-chi.vercel.app`.

Then redeploy the project. Check `/api/health`; it should return a connected database status. The frontend uses the same-origin `/api` endpoint by default.

## Important
The current resume score is a transparent completeness checklist, not a certified ATS score. Skill matching uses starter role checklists and is not a hiring prediction. The app is ready for a later Gemini API integration; no secret API key is exposed in the browser.

## Environment variables
See `server/.env.example`. Keep `JWT_SECRET` private and never commit `.env`.
