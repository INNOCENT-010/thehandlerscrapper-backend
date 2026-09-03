'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'

type Lead={id:string;school_name:string;city:string|null;state:string|null;lead_score:number;priority:string;status:string}
type StateCount={id:string;name:string;count:number}
type Data={stats:{schools:number;highPriority:number;contacted:number;upcomingVisits:number};leads:Lead[];stateCounts:StateCount[]}

export default function Dashboard(){
 const [data,setData]=useState<Data|null>(null); const [error,setError]=useState('')
 useEffect(()=>{fetch('/api/dashboard',{cache:'no-store'}).then(r=>r.json()).then(d=>d.error?setError(d.error):setData(d)).catch(e=>setError(String(e)))},[])
 if(error)return <div className="dashboard-page"><h1>Dashboard</h1><div className="card error">{error}</div></div>
 if(!data)return <div className="dashboard-page"><div className="loading">Loading dashboard…</div></div>
 return <div className="dashboard-page">
   <header className="dash-header"><div><p className="eyebrow">FIELD SALES COMMAND CENTER</p><h1>School pipeline</h1><p className="muted">Discover, qualify and turn the best schools into physical visits.</p></div><Link className="button compact" href="/dashboard/discover">+ Discover schools</Link></header>
   <section className="stat-grid">
    <Stat label="Schools" value={data.stats.schools} />
    <Stat label="High priority" value={data.stats.highPriority} accent />
    <Stat label="Contacted" value={data.stats.contacted} />
    <Stat label="Upcoming visits" value={data.stats.upcomingVisits} />
   </section>
   <section className="dash-grid">
    <div className="card"><div className="section-head"><div><p className="eyebrow">RANKED PROSPECTS</p><h2>Priority leads</h2></div><Link href="/leads">View all →</Link></div>
      <div className="lead-list">{data.leads.length===0?<p className="muted">No leads yet. Start your first discovery run.</p>:data.leads.map(l=><Link className="dash-lead" href={`/dashboard/leads/${l.id}`} key={l.id}><div><b>{l.school_name}</b><span>{[l.city,l.state].filter(Boolean).join(', ')||'Location pending'}</span></div><div className="mini-score">{l.lead_score}</div><span className="status-text">{l.status}</span><span>→</span></Link>)}</div>
    </div>
    <div className="card"><div className="section-head"><div><p className="eyebrow">TERRITORY</p><h2>Top states</h2></div><Link href="/dashboard/discover">Discover →</Link></div>
      <div className="territory-list">{data.stateCounts.length===0?<p className="muted">No school distribution yet.</p>:data.stateCounts.map((s,i)=><div className="territory" key={s.id}><span>{i+1}</span><b>{s.name}</b><div className="bar"><i style={{width:`${Math.max(8,(s.count/(data.stateCounts[0]?.count||1))*100)}%`}}/></div><strong>{s.count}</strong></div>)}</div>
    </div>
   </section>
   <section className="quick-grid"><Quick title="Build your territory" text="Choose a state, LGA and area, then launch discovery." href="/dashboard/discover" action="Start discovery"/><Quick title="Work your leads" text="Review contacts, signals, score and sales status." href="/leads" action="Open leads"/><Quick title="Plan visits" text="Keep physical school visits and outcomes in one place." href="/dashboard/visits" action="Open visits"/></section>
 </div>
}
function Stat({label,value,accent}:{label:string;value:number;accent?:boolean}){return <div className={`stat-card ${accent?'accent':''}`}><span>{label}</span><strong>{value.toLocaleString()}</strong></div>}
function Quick({title,text,href,action}:{title:string;text:string;href:string;action:string}){return <div className="card quick"><p className="eyebrow">NEXT</p><h3>{title}</h3><p className="muted">{text}</p><Link href={href}>{action} →</Link></div>}
