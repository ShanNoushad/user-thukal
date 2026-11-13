"use client";

import { useState } from "react";
import Link from "next/link";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "../../lib/firebase";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name:"", email:"", phone:"", password:"", confirm:"" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const change = (e) => setForm({...form, [e.target.name]:e.target.value});

  async function handleSubmit(e) {
    e.preventDefault(); setError("");
    if (form.password.length < 6) return setError("Password must contain at least 6 characters.");
    if (form.password !== form.confirm) return setError("The passwords do not match.");
    setBusy(true);
    try {
      const credential = await createUserWithEmailAndPassword(auth, form.email.trim(), form.password);
      await updateProfile(credential.user, { displayName: form.name.trim() });
      await setDoc(doc(db, "users", credential.user.uid), {
        uid: credential.user.uid, name: form.name.trim(), email: form.email.trim(),
        phone: form.phone.trim(), photoURL: "", address: null,
        createdAt: serverTimestamp(), updatedAt: serverTimestamp()
      });
      router.push("/profile");
    } catch (err) { setError(err.message || "Could not create your account."); }
    finally { setBusy(false); }
  }

  return <div className="narrow page-space"><p className="eyebrow">A PLACE FOR YOU</p><h1>Create account.</h1><p className="lead">Join the Thukal community.</p>
    <form className="form-card form-stack" onSubmit={handleSubmit}>
      <label>Full name<input name="name" value={form.name} onChange={change} required /></label>
      <label>Email address<input name="email" type="email" value={form.email} onChange={change} required /></label>
      <label>Phone number<input name="phone" type="tel" value={form.phone} onChange={change} required /></label>
      <label>Password<input name="password" type="password" value={form.password} onChange={change} required minLength={6} /></label>
      <label>Confirm password<input name="confirm" type="password" value={form.confirm} onChange={change} required /></label>
      {error && <p className="error">{error}</p>}
      <button className="button" disabled={busy}>{busy ? "Creating account…" : "Create account"}</button>
      <p className="form-note">Already a member? <Link href="/login">Sign in</Link></p>
    </form>
  </div>;
}
