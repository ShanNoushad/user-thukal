"use client";

import { useState } from "react";
import Link from "next/link";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../lib/firebase";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault(); setBusy(true); setError("");
    try { await signInWithEmailAndPassword(auth, email.trim(), password); router.push("/profile"); }
    catch (err) { setError(err.message || "Unable to sign in."); }
    finally { setBusy(false); }
  }

  return <div className="narrow page-space"><p className="eyebrow">WELCOME BACK</p><h1>Sign in.</h1><p className="lead">Good to have you here again.</p>
    <form className="form-card form-stack" onSubmit={handleSubmit}>
      <label>Email address<input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} required autoComplete="email" /></label>
      <label>Password<input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} required autoComplete="current-password" /></label>
      {error && <p className="error">{error}</p>}
      <button className="button" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
      <p className="form-note">New to Thukal? <Link href="/signup">Create an account</Link></p>
    </form>
  </div>;
}
