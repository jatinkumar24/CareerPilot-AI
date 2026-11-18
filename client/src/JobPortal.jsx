import React,{useCallback,useEffect,useMemo,useState}from"react";
import axios from"axios";
import{BriefcaseBusiness,Search,MapPin,ExternalLink,BookmarkCheck,ClipboardList,RefreshCw,ArrowUpRight,CheckCircle2,Clock3,Trash2,Globe2,UploadCloud,Sparkles}from"lucide-react";
import"./style.css";
const api=axios.create({baseURL:import.meta.env.VITE_API_URL||"/api"});
api.interceptors.request.use(c=>{const t=localStorage.getItem("cp_token");if(t)c.headers.Authorization="Bearer "+t;return c});
const SOURCES=["LinkedIn","Naukri","Indeed","Arbeitnow","Remotive"];
const STATUSES=["Saved","Applied","Interview","Rejected","Offer"];
const slug=s=>String(s||"").trim().toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
function sourceSearch(source,q,location){
 const term=encodeURIComponent(q||"software developer"),place=encodeURIComponent(location||"India");
 if(source==="LinkedIn")return "https://www.linkedin.com/jobs/search/?keywords="+term+"&location="+place;
 if(source==="Indeed")return "https://in.indeed.com/jobs?q="+term+"&l="+place;
 if(source==="Naukri")return "https://www.naukri.com/"+slug(q||"software-developer")+"-jobs-in-"+slug(location||"india");
 return "https://www.google.com/search?q="+encodeURIComponent((q||"software developer")+" jobs "+(location||"India"));
}
function JobPortal(){
 const [query,Q]=useState(""),[place,P]=useState("India"),[sourceFilter,F]=useState("All"),[jobs,J]=useState([]),[applications,A]=useState([]),[loading,L]=useState(false),[error,E]=useState(""),[notice,N]=useState(""),[showTracker,ST]=useState(false),[resumeFile,RF]=useState(null),[matching,MT]=useState(false),[resumeProfile,RP]=useState(null),[isRecommended,IR]=useState(false);
 const loadApplications=useCallback(async()=>{try{const{data}=await api.get("/applications");A(data)}catch(e){E(e.response?.data?.message||"Could not load your application tracker. Check database configuration.")}},[]);
 const searchJobs=useCallback(async(term=query,location=place)=>{L(true);E("");try{const{data}=await api.get("/jobs/search",{params:{q:term,location}});J(data.jobs||[]);if(data.warnings?.length)E(data.warnings.join(" "))}catch(e){E(e.response?.data?.message||"Live job search is temporarily unavailable. Use the source search links below.")}finally{L(false)}},[query,place]);

 async function findJobsFromResume(){
  if(!resumeFile){E("Upload your resume first.");return}
  if(resumeFile.size>5*1024*1024){E("Resume must be smaller than 5 MB.");return}
  MT(true);E("");N("");
  try{
   const encoded=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(",")[1]||"");reader.onerror=()=>reject(new Error("Could not read this file."));reader.readAsDataURL(resumeFile)});
   const {data}=await api.post("/jobs/recommendations",{fileName:resumeFile.name,data:encoded,location:place||"India"});
   RP(data.profile);J(data.jobs||[]);F("All");ST(false);IR(true);
   if(data.warnings?.length)E(data.warnings.join(" "));
   N((data.jobs||[]).length?"Found jobs matched to your resume. Review the match reasons before applying.":"Resume analysed, but no close live matches were found. Try Remote or a broader location.");
  }catch(e){E(e.response?.data?.message||"Could not analyse this resume. Please try again.")}
  finally{MT(false)}
 }
 useEffect(()=>{searchJobs("", "India");loadApplications()},[]);
 const tracked=useMemo(()=>new Map(applications.map(a=>[a.jobUrl,a])),[applications]);
 const filtered=jobs.filter(j=>sourceFilter==="All"||j.source===sourceFilter);
 async function saveJob(job){try{await api.post("/applications",{...job,status:"Saved"});await loadApplications();N("Job saved to your application tracker.")}catch(e){E(e.response?.data?.message||"Could not save this job. Check your database configuration.")}}
 async function updateStatus(id,status){try{await api.patch("/applications/"+id,{status});await loadApplications();N("Application status updated.")}catch(e){E(e.response?.data?.message||"Could not update application status.")}}
 async function removeApplication(id){try{await api.delete("/applications/"+id);await loadApplications();N("Removed from your tracker.")}catch(e){E(e.response?.data?.message||"Could not remove this application.")}}
 const sourceLinks=["LinkedIn","Naukri","Indeed"].map(s=>({name:s,url:sourceSearch(s,query,place)}));
 return <><div className="pagehead"><div><small className="eyebrow">ONE PLACE FOR YOUR JOB SEARCH</small><h1>CareerPilot Job Hub</h1><p>Discover live openings, save roles and track every application.</p></div><button className="soft" onClick={()=>{ST(!showTracker);if(!showTracker)loadApplications()}}><ClipboardList size={16}/> {showTracker?"Browse jobs":"My applications"} ({applications.length})</button></div>
 {notice&&<div className="notice" onClick={()=>N("")}>{notice}　×</div>}{error&&<div className="notice job-error">{error}</div>}

 <section className="resume-job-match panel">
  <div className="resume-job-match-heading"><div className="resume-job-match-icon"><Sparkles size={20}/></div><div><h3>Find jobs that match your resume</h3><p>Upload your own resume. AI will identify your skills and suitable job titles, then rank live listings by relevance.</p></div></div>
  <div className="resume-job-match-controls">
   <label className="resume-job-file">Upload your resume (PDF or DOCX)<input type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={e=>RF(e.target.files?.[0]||null)}/></label>
   <label className="resume-job-location">Preferred location<input value={place} onChange={e=>P(e.target.value)} placeholder="India, Lucknow, Remote…"/></label>
   <button className="primary" disabled={!resumeFile||matching} onClick={findJobsFromResume}>{matching?<RefreshCw size={15} className="spin"/>:<Sparkles size={15}/>} {matching?"Analysing resume…":"Find matching jobs"}</button>
  </div>
  {resumeFile&&<small className="resume-job-file-name">{resumeFile.name} · {(resumeFile.size/1024/1024).toFixed(2)} MB</small>}
  <small className="resume-job-privacy">Your resume is processed to extract job-related skills and is not added to your public profile. Use a text-based PDF or DOCX; scanned PDFs need OCR.</small>
 </section>
 {resumeProfile&&<section className="panel resume-profile-result"><div><small className="eyebrow">YOUR RESUME PROFILE</small><h3>{resumeProfile.headline||"Recommended career matches"}</h3><p>{resumeProfile.summary}</p></div><div className="resume-profile-tags"><b>Suggested roles</b>{(resumeProfile.jobTitles||[]).map(x=><span key={x}>{x}</span>)}</div><div className="resume-profile-tags"><b>Detected skills</b>{(resumeProfile.skills||[]).map(x=><span key={x}>{x}</span>)}</div><small>Experience level: {resumeProfile.experienceLevel||"Not specified"} · Match scores are estimates based on visible job text, not hiring predictions.</small></section>}
 <section className="job-search panel"><div className="job-search-fields"><label>Job title or skills<input value={query} onChange={e=>Q(e.target.value)} onKeyDown={e=>e.key==="Enter"&&searchJobs()} placeholder="Java developer, React, data analyst…"/></label><label>Location<input value={place} onChange={e=>P(e.target.value)} onKeyDown={e=>e.key==="Enter"&&searchJobs()} placeholder="India, Bengaluru, Remote…"/></label><button className="primary job-search-button" disabled={loading} onClick={()=>searchJobs()}>{loading?<RefreshCw size={15} className="spin"/>:<Search size={15}/>} Search jobs</button></div>
 <div className="job-note"><Globe2 size={15}/> Listings below are fetched from public job-board feeds. LinkedIn, Naukri and Indeed open their own search pages; direct listing APIs require provider approval.</div>
 <div className="job-source-links">{sourceLinks.map(s=><a href={s.url} target="_blank" rel="noopener noreferrer" key={s.name}>{s.name} search <ExternalLink size={12}/></a>)}</div></section>
 {showTracker?<section className="panel application-tracker"><div className="tracker-heading"><div><h3>Application tracker</h3><p>Keep your job-search progress organized.</p></div><span className="job-count">{applications.length} tracked</span></div>
 {applications.length===0?<div className="job-empty"><ClipboardList size={34}/><h3>No applications saved yet</h3><p>Save a job from the listings to start tracking it here.</p></div>:<div className="tracker-list">{applications.map(a=><article className="tracker-item" key={a._id}><div className="tracker-main"><b>{a.title}</b><span>{a.company||"Company not listed"} · {a.source} · {a.location||"Location not listed"}</span><a href={a.jobUrl} target="_blank" rel="noopener noreferrer">Open job <ExternalLink size={12}/></a></div><select aria-label={"Status for "+a.title} value={a.status} onChange={e=>updateStatus(a._id,e.target.value)}>{STATUSES.map(s=><option key={s}>{s}</option>)}</select><button className="tracker-delete" title="Remove from tracker" onClick={()=>removeApplication(a._id)}><Trash2 size={15}/></button></article>)}</div>}</section>
 :<><div className="job-results-head"><b>{filtered.length} {isRecommended?"resume-matched jobs":"live listings"}</b><div className="job-source-filter"><label>Feed source</label><select value={sourceFilter} onChange={e=>F(e.target.value)}><option>All</option><option>Arbeitnow</option><option>Remotive</option></select></div></div>
 <div className="job-list">{loading?<div className="panel job-empty"><RefreshCw className="spin" size={30}/><h3>Finding current openings…</h3><p>Checking available job-board feeds.</p></div>:filtered.length?filtered.map(j=>{const saved=tracked.get(j.url);return <article className="panel job-card" key={j.id}><div className="job-card-top"><div className="job-company-icon"><BriefcaseBusiness size={20}/></div><div className="job-title-wrap"><h3>{j.title}</h3><p>{j.company||"Company not listed"}</p></div><span className="job-source-badge">{j.source}</span></div><div className="job-meta"><span><MapPin size={11}/> {j.location||"Location not specified"}</span>{j.remote&&<span>Remote</span>}{j.type&&<span>{j.type}</span>}{j.date&&<span>{j.date}</span>}</div>{isRecommended&&<><span className="job-card-match">{j.matchScore}% resume match</span>{j.matchedSkills?.length>0&&<p className="job-card-match-detail">Matching skills: {j.matchedSkills.join(", ")}</p>}</>}{j.description&&<p className="job-desc">{j.description}</p>}<div className="chips job-chips">{(j.tags||[]).slice(0,6).map(x=><span key={x}>{x}</span>)}</div><div className="job-card-bottom"><small>{saved?"Tracked: "+saved.status:"Live feed · Verify details on employer page"}</small><div className="job-actions">{saved?<span className="tracked-label"><CheckCircle2 size={13}/> Tracked</span>:<button className="job-save" onClick={()=>saveJob({...j,jobUrl:j.url})}><BookmarkCheck size={13}/> Save</button>}<a className="job-apply" href={j.url} target="_blank" rel="noopener noreferrer">Apply on source <ArrowUpRight size={13}/></a>{saved?.status==="Saved"&&<button className="mark-applied" onClick={()=>updateStatus(saved._id,"Applied")}>Mark applied</button>}</div></div></article>}):<div className="panel job-empty"><BriefcaseBusiness size={34}/><h3>{isRecommended?"No close resume matches found":"No live listings found"}</h3><p>Try a broader keyword or location, or open a provider search above.</p><button className="soft" onClick={()=>{Q("");P("");F("All");searchJobs("","")}}>Show all live jobs</button></div>}</div></>}
 <div className="job-hub-footnote"><Clock3 size={13}/> Job feeds can change or expire. Always verify role details, eligibility and application deadlines on the original employer or job-board page. Applications opened on external sites must be marked as Applied here after submission.</div>
 </>;
}
export default JobPortal;
