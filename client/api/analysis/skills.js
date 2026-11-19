import jwt from "jsonwebtoken";

const roles = {
  "MERN Stack Developer": ["JavaScript","React","Node.js","Express.js","MongoDB","REST APIs","Git","HTML","CSS","Authentication","Deployment"],
  "Java Developer": ["Java","OOP","Data Structures","Algorithms","Collections","Spring Boot","SQL","REST APIs","Git","JUnit","Maven"],
  "Java Backend Developer": ["Java","OOP","Spring Boot","REST APIs","SQL","JPA/Hibernate","Microservices","JUnit","Maven","Git"],
  "Java Full Stack Developer": ["Java","OOP","Spring Boot","HTML","CSS","JavaScript","React","SQL","REST APIs","Git","Deployment"],
  "Spring Boot Developer": ["Java","OOP","Spring Boot","Spring MVC","Spring Data JPA","Spring Security","REST APIs","SQL","JUnit","Maven","Git"],
  "Frontend Developer": ["HTML","CSS","JavaScript","React","Responsive Design","Accessibility","Git","REST APIs","Testing"],
  "React Developer": ["HTML","CSS","JavaScript","React","Hooks","React Router","State Management","REST APIs","Testing","Git"],
  "Node.js Developer": ["JavaScript","Node.js","Express.js","REST APIs","Authentication","MongoDB","SQL","Testing","Git","Deployment"],
  "Python Developer": ["Python","OOP","Data Structures","SQL","APIs","Django or Flask","Testing","Git","Debugging"],
  "Python Backend Developer": ["Python","FastAPI or Django","REST APIs","SQL","Authentication","Testing","Docker","Git","Deployment"],
  "AI Engineer": ["Python","Machine Learning","LLMs","Prompt Engineering","Embeddings","Vector Databases","REST APIs","Model Evaluation","Git","Deployment"],
  "AI / ML Engineer": ["Python","Machine Learning","Statistics","Pandas","NumPy","Scikit-learn","Deep Learning","SQL","Model Evaluation"],
  "Machine Learning Engineer": ["Python","Statistics","Machine Learning","Scikit-learn","Feature Engineering","Model Evaluation","Deep Learning","Docker","APIs","MLOps"],
  "Data Analyst": ["SQL","Excel","Python","Pandas","Power BI","Statistics","Data Cleaning","Data Visualization","Communication"],
  "Data Scientist": ["Python","SQL","Statistics","Probability","Pandas","NumPy","Machine Learning","Data Visualization","Model Evaluation"],
  "Business Analyst": ["Excel","SQL","Requirements Gathering","Documentation","Process Mapping","Power BI","Stakeholder Communication","Data Analysis"],
  "Cyber Security Analyst": ["Networking","Linux","Security Fundamentals","SIEM","Incident Response","Vulnerability Assessment","Python","Risk Assessment","Cloud Security"],
  "Security Engineer": ["Networking","Linux","Python","Secure Coding","IAM","SIEM","Cloud Security","Threat Modeling","Automation"],
  "DevOps Engineer": ["Linux","Git","Docker","Kubernetes","CI/CD","AWS or Azure","Networking","Terraform","Monitoring","Scripting"],
  "Cloud Engineer": ["Linux","Networking","AWS or Azure","IAM","Cloud Networking","Docker","Terraform","Monitoring","Security"],
  "QA Engineer": ["Testing Fundamentals","Test Cases","Manual Testing","Automation Testing","Selenium or Playwright","API Testing","SQL","Bug Tracking","Git"],
  "Software Tester": ["Testing Fundamentals","Test Cases","Manual Testing","Automation Testing","API Testing","SQL","Bug Reporting","Regression Testing"],
  "Android Developer": ["Kotlin","Java","Android SDK","Android Studio","Jetpack Compose","REST APIs","SQLite","Git","Testing"],
  "UI/UX Designer": ["User Research","Wireframing","Prototyping","Figma","Visual Design","Accessibility","Usability Testing","Design Systems"],
  "Database Administrator": ["SQL","Database Design","Indexing","Query Optimization","Backup and Recovery","Security","Monitoring","PostgreSQL or MySQL"],
  "Power BI Developer": ["Power BI","DAX","Power Query","Data Modeling","SQL","Excel","Data Visualization","ETL","Business Intelligence"],
  "Software Engineer": ["Programming","OOP","Data Structures","Algorithms","SQL","Git","Testing","REST APIs","Problem Solving"],
  "Full Stack Developer": ["HTML","CSS","JavaScript","React","Node.js","REST APIs","SQL or MongoDB","Authentication","Git","Deployment"]
};
const aliases = { js:"javascript", "react.js":"react", nodejs:"node.js", express:"express.js", mongo:"mongodb", rest:"rest apis", api:"rest apis", spring:"spring boot", springboot:"spring boot", oops:"oop", "object oriented programming":"oop", "data structure":"data structures", dsa:"data structures", powerbi:"power bi", ml:"machine learning", "scikit learn":"scikit-learn", postgres:"postgresql", "amazon web services":"aws", "microsoft azure":"azure", html5:"html", css3:"css" };
const canon = value => { const key=String(value||"").trim().toLowerCase().replace(/\s+/g," "); return aliases[key]||key; };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed. Use POST." });
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Please sign in to continue." });
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) return res.status(503).json({ message: "JWT_SECRET is missing or too short in Vercel environment variables." });
    jwt.verify(token, process.env.JWT_SECRET);
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const role = String(body.role || "").trim();
    if (!roles[role]) return res.status(400).json({ message: "Choose a supported target job role." });
    const raw = Array.isArray(body.skills) ? body.skills : typeof body.skills === "string" ? body.skills.split(",") : [];
    const input = [...new Set(raw.map(canon).filter(Boolean))].slice(0,100);
    const required = roles[role];
    const matched = required.filter(skill => input.includes(canon(skill)));
    const missing = required.filter(skill => !input.includes(canon(skill)));
    const fallback = missing.map((skill,i)=>({skill,priority:i<Math.ceil(missing.length/3)?"High":i<Math.ceil(missing.length*2/3)?"Medium":"Low",action:`Learn ${skill} fundamentals, complete a hands-on exercise, then build a small project that demonstrates it.`,resource:"Use official documentation and a practical beginner tutorial."}));
    let plan=fallback, summary=`You currently match ${matched.length} of ${required.length} core skills for the ${role} role.`, analysisMode="skills-based";
    if (process.env.GEMINI_API_KEY && missing.length) {
      try {
        const prompt="Act as a practical entry-level career mentor. Create a concise learning plan using only these missing skills. Return ONLY JSON: {summary:string,plan:[{skill:string,priority:'High'|'Medium'|'Low',action:string,resource:string}]}. Target role: "+role+". Matched: "+JSON.stringify(matched)+". Missing: "+JSON.stringify(missing)+".";
        const response=await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key="+encodeURIComponent(process.env.GEMINI_API_KEY),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{responseMimeType:"application/json",temperature:0.2}}),signal:AbortSignal.timeout(15000)});
        if(response.ok){const payload=await response.json();const rawText=payload.candidates?.[0]?.content?.parts?.map(p=>p.text||"").join("")||"";const generated=JSON.parse(rawText);if(Array.isArray(generated.plan)){const bySkill=new Map(generated.plan.map(x=>[canon(x.skill),x]));plan=missing.map((skill,i)=>{const item=bySkill.get(canon(skill))||fallback[i];return {skill,priority:["High","Medium","Low"].includes(item.priority)?item.priority:fallback[i].priority,action:String(item.action||fallback[i].action).slice(0,500),resource:String(item.resource||fallback[i].resource).slice(0,250)}});summary=String(generated.summary||summary).slice(0,500);analysisMode="ai-enhanced";}}
      } catch (error) { console.warn("Gemini enhancement unavailable; using deterministic skill plan:",error.message); }
    }
    return res.status(200).json({role,score:Math.round(matched.length/Math.max(required.length,1)*100),matched,missing,plan,summary,analysisMode,requiredSkills:required,providedSkills:input,disclaimer:"This is an indicative skills comparison, not a hiring prediction. Job requirements vary by employer and seniority."});
  } catch (error) {
    console.error("Skill analysis endpoint error:",error.message);
    if (error.name==="JsonWebTokenError" || error.name==="TokenExpiredError") return res.status(401).json({message:"Your session expired. Please sign in again."});
    return res.status(500).json({message:"Skill analysis could not be completed: "+error.message});
  }
}
