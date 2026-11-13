
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../../lib/firebase";
import ProductCard from "../../components/ProductCard";

export default function HomePage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const productsRef = collection(db, "products");

    const unsubscribe = onSnapshot(
      productsRef,
      (snapshot) => {
        const productList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        console.log("Firestore products:", productList);

        setProducts(productList);
        setLoading(false);
        setError("");
      },
      (firebaseError) => {
        console.error("Product loading error:", firebaseError);

        setError(
          "Could not load products. Check Firebase connection and Firestore security rules."
        );

        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return (
    <div className="section-wrap page-space">
      <div className="page-heading">
        <div>
          <p className="eyebrow">THOUGHTFULLY SELECTED</p>
          <h1>The collection</h1>
          <p className="lead">
            Pieces for everyday living, with a little story in every detail.
          </p>
        </div>

        <Link href="/bookings" className="text-link">
          Your bookings →
        </Link>
      </div>

      <div className="category-strip">
        <span>All pieces</span>
        <span>Everyday wear</span>
        <span>New arrivals</span>
        <span>Kerala inspired</span>
      </div>

      {loading ? (
        <p className="status">Loading the collection…</p>
      ) : error ? (
        <p className="error">{error}</p>
      ) : products.length === 0 ? (
        <div className="empty-panel">
          <h2>The collection is taking shape.</h2>
          <p>
            No products were found in the Firestore products collection.
          </p>
        </div>
      ) : (
        <div className="product-grid">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}

