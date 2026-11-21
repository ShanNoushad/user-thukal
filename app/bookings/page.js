"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../../lib/firebase";
import ProtectedRoute from "../../components/ProtectedRoute";
import Link from "next/link";
import "../../styles/bookings.css";

function formatDate(ts) {
  if (!ts?.seconds) return "—";
  return new Date(ts.seconds * 1000).toLocaleString("en-IN", {
    day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit",
  });
}

function Detail({ label, value }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div className="bd-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function BookingDetails({ booking, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const a = booking.address && typeof booking.address === "object" ? booking.address : null;
  const addressLine = a
    ? [a.house, a.street, a.landmark].filter(Boolean).join(", ")
    : booking.address || "";
  const addressLine2 = a
    ? `${[a.city, a.district, a.state].filter(Boolean).join(", ")}${a.pinCode ? " — " + a.pinCode : ""}`
    : "";
  const qty = booking.quantity || 1;
  const total = booking.total ?? (booking.price ? booking.price * qty : null);

  return (
    <div className="bd-backdrop" onClick={onClose}>
      <div className="bd-sheet" role="dialog" aria-modal="true" aria-label="Booking details" onClick={(e) => e.stopPropagation()}>
        <div className="bd-handle" aria-hidden="true" />
        <button type="button" className="bd-close" onClick={onClose} aria-label="Close">✕</button>

        <div className="bd-top">
          <div className="bd-img">
            {booking.productImage ? <img src={booking.productImage} alt="" /> : <span>THUKAL</span>}
          </div>
          <div>
            <span className="status-pill">{booking.status || "Pending"}</span>
            <h2>{booking.productName}</h2>
            <small>Booking ID: {booking.id}</small>
          </div>
        </div>

        <section className="bd-card">
          <h4>Order</h4>
          <div className="bd-grid">
            <Detail label="Size" value={booking.selectedSize} />
            <Detail label="Quantity" value={qty} />
            <Detail label="Price" value={booking.price ? `₹${booking.price}` : ""} />
            <Detail label="Total" value={total ? `₹${total}` : ""} />
            <Detail label="Payment" value={booking.paymentMethod || "Cash on Delivery"} />
            <Detail label="Booked on" value={formatDate(booking.createdAt)} />
          </div>
        </section>

        <section className="bd-card">
          <h4>Delivery</h4>
          <div className="bd-grid">
            <Detail label="Name" value={a?.fullName || booking.name || booking.customerName} />
            <Detail label="Phone" value={a?.phone || booking.phone} />
            <Detail label="Email" value={booking.email} />
          </div>
          {(addressLine || addressLine2) && (
            <div className="bd-address">
              <span>Address</span>
              <p>{addressLine}</p>
              {addressLine2 && <p>{addressLine2}</p>}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function BookingContent() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    let stop = () => {};
    const authStop = onAuthStateChanged(auth, (user) => {
      if (!user) return;
      const q = query(collection(db, "bookings"), where("userId", "==", user.uid));
      stop = onSnapshot(
        q,
        (snap) => {
          setBookings(
            snap.docs
              .map((d) => ({ id: d.id, ...d.data() }))
              .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
          );
          setLoading(false);
        },
        () => setLoading(false)
      );
    });
    return () => { authStop(); stop(); };
  }, []);

  return (
    <div className="section-wrap page-space">
      <p className="eyebrow">YOUR THUKAL JOURNEY</p>
      <h1>Bookings.</h1>
      <p className="lead">All your booking requests, gathered in one place.</p>

      {loading ? (
        <p className="status">Loading bookings…</p>
      ) : bookings.length ? (
        <div className="booking-list">
          {bookings.map((b) => (
            <article
              className="booking-row booking-clickable"
              key={b.id}
              role="button"
              tabIndex={0}
              onClick={() => setSelected(b)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setSelected(b)}
            >
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

      {selected && <BookingDetails booking={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

export default function BookingsPage() {
  return (
    <ProtectedRoute>
      <BookingContent />
    </ProtectedRoute>
  );
}