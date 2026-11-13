"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut, updateProfile } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "../../lib/firebase";
import { uploadProfileImage } from "../../lib/cloudinary";
import { useRouter } from "next/navigation";
import ProtectedRoute from "../../components/ProtectedRoute";
import AddressForm from "../../components/AddressForm";

function ProfileContent() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({name:"", phone:"", photoURL:""});
  const [address, setAddress] = useState(null);
  const [editingAddress, setEditingAddress] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (current) => {
      if (!current) return;
      setUser(current);
      const snap = await getDoc(doc(db, "users", current.uid));
      if (snap.exists()) {
        const data = snap.data();
        setForm({name:data.name || current.displayName || "", phone:data.phone || "", photoURL:data.photoURL || ""});
        setAddress(data.address || null);
      } else setForm({name:current.displayName || "", phone:"", photoURL:""});
    });
    return unsub;
  }, []);

  async function saveProfile(e) {
    e.preventDefault(); if (!user) return; setBusy(true); setError(""); setMessage("");
    try {
      await setDoc(doc(db,"users",user.uid), {uid:user.uid, name:form.name.trim(), phone:form.phone.trim(), photoURL:form.photoURL, email:user.email, updatedAt:serverTimestamp()}, {merge:true});
      await updateProfile(user, {displayName:form.name.trim(), photoURL:form.photoURL});
      setMessage("Your profile has been saved.");
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  async function handleImage(e) {
    const file = e.target.files?.[0]; if (!file || !user) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const url = await uploadProfileImage(file);
      setForm((old)=>({...old, photoURL:url}));
      await setDoc(doc(db,"users",user.uid), {photoURL:url, updatedAt:serverTimestamp()}, {merge:true});
      setMessage("Profile picture updated.");
    } catch(err) { setError(err.message); }
    finally { setBusy(false); e.target.value=""; }
  }

  async function logout() { await signOut(auth); router.push("/"); }

  return <div className="narrow page-space">
    <p className="eyebrow">YOUR ACCOUNT</p><h1>Your profile.</h1>
    <div className="profile-photo-row">
      <div className="avatar">{form.photoURL ? <img src={form.photoURL} alt="Profile" /> : <span>{form.name?.charAt(0)?.toUpperCase() || "T"}</span>}</div>
      <label className="upload-label">Change photo<input type="file" accept="image/*" onChange={handleImage} /></label>
    </div>
    <form className="form-card form-stack" onSubmit={saveProfile}>
      <label>Full name<input value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})} required /></label>
      <label>Email address<input value={user?.email || ""} disabled /></label>
      <label>Phone number<input type="tel" value={form.phone} onChange={(e)=>setForm({...form,phone:e.target.value})} required /></label>
      {message && <p className="success">{message}</p>}{error && <p className="error">{error}</p>}
      <button className="button" disabled={busy}>{busy ? "Saving…" : "Save profile"}</button>
    </form>
    <section className="address-section"><div className="section-title-row"><h2>Delivery address</h2><button className="plain-button" onClick={()=>setEditingAddress(!editingAddress)}>{editingAddress ? "Close" : address ? "Edit address" : "Add address"}</button></div>
      {address ? <AddressSummary address={address} /> : <p className="muted">You have not saved a delivery address yet.</p>}
      {editingAddress && <AddressForm user={user} initialAddress={address} onSaved={(value)=>{setAddress(value);setEditingAddress(false);}} />}
    </section>
    <button className="logout-button" onClick={logout}>Log out</button>
  </div>;
}

function AddressSummary({address}) {
  return <div className="address-summary"><strong>{address.fullName}</strong><p>{address.house}, {address.street}{address.landmark ? `, ${address.landmark}` : ""}</p><p>{address.city}, {address.district}, {address.state} — {address.pinCode}</p><p>{address.phone}</p></div>;
}

export default function ProfilePage() { return <ProtectedRoute><ProfileContent /></ProtectedRoute>; }
