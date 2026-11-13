"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query, updateDoc, doc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../../lib/firebase";
import ProtectedRoute from "../../components/ProtectedRoute";

function NotificationsContent() {
  const [items,setItems] = useState([]);
  const [loading,setLoading] = useState(true);
  const [uid,setUid] = useState("");
  const [error,setError] = useState("");
  useEffect(()=>{
    let stop=()=>{};
    const authStop=onAuthStateChanged(auth,(user)=>{
      if(!user)return;
      setUid(user.uid);
      const q=query(collection(db,"users",user.uid,"notifications"),orderBy("createdAt","desc"));
      stop=onSnapshot(q,(snap)=>{setItems(snap.docs.map(d=>({id:d.id,...d.data()})));setLoading(false);},()=>{setError("Unable to load notifications.");setLoading(false);});
    });
    return ()=>{authStop();stop();};
  },[]);
  async function markRead(id){try{await updateDoc(doc(db,"users",uid,"notifications",id),{read:true});}catch(e){setError("Could not update this notification.");}}
  return <div className="narrow page-space"><p className="eyebrow">STAY IN THE LOOP</p><h1>Notifications.</h1><p className="lead">A note whenever something changes with your Thukal experience.</p>
    {error && <p className="error">{error}</p>}{loading ? <p className="status">Loading notifications…</p> : items.length ? <div className="notification-list">{items.map(item=><article className={`notification ${item.read ? "" : "unread"}`} key={item.id}><div><h3>{item.title || "A note from Thukal"}</h3><p>{item.message || ""}</p><small>{item.createdAt?.toDate ? item.createdAt.toDate().toLocaleString() : "Recently"}</small></div>{!item.read && <button className="plain-button" onClick={()=>markRead(item.id)}>Mark read</button>}</article>)}</div> : <div className="empty-panel"><h2>All quiet for now.</h2><p>Your booking updates and other notifications will appear here.</p></div>}
  </div>;
}
export default function NotificationsPage(){return <ProtectedRoute><NotificationsContent /></ProtectedRoute>;}
