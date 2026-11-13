"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../../lib/firebase";
import ProtectedRoute from "../../components/ProtectedRoute";
import Link from "next/link";

function BookingContent() {
  const [bookings,setBookings] = useState([]);
  const [loading,setLoading] = useState(true);
  useEffect(() => {
    let stop = () => {};
    const authStop = onAuthStateChanged(auth, (user) => {
      if (!user) return;
      const q = query(collection(db,"bookings"),where("userId","==",user.uid));
      stop = onSnapshot(q,(snap)=>{setBookings(snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0)));setLoading(false);},()=>setLoading(false));
    });
    return ()=>{authStop();stop();};
  },[]);
  return <div className="section-wrap page-space"><p className="eyebrow">YOUR THUKAL JOURNEY</p><h1>Bookings.</h1><p className="lead">All your booking requests, gathered in one place.</p>
    {loading ? <p className="status">Loading bookings…</p> : bookings.length ? <div className="booking-list">{bookings.map(b=><article className="booking-row" key={b.id}><div className="booking-thumb">{b.productImage ? <img src={b.productImage} alt="" /> : "THUKAL"}</div><div className="booking-info"><h3>{b.productName}</h3><p>Size: {b.selectedSize || "—"} · Qty: {b.quantity || 1}</p><small>Booking ID: {b.id}</small></div><span className="status-pill">{b.status || "Pending"}</span></article>)}</div> : <div className="empty-panel"><h2>No bookings yet.</h2><p>When you request a piece from our collection, it will show up here.</p><Link className="text-link" href="/home">Explore products →</Link></div>}
  </div>;
}
export default function BookingsPage(){return <ProtectedRoute><BookingContent /></ProtectedRoute>;}
