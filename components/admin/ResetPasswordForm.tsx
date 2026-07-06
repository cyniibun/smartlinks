"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

export function ResetPasswordForm({url,publishableKey}:{url:string;publishableKey:string}){
  const supabase=useMemo(()=>url&&publishableKey?createClient(url,publishableKey,{auth:{detectSessionInUrl:true,persistSession:true}}):null,[url,publishableKey]);
  const[ready,setReady]=useState(false);const[error,setError]=useState("");const[done,setDone]=useState(false);const[password,setPassword]=useState("");const[confirm,setConfirm]=useState("");
  useEffect(()=>{if(!supabase){setError("Supabase Auth is not configured.");setReady(true);return}let active=true;void supabase.auth.getSession().then(({data,error:sessionError})=>{if(!active)return;if(sessionError||!data.session)setError("This recovery link is invalid or expired. Request a new one.");setReady(true)});return()=>{active=false}},[supabase]);
  const submit=async(event:React.FormEvent)=>{event.preventDefault();setError("");if(password.length<8)return setError("Password must contain at least 8 characters.");if(password!==confirm)return setError("Passwords do not match.");if(!supabase)return setError("Supabase Auth is not configured.");const{error:updateError}=await supabase.auth.updateUser({password});if(updateError)return setError(updateError.message);await supabase.auth.signOut();setDone(true)};
  return <main className="admin-login"><form className="admin-login-card" onSubmit={event=>void submit(event)}><span className="admin-kicker">tone-link</span><h1>Choose a new password</h1>{!ready?<p>Validating recovery link…</p>:done?<><div className="admin-alert">Password updated successfully. You can now sign in.</div><Link className="admin-primary" href="/login">Sign in</Link></>:<>{error&&<p className="form-error">{error}</p>}<label>New password<input type="password" value={password} onChange={event=>setPassword(event.target.value)} minLength={8} autoComplete="new-password" required/></label><label>Confirm password<input type="password" value={confirm} onChange={event=>setConfirm(event.target.value)} minLength={8} autoComplete="new-password" required/></label><button className="admin-primary" disabled={!ready}>Update password</button><p><Link href="/forgot-password">Request another recovery link</Link></p></>}</form></main>;
}
