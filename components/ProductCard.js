"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import "./product-card.css";

function getPrice(variant) {
  return Number(variant?.finalPrice ?? variant?.sellingPrice ?? 0);
}

/* ---------- tiny decorative illustrations (all aria-hidden) ---------- */

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
      <path
        d="M2 22C2 10 10 2 22 2 22 14 14 22 2 22Z"
        fill="currentColor"
      />
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

/* ---------- component ---------- */

export default function ProductCard({ product }) {
  const router = useRouter();

  const variants = Array.isArray(product?.variants) ? product.variants : [];

  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);

  const variant = variants[selectedVariantIndex];
  const price = getPrice(variant);
  const originalPrice = Math.max(price, Number(variant?.fakePrice ?? price));

  const discount = Math.max(0, originalPrice - price);
  const image = product?.images?.[0] || "";

  const available =
    product?.status === "active" && variant && Number(variant.stock ?? 0) > 0;

  const discountPercent =
    originalPrice > 0 ? Math.round((discount / originalPrice) * 100) : 0;

  function openProduct() {
    if (!product?.id) return;

    router.push(
      `/product/${encodeURIComponent(product.id)}?variantIndex=${selectedVariantIndex}`
    );
  }

  return (
    <article
      className={`tkc-product-card${available ? "" : " is-unavailable"}`}
    >
      {/* ---- image ---- */}
      <button
        type="button"
        className="tkc-product-image"
        onClick={openProduct}
        aria-label={`View ${product?.name || "product"}`}
      >
        {/* sun disc sitting behind the arch */}
        <span className="tkc-sun" aria-hidden="true" />

        <span className="tkc-image-frame">
          {image ? (
            <img
              src={image}
              alt={product?.name || "Thukal clothing"}
              loading="lazy"
            />
          ) : (
            <span className="tkc-image-empty">
              <Hanger className="tkc-hanger" />
              <span>No image available</span>
            </span>
          )}
        </span>

        {/* floating stickers */}
        <Sparkle className="tkc-deco tkc-deco-sparkle-a" />
        <Sparkle className="tkc-deco tkc-deco-sparkle-b" />
        <Leaf className="tkc-deco tkc-deco-leaf-a" />
        <Leaf className="tkc-deco tkc-deco-leaf-b" />

        {discountPercent > 0 && (
          <span className="tkc-discount-badge">
            <b>{discountPercent}%</b>
            <small>off</small>
          </span>
        )}

        {product?.isTopSelling && (
          <span className="tkc-bestseller-badge">
            <Sparkle className="tkc-badge-star" />
            Best seller
          </span>
        )}
      </button>

      {/* ---- content ---- */}
      <div className="tkc-product-content">
        <div className="tkc-product-category">
          <Leaf className="tkc-category-leaf" />
          {product?.category || "Thukal collection"}
        </div>

        <button
          type="button"
          className="tkc-product-name"
          onClick={openProduct}
        >
          {product?.name || "Untitled product"}
        </button>

        <Squiggle className="tkc-squiggle" />

        <div className="tkc-product-price">
          <strong>₹{price.toFixed(2)}</strong>

          {originalPrice > price && (
            <>
              <del>₹{originalPrice.toFixed(2)}</del>
              <span>Save ₹{discount.toFixed(2)}</span>
            </>
          )}
        </div>

        {variants.length > 0 && (
          <div className="tkc-card-variant">
            <label htmlFor={`variant-${product?.id}`}>Choose option</label>

            <div className="tkc-select-wrap">
              <select
                id={`variant-${product?.id}`}
                value={selectedVariantIndex}
                onChange={(event) =>
                  setSelectedVariantIndex(Number(event.target.value))
                }
              >
                {variants.map((item, index) => (
                  <option key={index} value={index}>
                    {item.label || `Option ${index + 1}`}
                    {" · "}₹{getPrice(item).toFixed(2)}
                    {" · "}
                    {Number(item.stock ?? 0) > 0
                      ? `${item.stock} in stock`
                      : "Sold out"}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div className="tkc-card-actions">
          <button
            type="button"
            className="tkc-view-button"
            onClick={openProduct}
          >
            View details
            <span className="tkc-arrow" aria-hidden="true">
              →
            </span>
          </button>

          {!available && (
            <span className="tkc-stock-label">Out of stock</span>
          )}
        </div>
      </div>
    </article>
  );
}