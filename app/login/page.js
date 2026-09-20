"use client";
import {useState} from "react";
import {createClient} from "@supabase/supabase-js";
import Link from "next/link";
const getSupabase=()=>createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
export default function Login(){
 const[name,setName]=useState(""),[email,setEmail]=useState(""),[msg,setMsg]=useState(""),[loading,setLoading]=useState(false);
 async function submit(e){
  e.preventDefault(); setMsg(""); setLoading(true);
  const cleanName=name.trim(),cleanEmail=email.trim().toLowerCase();
  const{error}=await getSupabase().auth.signInWithOtp({email:cleanEmail,options:{emailRedirectTo:window.location.origin+"/dashboard",data:{full_name:cleanName}}});
  setLoading(false);
  setMsg(error?error.message:"Secure sign-in link sent. Check your email and click the link to open your PointPilot wallet.");
 }
 return <main className="auth"><Link href="/" className="brand">Point<span>Pilot</span></Link><div className="authCard"><div className="eyebrow">SECURE LOGIN</div><h1>Open your PointPilot wallet</h1><p>Enter your name and email. We’ll send a one-time secure sign-in link — no password to remember.</p><form onSubmit={submit}><label className="authLabel">Name<input required type="text" autoComplete="name" placeholder="Your name" value={name} onChange={e=>setName(e.target.value)}/></label><label className="authLabel">Email<input required type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)}/></label><button className="btn primary" type="submit" disabled={loading}>{loading?"Sending…":"Email me a sign-in link"}</button></form>{msg&&<div className="notice">{msg}</div>}<small className="authHint">The sign-in link is one-time use.</small></div></main>;
}