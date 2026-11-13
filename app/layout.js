import "../styles/globals.css";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export const metadata = {
  title: "Thukal — Rooted in Kerala",
  description: "Thoughtful clothing, rooted in Kerala."
};

export default function RootLayout({ children }) {
  return <html lang="en"><body><Navbar /><main>{children}</main><Footer /></body></html>;
}
