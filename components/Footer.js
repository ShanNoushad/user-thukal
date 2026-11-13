import Link from "next/link";
export default function Footer() {
  return <footer className="footer"><div><Link className="brand" href="/">THUKAL<span>®</span></Link><p>Rooted in Kerala. Made for every day.</p></div><small>© {new Date().getFullYear()} Thukal. All rights reserved.</small></footer>;
}
