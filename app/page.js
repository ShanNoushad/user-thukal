"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { collection, limit, onSnapshot, query, where } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../lib/firebase";
import ProductCard from "../components/ProductCard";
import "../styles/landing.css";

const STEPS = [
  { n: "1", title: "Choose a piece", text: "Pick your size and quantity." },
  { n: "2", title: "Request a booking", text: "A few taps. No payment yet." },
  { n: "3", title: "We get in touch", text: "Track it from your bookings." },
];

function prettyName(user) {
  const raw = user?.displayName?.split(" ")[0] || user?.email?.split("@")[0] || "";
  return raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : "";
}

export default function LandingPage() {
  const [user, setUser] = useState(undefined); // undefined = still checking
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);

  useEffect(() => onAuthStateChanged(auth, (u) => setUser(u || null)), []);

  useEffect(() => {
    if (!user) {
      setProducts([]);
      setBookings([]);
      return;
    }
    setProductsLoading(true);
    setBookingsLoading(true);

    const stopProducts = onSnapshot(
      query(collection(db, "products"), limit(8)),
      (snap) => {
        setProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setProductsLoading(false);
      },
      () => setProductsLoading(false)
    );

    const stopBookings = onSnapshot(
      query(collection(db, "bookings"), where("userId", "==", user.uid)),
      (snap) => {
        setBookings(
          snap.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
        );
        setBookingsLoading(false);
      },
      () => setBookingsLoading(false)
    );

    return () => {
      stopProducts();
      stopBookings();
    };
  }, [user]);

  const checking = user === undefined;
  const loggedIn = !!user;

  if (checking) {
    return <div className="lp"><p className="status lp-checking">Loading…</p></div>;
  }

  /* ───────────── LOGGED IN ───────────── */
  if (loggedIn) {
    const name = prettyName(user);
    return (
      <div className="lp">
        {/* Top welcome bar */}
        <div className="lp-bar">
          <div className="lp-bar-inner section-wrap">
            <div className="lp-bar-text">
              <p className="eyebrow">WELCOME BACK</p>
              <h1>Hello{name ? `, ${name}` : ""}.</h1>
            </div>
            <div className="lp-bar-links">
              <Link href="/home" className="lp-chip">All products</Link>
              <Link href="/bookings" className="lp-chip">
                Bookings{bookings.length > 0 && <b>{bookings.length}</b>}
              </Link>
              <Link href="/notifications" className="lp-chip">Notifications</Link>
            </div>
          </div>
        </div>

        {/* Products */}
        <section className="section-wrap lp-block">
          <div className="lp-head">
            <div>
              <p className="eyebrow">THOUGHTFULLY SELECTED</p>
              <h2>Shop the collection</h2>
            </div>
            <Link href="/home" className="text-link">View all →</Link>
          </div>
          {productsLoading ? (
            <p className="status">Loading the collection…</p>
          ) : products.length ? (
            <div className="product-grid">
              {products.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          ) : (
            <div className="empty-panel">
              <h2>The collection is taking shape.</h2>
              <p>New pieces will appear here soon.</p>
            </div>
          )}
        </section>

        {/* Bookings */}
        <section className="section-wrap lp-block lp-bookings">
          <div className="lp-head">
            <div>
              <p className="eyebrow">YOUR THUKAL JOURNEY</p>
              <h2>Your bookings</h2>
            </div>
            {bookings.length > 0 && <Link href="/bookings" className="text-link">See all →</Link>}
          </div>
          {bookingsLoading ? (
            <p className="status">Loading bookings…</p>
          ) : bookings.length ? (
            <div className="booking-list">
              {bookings.slice(0, 3).map((b) => (
                <article className="booking-row" key={b.id}>
                  <div className="booking-thumb">
                    {b.productImage ? <img src={b.productImage} alt="" /> : "THUKAL"}
                  </div>
                  <div className="booking-info">
                    <h3>{b.productName}</h3>
                    <p>Size: {b.selectedSize || "—"} · Qty: {b.quantity || 1}</p>
                    <small>Booking ID: {b.id}</small>
                  </div>
                  <span className="status-pill">{b.status || "Pending"}</span>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-panel">
              <h2>No bookings yet.</h2>
              <p>When you request a piece from our collection, it will show up here.</p>
              <Link className="text-link" href="/home">Explore products →</Link>
            </div>
          )}
        </section>
      </div>
    );
  }

  /* ───────────── LOGGED OUT ───────────── */
  return (
    <div className="lp">
      <section className="lp-hero">
        <p className="eyebrow">ROOTED IN KERALA · MADE TO BE WORN</p>
        <h1>
          Clothing with a sense of <em>belonging.</em>
        </h1>
        <p className="lead">
          A considered collection inspired by the textures, stories and everyday beauty of Kerala.
        </p>
        <div className="lp-actions">
          <Link className="button" href="/login">Login</Link>
          <Link className="lp-ghost" href="/signup">Become a member</Link>
        </div>
        <p className="lp-note">Log in to browse the collection and book pieces.</p>
      </section>

      <section className="section-wrap lp-block lp-how">
        <div className="lp-head lp-head-center">
          <div>
            <p className="eyebrow">SIMPLE BY DESIGN</p>
            <h2>How booking works</h2>
          </div>
        </div>
        <ol className="lp-steps">
          {STEPS.map((s) => (
            <li key={s.n}>
              <span className="lp-step-n">{s.n}</span>
              <div>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}