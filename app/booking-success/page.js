
"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const bookingId = searchParams.get("id");

  return (
    <main className="section-wrap page-space success-page">
      <div className="success-mark">✓</div>

      <p className="eyebrow">THANK YOU FOR CHOOSING THUKAL</p>

      <h1>Your order has been received.</h1>

      <p className="lead">
        Your booking request has been submitted successfully.
        We will process your order and update its status.
      </p>

      <div className="success-order">
        <span>YOUR BOOKING REFERENCE</span>
        <strong>{bookingId || "Unavailable"}</strong>
      </div>

      <p>Payment method: Cash on Delivery</p>

      <button
        className="button"
        onClick={() => router.push("/bookings")}
      >
        View my bookings
      </button>

      <br />

      <button
        className="text-link"
        onClick={() => router.push("/home")}
      >
        Continue exploring
      </button>
    </main>
  );
}

export default function BookingSuccessPage() {
  return (
    <Suspense fallback={<p className="status">Loading...</p>}>
      <SuccessContent />
    </Suspense>
  );
}
