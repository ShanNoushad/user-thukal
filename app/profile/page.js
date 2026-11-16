"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged, signOut, updateProfile } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "../../lib/firebase";
import { uploadProfileImage } from "../../lib/cloudinary";
import { useRouter } from "next/navigation";
import ProtectedRoute from "../../components/ProtectedRoute";
import AddressForm from "../../components/AddressForm";
import "../../styles/profile.css";

function ProfileContent() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({ name: "", phone: "", photoURL: "" });
  const [address, setAddress] = useState(null);
  const [editingAddress, setEditingAddress] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (current) => {
      if (!current) return;
      setUser(current);
      const snap = await getDoc(doc(db, "users", current.uid));
      if (snap.exists()) {
        const data = snap.data();
        setForm({
          name: data.name || current.displayName || "",
          phone: data.phone || "",
          photoURL: data.photoURL || "",
        });
        setAddress(data.address || null);
      } else setForm({ name: current.displayName || "", phone: "", photoURL: "" });
    });
    return unsub;
  }, []);

  async function saveProfile(e) {
    e.preventDefault();
    if (!user) return;
    setBusy(true); setError(""); setMessage("");
    try {
      await setDoc(
        doc(db, "users", user.uid),
        {
          uid: user.uid,
          name: form.name.trim(),
          phone: form.phone.trim(),
          photoURL: form.photoURL,
          email: user.email,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      await updateProfile(user, { displayName: form.name.trim(), photoURL: form.photoURL });
      setMessage("Your profile has been saved.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleImage(e) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setBusy(true); setUploading(true); setError(""); setMessage("");
    try {
      const url = await uploadProfileImage(file);
      setForm((old) => ({ ...old, photoURL: url }));
      await setDoc(doc(db, "users", user.uid), { photoURL: url, updatedAt: serverTimestamp() }, { merge: true });
      setMessage("Profile picture updated.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
      setUploading(false);
      e.target.value = "";
    }
  }

  async function logout() {
    await signOut(auth);
    router.push("/");
  }

  const initial = form.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || "T";

  return (
    <div className="pf page-space">
      <div className="pf-wrap">
        {/* Header */}
        <header className="pf-hero">
          <div className="pf-avatar-wrap">
            <div className={`pf-avatar ${uploading ? "is-loading" : ""}`}>
              {form.photoURL ? <img src={form.photoURL} alt="Profile" /> : <span>{initial}</span>}
            </div>
            <label className="pf-camera" title="Change photo">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
                <circle cx="12" cy="13" r="3.5" />
              </svg>
              <span className="pf-sr">Change photo</span>
              <input type="file" accept="image/*" onChange={handleImage} disabled={busy} />
            </label>
          </div>

          <div className="pf-id">
            <p className="eyebrow">YOUR ACCOUNT</p>
            <h1>{form.name || "Your profile"}<em>.</em></h1>
            <p className="pf-email">{user?.email}</p>
          </div>

          <button type="button" className="pf-logout" onClick={logout}>Log out</button>
        </header>

        {/* Shortcuts */}
        <nav className="pf-shortcuts" aria-label="Account shortcuts">
          <Link href="/bookings"><span>Your bookings</span><i>→</i></Link>
          <Link href="/notifications"><span>Notifications</span><i>→</i></Link>
          <Link href="/home"><span>Continue shopping</span><i>→</i></Link>
        </nav>

        {(message || error) && (
          <p className={`pf-alert ${error ? "pf-alert-error" : "pf-alert-success"}`} role="status">
            {error || message}
          </p>
        )}

        <div className="pf-grid">
          {/* Personal details */}
          <section className="pf-card">
            <div className="pf-card-head">
              <div>
                <p className="eyebrow">PERSONAL</p>
                <h2>Your details</h2>
              </div>
            </div>
            <form className="pf-form" onSubmit={saveProfile}>
              <label>
                <span>Full name</span>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </label>
              <label>
                <span>Email address</span>
                <input value={user?.email || ""} disabled />
              </label>
              <label>
                <span>Phone number</span>
                <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
              </label>
              <button className="button pf-save" disabled={busy}>
                {busy ? "Saving…" : "Save profile"}
              </button>
            </form>
          </section>

          {/* Address */}
          <section className="pf-card">
            <div className="pf-card-head">
              <div>
                <p className="eyebrow">DELIVERY</p>
                <h2>Delivery address</h2>
              </div>
              <button type="button" className="pf-link-btn" onClick={() => setEditingAddress(!editingAddress)}>
                {editingAddress ? "Close" : address ? "Edit" : "+ Add"}
              </button>
            </div>

            {address ? (
              <AddressSummary address={address} />
            ) : (
              <div className="pf-empty">
                <span aria-hidden="true">⌂</span>
                <p>You have not saved a delivery address yet.</p>
              </div>
            )}

            {editingAddress && (
              <div className="pf-address-form">
                <AddressForm
                  user={user}
                  initialAddress={address}
                  onSaved={(value) => {
                    setAddress(value);
                    setEditingAddress(false);
                  }}
                />
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function AddressSummary({ address }) {
  return (
    <div className="pf-address">
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" />
        <circle cx="12" cy="10" r="2.5" />
      </svg>
      <div>
        <strong>{address.fullName}</strong>
        <p>{address.house}, {address.street}{address.landmark ? `, ${address.landmark}` : ""}</p>
        <p>{address.city}, {address.district}, {address.state} — {address.pinCode}</p>
        <p className="pf-address-phone">{address.phone}</p>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfileContent />
    </ProtectedRoute>
  );
}