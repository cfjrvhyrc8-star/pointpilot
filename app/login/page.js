"use client";

import {useState} from "react";
import {createClient} from "@supabase/supabase-js";
import Link from "next/link";

const getSupabase=()=>createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
);

function friendlyError(error){
  const message=String(error?.message||"");
  if(message.toLowerCase().includes("error sending magic link email")||message.toLowerCase().includes("email")){
    return "PointPilot reached Supabase Auth, but Supabase could not deliver the sign-in email. This is an email-provider/SMTP configuration issue, not a wallet or login-page issue.";
  }
  return message||"We couldn't start the sign-in email. Please try again.";
}

export default function Login(){
  const[name,setName]=useState("");
  const[email,setEmail]=useState("");
  const[msg,setMsg]=useState("");
  const[loading,setLoading]=useState(false);

  async function socialLogin(provider){
    setMsg("");
    setLoading(true);
    const {error}=await getSupabase().auth.signInWithOAuth({
      provider,
      options:{redirectTo:window.location.origin+"/dashboard"}
    });
    if(error){
      setLoading(false);
      setMsg(`${provider==="apple"?"Apple":"Facebook"} sign-in is not available yet. Please use email, or finish enabling this provider in Supabase.`);
    }
  }

  async function submit(e){
    e.preventDefault();
    setMsg("");
    setLoading(true);

    const cleanName=name.trim();
    const cleanEmail=email.trim().toLowerCase();
    window.localStorage.setItem("pointpilot_holder_name",cleanName);

    const supabase=getSupabase();
    const{error}=await supabase.auth.signInWithOtp({
      email:cleanEmail,
      options:{
        emailRedirectTo:window.location.origin+"/dashboard",
        data:{full_name:cleanName}
      }
    });

    setLoading(false);

    if(error){
      setMsg(friendlyError(error));
      return;
    }

    setMsg("Secure sign-in link sent. Check your inbox (and Spam/Junk) and click the link to open your PointPilot wallet.");
  }

  return <main className="auth">
    <Link href="/" className="brand">Point<span>Pilot</span></Link>
    <div className="authCard">
      <div className="eyebrow">SECURE LOGIN</div>
      <h1>Open your PointPilot wallet</h1>
      <p>Use Facebook or a one-time email link. No PointPilot password to remember.</p>
      <form onSubmit={submit}>
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
      {msg&&<div className={msg.startsWith("Secure")?"notice":"errorBox"}>{msg}</div>}
      <small className="authHint">Authentication is handled by Supabase. PointPilot never receives your Facebook password. Apple sign-in remains intentionally deferred.</small>
    </div>
  </main>;
}
