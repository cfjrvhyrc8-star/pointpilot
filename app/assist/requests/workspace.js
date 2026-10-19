'use client';
import {useEffect,useRef,useState} from 'react';
import {getSupabase} from '../../../lib/supabase-browser.js';
import {startLoad} from '../../../lib/load-recovery.js';
import {saveWithRecovery} from '../../../lib/save-recovery.js';
import {draftConciergeQuote} from '../../../lib/concierge-pricing.js';
import styles from '../preview.module.css';
const blank={service:'redemption',brief:'',travellers:1,flexibility:'fixed'};
const fields='id,user_id,service,brief,travellers,flexibility,status,created_at';
export default function RequestWorkspace(){
 const[user,setUser]=useState(null),[staff,setStaff]=useState(false),[rows,setRows]=useState([]),[events,setEvents]=useState([]),[quotes,setQuotes]=useState([]);
 const[attempt,reload]=useState(0),[loading,setLoading]=useState(true),[loadError,setLoadError]=useState('');
 const[form,setForm]=useState(blank),[id,setId]=useState(null),[consent,setConsent]=useState(false),[saving,setSaving]=useState(false),[saved,setSaved]=useState(false),[error,setError]=useState('');
 const[note,setNote]=useState(''),[kind,setKind]=useState('received'),[scope,setScope]=useState(''),[cash,setCash]=useState(''),[points,setPoints]=useState('[]');
 const busy=useRef(false),alive=useRef(true);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false}},[]);
 useEffect(()=>{
  const sb=getSupabase();let account=null;
  const {data:{subscription}}=sb.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_OUT'||(account&&session?.user?.id!==account))window.location.replace('/login')});
  setLoading(true);setLoadError('');setUser(null);setRows([]);setEvents([]);setQuotes([]);setStaff(false);
  const task=startLoad({request:async signal=>{
   const auth=await sb.auth.getUser();if(auth.error||!auth.data.user)throw new Error('Sign in to access saved requests.');account=auth.data.user.id;
   const membership=await sb.from('assist_staff').select('user_id').eq('user_id',account).abortSignal(signal);if(membership.error)throw membership.error;
   const isStaff=membership.data.length>0;
   const requests=await sb.from('assist_requests').select(fields).order('created_at',{ascending:false}).limit(100).abortSignal(signal);if(requests.error)throw requests.error;
   const history=await sb.from('assist_case_events').select('id,request_id,kind,message,created_at').order('created_at',{ascending:false}).limit(200).abortSignal(signal);if(history.error)throw history.error;
   const drafts=isStaff?await sb.from('assist_quote_drafts').select('id,request_id,revision,scope,calculation,created_at').order('revision',{ascending:false}).limit(200).abortSignal(signal):{data:[],error:null};if(drafts.error)throw drafts.error;
   return {user:auth.data.user,staff:isStaff,rows:requests.data,events:history.data,quotes:drafts.data};
  },onSuccess:data=>{setUser(data.user);setStaff(data.staff);setRows(data.rows);setEvents(data.events);setQuotes(data.quotes)},onError:e=>setLoadError(e.message||'Unable to load requests.'),onSettled:()=>setLoading(false)});
  return()=>{task.cancel();subscription.unsubscribe()};
 },[attempt]);
 const write=async request=>{
  if(busy.current||loading||loadError)return;busy.current=true;
  const safe=setter=>value=>{if(alive.current)setter(value)};
  await saveWithRecovery({request,setSaving:safe(setSaving),setSaved:safe(setSaved),setError:safe(setError),onSuccess:data=>{
   if(!data?.id)throw new Error('No changed record returned. Reload before retrying.');
   if(alive.current){setId(null);setForm(blank);setConsent(false);setNote('');setScope('');setCash('');setPoints('[]');reload(n=>n+1)}
  }});busy.current=false;
 };
 const saveDraft=()=>{
  const requestId=id||crypto.randomUUID();setId(requestId);
  return write(signal=>{
   const table=getSupabase().from('assist_requests');
   return (id?table.update(form).eq('id',requestId).eq('status','draft'):table.insert({...form,id:requestId,user_id:user.id})).select('id').single().abortSignal(signal);
  });
 };
 const submit=row=>write(signal=>getSupabase().from('assist_requests').update({status:'submitted',consent_version:'assist-scoping-v1'}).eq('id',row.id).eq('status','draft').select('id').single().abortSignal(signal));
 const selected=rows.find(row=>row.id===id);
 const addQuote=()=>{
  try{
   if(cash.trim()==='')throw new Error('Enter the cash spend, including an explicit 0 when confirmed.');
   const calculation=draftConciergeQuote({cashSpent:Number(cash),redemptions:JSON.parse(points)});
   const revision=Math.max(0,...quotes.filter(q=>q.request_id===id).map(q=>q.revision))+1;
   return write(signal=>getSupabase().from('assist_quote_drafts').insert({request_id:id,author_id:user.id,revision,scope,calculation}).select('id').single().abortSignal(signal));
  }catch(e){setError(e.message)}
 };
 if(loading)return <main className={styles.page}><p role="status">Loading private workspace…</p></main>;
 if(loadError)return <main className={styles.page}><p role="alert">{loadError}</p><button onClick={()=>reload(n=>n+1)}>Retry</button> <a href="/login">Sign in</a></main>;
 return <main className={styles.page}><a href="/assist">← Assist</a><h1>{staff?'Assist scoping workspace':'Your Assist requests'}</h1><p>Scoping only. No paid research, booking or payment starts here. Checkout is disabled.</p>{error&&<p role="alert">{error}</p>}{saved&&<p role="status">Change saved.</p>}
 <div className={styles.grid}><section><h2>{staff?'Submitted queue':'Private draft'}</h2>{!staff&&<>
 <label>Service<select value={form.service} onChange={e=>setForm({...form,service:e.target.value})}><option value="redemption">Rewards redemption review</option><option value="benefits">Card benefits assistance</option><option value="health">Rewards health check</option></select></label>
 <label>Request brief<textarea value={form.brief} minLength={10} maxLength={1500} onChange={e=>setForm({...form,brief:e.target.value})}/></label><p>Do not include card numbers, passwords, OTPs or identity documents. Wallet data is not automatically attached.</p>
 <label>Travellers<input type="number" min="1" max="20" value={form.travellers} onChange={e=>setForm({...form,travellers:Number(e.target.value)})}/></label>
 <label>Flexibility<select value={form.flexibility} onChange={e=>setForm({...form,flexibility:e.target.value})}><option value="fixed">Fixed dates</option><option value="flexible">Flexible</option><option value="unsure">Not sure yet</option></select></label>
 <button disabled={saving||(selected&&selected.status!=='draft')||form.brief.trim().length<10||!Number.isInteger(form.travellers)||form.travellers<1||form.travellers>20} onClick={saveDraft}>Save private draft</button> <button disabled={saving} onClick={()=>{setId(null);setForm(blank);setConsent(false);setSaved(false)}}>New draft</button>
 </>}
 {rows.filter(row=>!staff||row.status==='submitted').map(row=><article className={styles.notice} key={row.id}><h3>{row.service} · {row.status}</h3><p>{row.brief}</p><p>{row.travellers} traveller(s) · {row.flexibility}</p><button disabled={saving} onClick={()=>{setId(row.id);setConsent(false);setError('');if(row.status==='draft')setForm({service:row.service,brief:row.brief,travellers:row.travellers,flexibility:row.flexibility})}}>{row.status==='draft'?'Edit / review':'View history'}</button></article>)}{!rows.length&&<p>No saved requests yet.</p>}<p>Showing up to 100 recent requests.</p></section>
 <aside><h2>Request details</h2>{selected?<><p>{selected.brief}</p>{selected.status==='draft'&&!staff&&<><label><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/>I agree to share this saved brief, service choice, traveller count and flexibility with PointPilot’s authorised fulfilment staff for scoping. No external partner sharing or payment is authorised.</label><p>Submission uses the saved version shown above. Save edits first. Submitted briefs cannot be edited.</p><button disabled={!consent||saving} onClick={()=>submit(selected)}>Submit saved request for scoping</button></>}
 {events.filter(event=>event.request_id===id).map(event=><div className={styles.notice} key={event.id}><b>{event.kind}</b><p>{event.message}</p></div>)}
 {staff&&selected.status==='submitted'&&<><h3>Scoping update</h3><label>Status<select value={kind} onChange={e=>setKind(e.target.value)}><option value="received">Received</option><option value="needs_information">Needs information</option><option value="scope_reviewed">Scope reviewed</option></select></label><label>Message visible to the requester<textarea value={note} maxLength={1500} onChange={e=>setNote(e.target.value)}/></label><button disabled={saving||!note.trim()} onClick={()=>write(signal=>getSupabase().from('assist_case_events').insert({request_id:id,actor_id:user.id,kind,message:note}).select('id').single().abortSignal(signal))}>Save scoping update</button>
 <h3>Internal quote revision</h3><p>Draft only—not visible to the customer and not payable. Rates require independent review.</p><label>Scope<textarea maxLength={3000} value={scope} onChange={e=>setScope(e.target.value)}/></label><label>Cash spend (INR)<input type="number" min="0" value={cash} onChange={e=>setCash(e.target.value)}/></label><label>Versioned final-redemption lines (JSON)<textarea value={points} maxLength={10000} onChange={e=>setPoints(e.target.value)}/></label><p>Use [] for cash-only. Each line requires fundingChainId, kind: final-redemption, programme, points, rate and rateVersion. Do not count transferred source points again.</p><button disabled={saving||scope.trim().length<10} onClick={addQuote}>Save new draft revision</button>{quotes.filter(q=>q.request_id===id).map(q=><div className={styles.notice} key={q.id}><b>Revision {q.revision}</b><p>{q.scope}</p><p>Draft service fee: ₹{q.calculation.serviceFee} · taxes unresolved · checkout disabled</p></div>)}</>}
 </>:<p>Select a saved request to review its history.</p>}<hr/><button disabled>Checkout unavailable</button></aside></div></main>;
}
