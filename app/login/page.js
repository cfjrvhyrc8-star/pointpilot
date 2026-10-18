"use client";

import {useEffect,useState} from "react";
import Link from "next/link";
import {clearPointPilotSession,getSupabase} from "../../lib/supabase-browser.js";
import {authStep} from "../../lib/auth-timeout.js";

function friendlyError(error){
  const message=String(error?.message||"");
  if(message.toLowerCase().includes("error sending magic link email")){
    return "Supabase could not send the sign-in email. Please try later; email delivery needs checking.";
  }
  return message||"We couldn't start the sign-in email. Please try again.";
}

export default function Login(){
  const[name,setName]=useState("");
  const[email,setEmail]=useState("");
  const[msg,setMsg]=useState("");
  const[loading,setLoading]=useState(false);
  const[activeEmail,setActiveEmail]=useState("");

  useEffect(()=>{
    let active=true;
    authStep(()=>getSupabase().auth.getUser(),"Session check").then(({data})=>{if(active)setActiveEmail(data.user?.email||"")}).catch(()=>{});
    return()=>{active=false};
  },[]);

  async function clearLocalSession(){
    await authStep(()=>clearPointPilotSession(),"Previous session cleanup");
    setActiveEmail("");
    return getSupabase();
  }

  async function socialLogin(provider){
    if(loading)return;
    setMsg("");
    setLoading(true);
    try{
    const supabase=await clearLocalSession();
    window.localStorage.removeItem("pointpilot_expected_email");
    window.localStorage.removeItem("pointpilot_expected_name");
    const {data,error}=await authStep(()=>supabase.auth.signInWithOAuth({
      provider,
      options:{skipBrowserRedirect:true,redirectTo:window.location.origin+"/auth/callback",queryParams:provider==="facebook"?{auth_type:"reauthorize"}:undefined}
    }),"Facebook sign-in");
    if(error)throw error;
    if(!data?.url)throw new Error("Facebook did not return a sign-in address. Please try again.");
    window.location.assign(data.url);
    }catch(error){setMsg(friendlyError(error))}finally{setLoading(false)}
  }

  async function submit(e){
    e.preventDefault();
    if(loading)return;
    setMsg("");
    setLoading(true);

    try{
    const cleanName=name.trim();
    const cleanEmail=email.trim().toLowerCase();
    const supabase=await clearLocalSession();
    window.localStorage.setItem("pointpilot_expected_email",cleanEmail);
    window.localStorage.setItem("pointpilot_expected_name",cleanName);
    const{error}=await authStep(()=>supabase.auth.signInWithOtp({
      email:cleanEmail,
      options:{
        emailRedirectTo:window.location.origin+"/auth/callback",
        data:{full_name:cleanName}
      }
    }),"Sign-in email request");

    if(error){
      throw error;
    }

    setMsg("Secure sign-in link sent. Check your inbox (and Spam/Junk) and click the link to open your PointPilot wallet.");
    }catch(error){setMsg(friendlyError(error))}finally{setLoading(false)}
  }

  return <main className="auth">
    <Link href="/" className="brand">Point<span>Pilot</span></Link>
    <div className="authCard">
      <div className="eyebrow">SECURE LOGIN</div>
      <h1>Open your PointPilot wallet</h1>
      <p>Use Facebook or a one-time email link. No PointPilot password to remember.</p>
      {activeEmail&&<div className="accountSwitchNotice"><span>Currently signed in as <strong>{activeEmail}</strong></span><button type="button" disabled={loading} onClick={async()=>{setLoading(true);try{await clearLocalSession()}catch(error){setMsg(friendlyError(error))}finally{setLoading(false)}}}>Use another account</button></div>}
      <form onSubmit={submit} aria-busy={loading}>
        <label className="authLabel">Name
          <input required type="text" autoComplete="name" placeholder="Your name" value={name} onChange={e=>setName(e.target.value)}/>
        </label>
        <label className="authLabel">Email
          <input required type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)}/>
        </label>
        <button className="btn primary" type="submit" disabled={loading}>
          {loading?"Sending…":"Email me a sign-in link"}
        </button>
      </form>
      <div className="authDivider"><span>or continue with</span></div>
      <div className="socialAuth">
        <button className="socialBtn" type="button" disabled={loading} onClick={()=>socialLogin("facebook")}><span aria-hidden="true">f</span> Continue with Facebook</button>
        <button className="socialBtn" type="button" disabled title="Apple sign-in is planned for a later release"><span aria-hidden="true">●</span> Apple — coming later</button>
      </div>
      {msg&&<div role={msg.startsWith("Secure")?"status":"alert"} aria-atomic="true" className={msg.startsWith("Secure")?"notice":"errorBox"}>{msg}</div>}
      <small className="authHint">Authentication is handled by Supabase. PointPilot never receives your Facebook password. Facebook uses the account currently active on facebook.com; for a different person, use their email link or switch Facebook accounts first. Apple sign-in remains intentionally deferred.</small>
    </div>
  </main>;
}
