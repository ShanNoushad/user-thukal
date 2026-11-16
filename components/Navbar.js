"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../lib/firebase";
import logo from "../app/assets/logo.png";
import "./navbar.css";

export default function Navbar() {
  const [user, setUser] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // close the mobile menu on route change
  useEffect(() => setOpen(false), [pathname]);

  const links = [
    { href: "/home", label: "Shop" },
    ...(user
      ? [
          { href: "/bookings", label: "Bookings" },
          { href: "/notifications", label: "Notifications" },
          { href: "/profile", label: "Profile" },
        ]
      : []),
  ];

  const isActive = (href) => pathname === href || pathname?.startsWith(href + "/");

  return (
    <header className={`navbar ${scrolled ? "is-scrolled" : ""} ${open ? "is-open" : ""}`}>
      <Link className="brand" href="/" aria-label="Thukal home">
        <Image src={logo} alt="" priority />
        <span className="brand-text">
          THUKAL<span className="brand-reg">®</span>
        </span>
      </Link>

      <nav className="nav-links" aria-label="Main navigation">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`nav-link ${isActive(l.href) ? "active" : ""}`}
            aria-current={isActive(l.href) ? "page" : undefined}
          >
            {l.label}
          </Link>
        ))}
      </nav>

      <div className="nav-auth">
        {user ? (
          <Link href="/profile" className="account-link">
            <span className="avatar" aria-hidden="true">
              {(user.displayName || user.email || "U").charAt(0).toUpperCase()}
            </span>
            My account
          </Link>
        ) : (
          <>
            <Link href="/login" className="login-link">Login</Link>
            <Link href="/signup" className="join-link">Join</Link>
          </>
        )}
      </div>

      <button
        className="menu-toggle"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span /><span />
      </button>
    </header>
  );
}