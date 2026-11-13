"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

import { onAuthStateChanged } from "firebase/auth";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";

import { auth, db } from "@/lib/firebase";

import "./product-detail.css";

function priceOf(variant) {
  return Number(variant?.finalPrice ?? variant?.sellingPrice ?? 0);
}

function formatPrice(value) {
  return Number(value || 0).toFixed(2);
}

/* ---------- decorative illustrations (all aria-hidden) ---------- */

function Sparkle({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 0C13 7 17 11 24 12 17 13 13 17 12 24 11 17 7 13 0 12 7 11 11 7 12 0Z"
        fill="currentColor"
      />
    </svg>
  );
}

function Leaf({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M2 22C2 10 10 2 22 2 22 14 14 22 2 22Z" fill="currentColor" />
      <path
        d="M3 21 15 9"
        stroke="#fff"
        strokeOpacity=".55"
        strokeWidth="1.2"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

function Squiggle({ className }) {
  return (
    <svg className={className} viewBox="0 0 84 12" aria-hidden="true">
      <path
        d="M2 6Q12-2 22 6T42 6 62 6 82 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Hanger({ className }) {
  return (
    <svg className={className} viewBox="0 0 64 64" aria-hidden="true">
      <path
        d="M32 14a5 5 0 1 1 5 5c-3 0-5 2-5 5v3M32 27 6 46a3 3 0 0 0 2 5.5h48a3 3 0 0 0 2-5.5L32 27Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ProductDetailContent() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialIndex = Math.max(
    0,
    Number(searchParams.get("variantIndex") || 0)
  );

  const [product, setProduct] = useState(null);
  const [user, setUser] = useState(null);

  const [selectedVariantIndex, setSelectedVariantIndex] =
    useState(initialIndex);

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);

  const [reviews, setReviews] = useState([]);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState("");

  const [hasBooked, setHasBooked] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);

  const [loading, setLoading] = useState(true);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [error, setError] = useState("");

  const variants = Array.isArray(product?.variants) ? product.variants : [];

  const images = Array.isArray(product?.images) ? product.images : [];

  const variant = variants[selectedVariantIndex];

  const price = priceOf(variant);

  const originalPrice = Math.max(price, Number(variant?.fakePrice ?? price));

  const discount = Math.max(0, originalPrice - price);
  const stock = Number(variant?.stock ?? 0);

  const subtotal = price * quantity;

  const available =
    product?.status === "active" && variant && price > 0 && stock >= quantity;

  // Authentication.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribe();
  }, []);

  // Load product.
  useEffect(() => {
    let cancelled = false;

    async function loadProduct() {
      try {
        const snapshot = await getDoc(doc(db, "products", id));

        if (!snapshot.exists()) {
          throw new Error("Product not found.");
        }

        if (cancelled) return;

        const data = {
          id: snapshot.id,
          ...snapshot.data(),
        };

        setProduct(data);

        const productVariants = Array.isArray(data.variants)
          ? data.variants
          : [];

        setSelectedVariantIndex(
          initialIndex < productVariants.length ? initialIndex : 0
        );
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Unable to load product.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (id) loadProduct();

    return () => {
      cancelled = true;
    };
  }, [id, initialIndex]);

  // Load product reviews.
  async function loadReviews() {
    try {
      const reviewsQuery = query(
        collection(db, "productComments"),
        where("productId", "==", id)
      );

      const snapshot = await getDocs(reviewsQuery);

      const list = snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      }));

      list.sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || 0;
        const bTime = b.createdAt?.toMillis?.() || 0;
        return bTime - aTime;
      });

      setReviews(list);
    } catch (err) {
      console.error("Review loading error:", err);
    }
  }

  useEffect(() => {
    if (id) loadReviews();
  }, [id]);

  // Check whether this signed-in customer booked this product.
  useEffect(() => {
    let cancelled = false;

    async function checkBooking() {
      setHasBooked(false);
      setHasReviewed(false);

      if (!user || !id) return;

      try {
        const bookingQuery = query(
          collection(db, "bookings"),
          where("userId", "==", user.uid),
          where("productId", "==", id)
        );

        const [bookingSnapshot, reviewSnapshot] = await Promise.all([
          getDocs(bookingQuery),
          getDoc(doc(db, "productComments", `${id}_${user.uid}`)),
        ]);

        if (cancelled) return;

        setHasBooked(!bookingSnapshot.empty);
        setHasReviewed(reviewSnapshot.exists());
      } catch (err) {
        console.error("Booking verification error:", err);
      }
    }

    checkBooking();

    return () => {
      cancelled = true;
    };
  }, [user, id]);

  function bookNow() {
    if (!user) {
      router.push(
        `/login?redirect=${encodeURIComponent(
          `/product/${id}?variantIndex=${selectedVariantIndex}`
        )}`
      );
      return;
    }

    if (!available) return;

    router.push(
      `/checkout?productId=${encodeURIComponent(id)}&variantIndex=${selectedVariantIndex}`
    );
  }

  async function submitReview(event) {
    event.preventDefault();

    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent(`/product/${id}`)}`);
      return;
    }

    if (!hasBooked) {
      setError("You can review this product only after booking it.");
      return;
    }

    if (!reviewText.trim()) {
      setError("Please write your review.");
      return;
    }

    setReviewLoading(true);
    setError("");

    try {
      // Recheck the booking on the server-backed Firestore data.
      const bookingQuery = query(
        collection(db, "bookings"),
        where("userId", "==", user.uid),
        where("productId", "==", id)
      );

      const bookingSnapshot = await getDocs(bookingQuery);

      if (bookingSnapshot.empty) {
        setHasBooked(false);
        throw new Error("A booking for this product could not be verified.");
      }

      // One review per customer per product.
      const reviewId = `${id}_${user.uid}`;

      await setDoc(
        doc(db, "productComments", reviewId),
        {
          productId: id,
          productName: product?.name || "",
          userId: user.uid,
          userName: user.displayName || "Thukal customer",
          rating,
          comment: reviewText.trim(),
          createdAt: serverTimestamp(),
        },
        { merge: true }
      );

      setReviewText("");
      setRating(5);
      setHasReviewed(true);

      await loadReviews();
    } catch (err) {
      console.error("Review submission error:", err);
      setError(err.message || "Unable to submit your review.");
    } finally {
      setReviewLoading(false);
    }
  }

  if (loading) {
    return (
      <main className="tkd-page">
        <div className="tkd-state">
          <Sparkle className="tkd-state-sparkle" />
          <p>Loading product...</p>
        </div>
      </main>
    );
  }

  if (error && !product) {
    return (
      <main className="tkd-page">
        <div className="tkd-state">
          <Hanger className="tkd-state-icon" />
          <h2>Product unavailable</h2>
          <p>{error}</p>
          <button
            type="button"
            className="tkd-secondary-button"
            onClick={() => router.push("/home")}
          >
            Back to collection
          </button>
        </div>
      </main>
    );
  }

  if (!product) return null;

  const averageRating =
    reviews.length > 0
      ? reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) /
        reviews.length
      : 0;

  return (
    <main className="tkd-page">
      <div className="tkd-container">
        <nav className="tkd-breadcrumb" aria-label="Breadcrumb">
          <button type="button" onClick={() => router.push("/home")}>
            Home
          </button>
          <span aria-hidden="true">/</span>
          <span>{product.category}</span>
          <span aria-hidden="true">/</span>
          <strong>{product.name}</strong>
        </nav>

        <div className="tkd-grid">
          {/* IMAGE GALLERY */}
          <section className="tkd-gallery">
            <div className="tkd-main-wrap">
              <span className="tkd-sun" aria-hidden="true" />

              <div className="tkd-main-image">
                {images[selectedImageIndex] ? (
                  <img src={images[selectedImageIndex]} alt={product.name} />
                ) : (
                  <span className="tkd-image-empty">
                    <Hanger className="tkd-hanger" />
                    Image unavailable
                  </span>
                )}
              </div>

              <Sparkle className="tkd-deco tkd-deco-sparkle-a" />
              <Sparkle className="tkd-deco tkd-deco-sparkle-b" />
              <Leaf className="tkd-deco tkd-deco-leaf-a" />
              <Leaf className="tkd-deco tkd-deco-leaf-b" />

              {product.isTopSelling && (
                <span className="tkd-gallery-badge">
                  <Sparkle className="tkd-badge-star" />
                  Popular choice
                </span>
              )}
            </div>

            {images.length > 1 && (
              <div className="tkd-thumbnails">
                {images.map((image, index) => (
                  <button
                    type="button"
                    key={index}
                    className={selectedImageIndex === index ? "active" : ""}
                    onClick={() => setSelectedImageIndex(index)}
                    aria-label={`Show image ${index + 1}`}
                  >
                    <img src={image} alt={`${product.name} ${index + 1}`} />
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* PRODUCT INFORMATION */}
          <section className="tkd-info">
            <p className="tkd-category">
              <Leaf className="tkd-category-leaf" />
              {product.category || "Thukal collection"}
            </p>

            <h1>{product.name}</h1>

            <div className="tkd-rating">
              <span className="tkd-rating-star">★</span>
              <strong>
                {reviews.length > 0
                  ? `${averageRating.toFixed(1)} / 5`
                  : "No reviews yet"}
              </strong>
              <span>({reviews.length} reviews)</span>
            </div>

            <Squiggle className="tkd-squiggle" />

            <div className="tkd-price">
              <strong>₹{formatPrice(price)}</strong>

              {originalPrice > price && (
                <>
                  <del>₹{formatPrice(originalPrice)}</del>
                  <span>Save ₹{formatPrice(discount)}</span>
                </>
              )}
            </div>

            <p className="tkd-description">
              {product.description ||
                "Discover this piece from the Thukal collection."}
            </p>

            <div className="tkd-divider" />

            <span className="tkd-label">Choose your option</span>

            <div className="tkd-variant-list">
              {variants.map((item, index) => {
                const selected = index === selectedVariantIndex;
                const itemStock = Number(item.stock ?? 0);

                return (
                  <button
                    type="button"
                    key={index}
                    disabled={itemStock <= 0}
                    className={selected ? "selected" : ""}
                    aria-pressed={selected}
                    onClick={() => {
                      setSelectedVariantIndex(index);
                      setQuantity(1);
                    }}
                  >
                    <span>{item.label || `Option ${index + 1}`}</span>
                    <strong>₹{formatPrice(priceOf(item))}</strong>
                    <small>
                      {itemStock > 0 ? `${itemStock} available` : "Sold out"}
                    </small>
                  </button>
                );
              })}
            </div>

            <div className="tkd-stock-status">
              <span className={stock > 0 ? "in-stock" : "out-stock"}>
                {stock > 0 ? "● In stock" : "● Out of stock"}
              </span>
              {stock > 0 && <span>{stock} available</span>}
            </div>

            <div className="tkd-quantity">
              <span className="tkd-label">Quantity</span>

              <div className="tkd-stepper">
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  disabled={quantity <= 1}
                  onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                >
                  −
                </button>

                <strong>{quantity}</strong>

                <button
                  type="button"
                  aria-label="Increase quantity"
                  disabled={quantity >= Math.min(stock, 5)}
                  onClick={() =>
                    setQuantity((value) => Math.min(stock, 5, value + 1))
                  }
                >
                  +
                </button>
              </div>
            </div>

            <div className="tkd-total">
              <span>Subtotal</span>
              <strong>₹{formatPrice(subtotal)}</strong>
            </div>

            <button
              type="button"
              className="tkd-book-button"
              disabled={!available}
              onClick={bookNow}
            >
              {available ? "Book now" : "Currently unavailable"}
              <span className="tkd-arrow" aria-hidden="true">
                →
              </span>
            </button>

            <button
              type="button"
              className="tkd-secondary-button"
              onClick={() => router.push("/bookings")}
            >
              <span aria-hidden="true">▤</span> View my bookings
            </button>

            <p className="tkd-delivery">
              <Leaf className="tkd-delivery-leaf" />
              Delivery charges will be confirmed before dispatch.
            </p>
          </section>
        </div>

        {/* REVIEWS */}
        <section className="tkd-reviews">
          <div className="tkd-reviews-heading">
            <div>
              <p>The Thukal community</p>
              <h2>Customer experiences</h2>
            </div>
            <span>{reviews.length} reviews</span>
          </div>

          {user && hasBooked && !hasReviewed && (
            <form className="tkd-review-form" onSubmit={submitReview}>
              <Sparkle className="tkd-form-sparkle" />
              <h3>Share your experience</h3>
              <p>You've booked this product. Tell others what you think.</p>

              <span className="tkd-label">Your rating</span>

              <div className="tkd-rating-picker">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    type="button"
                    key={value}
                    className={value <= rating ? "active" : ""}
                    onClick={() => setRating(value)}
                    aria-label={`${value} stars`}
                  >
                    ★
                  </button>
                ))}
              </div>

              <label className="tkd-label" htmlFor="product-review">
                Your review
              </label>

              <textarea
                id="product-review"
                value={reviewText}
                onChange={(event) => setReviewText(event.target.value)}
                placeholder="How was the product? Share your experience..."
                rows={4}
                maxLength={1000}
              />

              <button
                type="submit"
                className="tkd-submit-button"
                disabled={reviewLoading}
              >
                {reviewLoading ? "Submitting..." : "Submit review"}
              </button>
            </form>
          )}

          {user && hasReviewed && (
            <div className="tkd-review-notice">
              <span aria-hidden="true">✓</span> You have already reviewed this
              product.
            </div>
          )}

          {!user && (
            <div className="tkd-review-notice">
              <button
                type="button"
                onClick={() =>
                  router.push(
                    `/login?redirect=${encodeURIComponent(`/product/${id}`)}`
                  )
                }
              >
                Sign in
              </button>{" "}
              to check your booking and leave a review.
            </div>
          )}

          {error && product && <p className="tkd-review-error">{error}</p>}

          {reviews.length === 0 ? (
            <div className="tkd-no-reviews">
              <span aria-hidden="true">☆</span>
              <h3>Be the first to share your experience</h3>
              <p>Customer reviews will appear here.</p>
            </div>
          ) : (
            <div className="tkd-review-list">
              {reviews.map((review) => {
                const stars = Math.min(5, Math.max(0, Number(review.rating || 0)));

                return (
                  <article className="tkd-review-item" key={review.id}>
                    <div className="tkd-review-avatar">
                      {(review.userName || "T").charAt(0).toUpperCase()}
                    </div>

                    <div className="tkd-review-content">
                      <div className="tkd-review-top">
                        <strong>{review.userName || "Thukal customer"}</strong>
                        <span>
                          {review.createdAt?.toDate
                            ? review.createdAt
                                .toDate()
                                .toLocaleDateString("en-IN")
                            : "Recently"}
                        </span>
                      </div>

                      <div
                        className="tkd-review-stars"
                        aria-label={`${stars} out of 5 stars`}
                      >
                        {"★".repeat(stars)}
                        <span>{"☆".repeat(5 - stars)}</span>
                      </div>

                      <p>{review.comment}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default function ProductDetailPage() {
  return (
    <Suspense
      fallback={
        <main className="tkd-page">
          <div className="tkd-state">
            <p>Loading product...</p>
          </div>
        </main>
      }
    >
      <ProductDetailContent />
    </Suspense>
  );
}