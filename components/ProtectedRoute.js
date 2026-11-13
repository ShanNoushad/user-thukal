"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth } from "../lib/firebase";

export default function ProtectedRoute({children}) {
  const router=useRouter();
  const [checking,setChecking]=useState(true);
  useEffect(()=>{
    const unsubscribe=onAuthStateChanged(auth,(user)=>{if(!user)router.replace("/login");else setChecking(false);});
    return unsubscribe;
  },[router]);
  if(checking)return <div className="narrow page-space"><p className="status">Checking your account…</p></div>;
  return children;
}
