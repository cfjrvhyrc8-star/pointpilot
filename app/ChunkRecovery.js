"use client";

import {useEffect} from "react";

export default function ChunkRecovery(){
  useEffect(()=>{
    const key="pointpilot-chunk-recovery";
    const recover=event=>{
      const reason=event?.reason?.message||event?.message||String(event?.reason||"");
      if(!/ChunkLoadError|Loading chunk .* failed|Failed to fetch dynamically imported module/i.test(reason))return;
      const last=Number(sessionStorage.getItem(key)||0);
      if(Date.now()-last<30000)return;
      sessionStorage.setItem(key,String(Date.now()));
      window.location.reload();
    };
    window.addEventListener("error",recover,true);
    window.addEventListener("unhandledrejection",recover);
    return()=>{window.removeEventListener("error",recover,true);window.removeEventListener("unhandledrejection",recover)};
  },[]);
  return null;
}