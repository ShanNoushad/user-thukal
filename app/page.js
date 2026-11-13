"use client";

import Link from "next/link";

export default function LandingPage() {
  return (
    <div>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">ROOTED IN KERALA · MADE TO BE WORN</p>
          <h1>Clothing with a sense of <em>belonging.</em></h1>
          <p className="lead">A considered collection inspired by the textures, stories and everyday beauty of Kerala.</p>
          <Link className="button" href="/home">Explore the collection</Link>
        </div>
        <div className="hero-image"><img src="/images/hero.jpg" alt="Thukal clothing collection" onError={(e) => {e.currentTarget.style.display="none";}}/><span className="image-placeholder">Add your campaign image at public/images/hero.jpg</span></div>
      </section>
      <section className="intro section-wrap">
        <p className="eyebrow">THE THUKAL STORY</p>
        <h2>Tradition, seen through a quieter lens.</h2>
        <p>Everyday pieces, thoughtful details and a connection to where we come from.</p>
        <Link href="/home" className="text-link">Discover the collection</Link>
      </section>
      <section className="home-cta"><p className="eyebrow">A LITTLE MORE THUKAL</p><h2>Find pieces that feel like you.</h2><Link href="/signup" className="button">Become a member</Link></section>
    </div>
  );
}
