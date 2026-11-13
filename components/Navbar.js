"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../lib/firebase";

export default function Navbar() {
  const [user,setUser] = useState(null);
  useEffect(()=>onAuthStateChanged(auth,setUser),[]);
  return <header className="navbar">
    <Link className="brand" href="/">THUKAL<span>®</span></Link>
    <nav aria-label="Main navigation"><Link href="/home">Shop</Link>{user && <><Link href="/bookings">Bookings</Link><Link href="/notifications">Notifications</Link><Link href="/profile">Profile</Link></>}</nav>
    <div className="nav-auth">{user ? <Link href="/profile">My account</Link> : <><Link href="/login">Login</Link><Link href="/signup" className="join-link">Join</Link></>}</div>
  </header>;
}
