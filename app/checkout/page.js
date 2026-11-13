
"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { onAuthStateChanged } from "firebase/auth";

import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

import { auth, db } from "@/lib/firebase";

const emptyAddress = {
  fullName: "",
  phone: "",
  house: "",
  street: "",
  landmark: "",
  city: "",
  district: "",
  state: "Kerala",
  pinCode: "",
};

function toNumber(value, fallback = 0) {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function money(value) {
  return toNumber(value).toFixed(2);
}

function getProductImage(product) {
  const images = Array.isArray(product?.images)
    ? product.images
    : [];

  const image = images[0];

  if (typeof image !== "string") return "";

  const match = image.match(/\((https?:\/\/[^)]+)\)/);

  return match ? match[1] : image.trim();
}

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const productId = searchParams.get("productId");

  const requestedVariantIndex = Math.max(
    0,
    Number(searchParams.get("variantIndex") || 0)
  );

  const [user, setUser] = useState(null);
  const [product, setProduct] = useState(null);
  const [address, setAddress] = useState(emptyAddress);

  const [variantIndex, setVariantIndex] = useState(
    requestedVariantIndex
  );

  const [quantity, setQuantity] = useState(1);

  const [editingAddress, setEditingAddress] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Load authentication, product and customer details.
  useEffect(() => {
    let cancelled = false;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        const redirectPath =
          `/checkout?productId=${encodeURIComponent(productId || "")}` +
          `&variantIndex=${requestedVariantIndex}`;

        router.replace(
          `/login?redirect=${encodeURIComponent(redirectPath)}`
        );
        return;
      }

      setUser(currentUser);

      try {
        if (!productId) {
          throw new Error("Product ID is missing.");
        }

        const [productSnapshot, userSnapshot] = await Promise.all([
          getDoc(doc(db, "products", productId)),
          getDoc(doc(db, "users", currentUser.uid)),
        ]);

        if (cancelled) return;

        if (!productSnapshot.exists()) {
          throw new Error("Product not found.");
        }

        const productData = {
          id: productSnapshot.id,
          ...productSnapshot.data(),
        };

        setProduct(productData);

        const variants = Array.isArray(productData.variants)
          ? productData.variants
          : [];

        if (requestedVariantIndex >= variants.length) {
          setVariantIndex(0);
        } else {
          setVariantIndex(requestedVariantIndex);
        }

        if (userSnapshot.exists()) {
          const userData = userSnapshot.data();

          setAddress({
            ...emptyAddress,
            ...(userData.address || {}),
            fullName:
              userData.address?.fullName ||
              userData.name ||
              currentUser.displayName ||
              "",
            phone:
              userData.address?.phone ||
              userData.phone ||
              "",
          });
        } else {
          setAddress({
            ...emptyAddress,
            fullName: currentUser.displayName || "",
          });
        }
      } catch (err) {
        console.error("Checkout loading error:", err);

        if (!cancelled) {
          setError(err.message || "Unable to load checkout.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [productId, requestedVariantIndex, router]);

  // Read variants directly from the loaded product.
  const variants = useMemo(() => {
    return Array.isArray(product?.variants)
      ? product.variants
      : [];
  }, [product]);

  const selectedVariant = variants[variantIndex] || null;

  // Use actual Firestore variant fields.
  const unitPrice = toNumber(
    selectedVariant?.finalPrice ??
    selectedVariant?.sellingPrice,
    0
  );

  const originalUnitPrice = Math.max(
    unitPrice,
    toNumber(selectedVariant?.fakePrice, unitPrice)
  );

  const stock = toNumber(selectedVariant?.stock, 0);

  // Calculate summary dynamically.
  const subtotal = unitPrice * quantity;

  const discount = Math.max(
    0,
    (originalUnitPrice - unitPrice) * quantity
  );

  const totalSavings = discount;

  const currentTotal = subtotal;

  const isAvailable =
    product?.status === "active" &&
    selectedVariant !== null &&
    unitPrice > 0 &&
    stock >= quantity;

  function updateAddress(field, value) {
    setAddress((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function changeVariant(index) {
    setVariantIndex(index);
    setQuantity(1);
    setError("");
  }

  function validateAddress() {
    if (!address.fullName.trim()) {
      return "Please enter your full name.";
    }

    if (!/^[0-9+\-\s]{10,15}$/.test(address.phone.trim())) {
      return "Please enter a valid phone number.";
    }

    if (!address.house.trim()) {
      return "Please enter your house or building name.";
    }

    if (!address.city.trim()) {
      return "Please enter your city.";
    }

    if (!address.district.trim()) {
      return "Please enter your district.";
    }

    if (!/^[0-9]{6}$/.test(address.pinCode.trim())) {
      return "Please enter a valid 6-digit PIN code.";
    }

    return "";
  }

  async function confirmBooking() {
    if (!user || !product || !selectedVariant) {
      setError("Product information is missing.");
      return;
    }

    if (saving) return;

    const validationError = validateAddress();

    if (validationError) {
      setError(validationError);
      setEditingAddress(true);
      return;
    }

    if (!isAvailable) {
      setError("This variant is currently unavailable.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      // Fetch latest product data before placing booking.
      const latestSnapshot = await getDoc(
        doc(db, "products", productId)
      );

      if (!latestSnapshot.exists()) {
        throw new Error("Product no longer exists.");
      }

      const latestProduct = latestSnapshot.data();

      const latestVariants = Array.isArray(latestProduct.variants)
        ? latestProduct.variants
        : [];

      const latestVariant = latestVariants[variantIndex];

      if (latestProduct.status !== "active" || !latestVariant) {
        throw new Error("Selected variant is unavailable.");
      }

      const latestStock = toNumber(latestVariant.stock, 0);

      if (latestStock < quantity) {
        throw new Error(
          `Only ${latestStock} units are available.`
        );
      }

      const latestPrice = toNumber(
        latestVariant.finalPrice ?? latestVariant.sellingPrice,
        0
      );

      const latestOriginalPrice = Math.max(
        latestPrice,
        toNumber(latestVariant.fakePrice, latestPrice)
      );

      if (latestPrice <= 0) {
        throw new Error("Invalid product price.");
      }

      const latestSubtotal = latestPrice * quantity;

      const latestDiscount = Math.max(
        0,
        (latestOriginalPrice - latestPrice) * quantity
      );

      const cleanAddress = {
        fullName: address.fullName.trim(),
        phone: address.phone.trim(),
        house: address.house.trim(),
        street: address.street.trim(),
        landmark: address.landmark.trim(),
        city: address.city.trim(),
        district: address.district.trim(),
        state: address.state.trim(),
        pinCode: address.pinCode.trim(),
      };

      // Save customer information.
      await setDoc(
        doc(db, "users", user.uid),
        {
          name: cleanAddress.fullName,
          phone: cleanAddress.phone,
          address: cleanAddress,
        },
        { merge: true }
      );

      // Create booking.
      const bookingData = {
        userId: user.uid,
        userEmail: user.email || "",

        productId,
        productName: latestProduct.name || "Product",
        productImage: getProductImage(latestProduct),

        selectedSize: latestVariant.label || "",
        variantLabel: latestVariant.label || "",
        variantIndex,
        packQty: toNumber(latestVariant.packQty, 1),

        quantity,

        unitPrice: latestPrice,
        originalUnitPrice: latestOriginalPrice,

        subtotal: latestSubtotal,
        discountAmount: latestDiscount,

        deliveryCharge: null,
        deliveryChargePending: true,

        totalSavings: latestDiscount,
        totalAmount: latestSubtotal,
        totalAmountPending: true,

        deliveryAddress: cleanAddress,

        paymentMethod: "Cash on Delivery",
        paymentStatus: "Pending",
        status: "Pending",

        createdAt: serverTimestamp(),
      };

      const bookingRef = await addDoc(
        collection(db, "bookings"),
        bookingData
      );

      router.replace(`/booking-success?id=${bookingRef.id}`);
    } catch (err) {
      console.error("Booking error:", err);
      setError(err.message || "Unable to confirm booking.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="checkout-page">
        <p>Loading checkout...</p>
      </main>
    );
  }

  if (error && !product) {
    return (
      <main className="checkout-page">
        <div className="checkout-container">
          <div className="checkout-error">{error}</div>
          <button onClick={() => router.push("/home")}>
            Back to products
          </button>
        </div>
      </main>
    );
  }

  if (!product || variants.length === 0) {
    return (
      <main className="checkout-page">
        <div className="checkout-container">
          <h2>Product unavailable</h2>
          <p>This product has no available variants.</p>
          <button onClick={() => router.push("/home")}>
            Back to products
          </button>
        </div>
      </main>
    );
  }

  const image = getProductImage(product);

  return (
    <main className="checkout-page">
      <div className="checkout-container">

        <h1>Checkout</h1>
        <p>Review your order before confirming.</p>

        {error && (
          <div className="checkout-error">
            {error}
          </div>
        )}

        <div className="checkout-grid">

          <section className="checkout-main">

            {/* PRODUCT DETAILS */}
            <div className="checkout-card">
              <h2>Product details</h2>

              <div className="checkout-product">
                {image && (
                  <img src={image} alt={product.name} />
                )}

                <div>
                  <h3>{product.name}</h3>
                  <p>{product.category}</p>

                  <strong>₹{money(unitPrice)}</strong>

                  {originalUnitPrice > unitPrice && (
                    <del>₹{money(originalUnitPrice)}</del>
                  )}
                </div>
              </div>

              <label htmlFor="checkout-variant">
                Select variant
              </label>

              <select
                id="checkout-variant"
                value={variantIndex}
                onChange={(e) =>
                  changeVariant(Number(e.target.value))
                }
              >
                {variants.map((variant, index) => (
                  <option
                    key={index}
                    value={index}
                    disabled={toNumber(variant.stock) <= 0}
                  >
                    {variant.label || `Variant ${index + 1}`}
                    {" — ₹"}
                    {money(
                      variant.finalPrice ?? variant.sellingPrice
                    )}
                    {" — "}
                    {variant.stock ?? 0} available
                  </option>
                ))}
              </select>

              <div className="checkout-quantity">
                <label>Quantity</label>

                <div>
                  <button
                    type="button"
                    disabled={quantity <= 1}
                    onClick={() =>
                      setQuantity((q) => Math.max(1, q - 1))
                    }
                  >
                    −
                  </button>

                  <strong>{quantity}</strong>

                  <button
                    type="button"
                    disabled={quantity >= Math.min(stock, 5)}
                    onClick={() =>
                      setQuantity((q) =>
                        Math.min(stock, 5, q + 1)
                      )
                    }
                  >
                    +
                  </button>
                </div>
              </div>

              <p>{stock} units available</p>
            </div>

            {/* ADDRESS */}
            <div className="checkout-card">
              <div className="checkout-section-heading">
                <h2>Delivery address</h2>

                <button
                  type="button"
                  onClick={() =>
                    setEditingAddress((value) => !value)
                  }
                >
                  {editingAddress ? "Close" : "Edit"}
                </button>
              </div>

              {!editingAddress ? (
                <div className="checkout-address">
                  <strong>{address.fullName || "Name not added"}</strong>
                  <p>{address.phone}</p>
                  <p>
                    {[
                      address.house,
                      address.street,
                      address.landmark,
                      address.city,
                      address.district,
                      address.state,
                      address.pinCode,
                    ].filter(Boolean).join(", ")}
                  </p>
                </div>
              ) : (
                <div className="checkout-address-form">
                  {[
                    ["fullName", "Full name"],
                    ["phone", "Phone number"],
                    ["house", "House / Building"],
                    ["street", "Street"],
                    ["landmark", "Landmark"],
                    ["city", "City"],
                    ["district", "District"],
                    ["state", "State"],
                    ["pinCode", "PIN code"],
                  ].map(([field, label]) => (
                    <div key={field}>
                      <label>{label}</label>

                      <input
                        value={address[field]}
                        onChange={(e) =>
                          updateAddress(field, e.target.value)
                        }
                        placeholder={label}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* PAYMENT */}
            <div className="checkout-card">
              <h2>Payment method</h2>

              <div className="payment-option selected">
                <input type="radio" checked readOnly />

                <div>
                  <strong>Cash on Delivery</strong>
                  <p>Pay when your order arrives.</p>
                </div>
              </div>

              <div className="payment-option unavailable">
                <input type="radio" disabled />

                <div>
                  <strong>UPI</strong>
                  <p>Currently unavailable</p>
                </div>
              </div>

              <div className="payment-option unavailable">
                <input type="radio" disabled />

                <div>
                  <strong>Credit / Debit Card</strong>
                  <p>Currently unavailable</p>
                </div>
              </div>
            </div>

          </section>

          {/* ORDER SUMMARY */}
          <aside className="checkout-summary">

            <h2>Order summary</h2>

            <div className="summary-row">
              <span>Unit price</span>
              <strong>₹{money(unitPrice)}</strong>
            </div>

            <div className="summary-row">
              <span>Quantity</span>
              <strong>{quantity}</strong>
            </div>

            <div className="summary-row">
              <span>Subtotal</span>
              <strong>₹{money(subtotal)}</strong>
            </div>

            <div className="summary-row">
              <span>You save</span>
              <strong className="checkout-saving">
                − ₹{money(totalSavings)}
              </strong>
            </div>

            <div className="summary-row">
              <span>Delivery charge</span>
              <strong>To be confirmed</strong>
            </div>

            <hr />

            <div className="summary-row summary-total">
              <span>Current total</span>
              <strong>₹{money(currentTotal)}</strong>
            </div>

            <p className="checkout-note">
              Delivery charges, if applicable, will be confirmed
              before dispatch. We will communicate the final
              payable amount to you.
            </p>

            {!isAvailable && (
              <div className="checkout-error">
                This variant is unavailable or has insufficient stock.
              </div>
            )}

            <button
              className="checkout-confirm-button"
              onClick={confirmBooking}
              disabled={saving || !isAvailable}
            >
              {saving ? "Confirming..." : "Confirm booking"}
            </button>

            <p className="checkout-note">
              Payment method: Cash on Delivery.
            </p>

          </aside>

        </div>
      </div>
    </main>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <main className="checkout-page">
          Loading checkout...
        </main>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
