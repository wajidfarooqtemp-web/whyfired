import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// Runs every time the page/route changes. Without this, React Router
// leaves you at whatever scroll position you were at — it does not
// jump to the top like a normal multi-page website would.
export default function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      // e.g. "/#rights" from the footer's "Know your rights" link —
      // scroll to that section instead of the very top.
      const id = hash.replace("#", "");
      const timer = setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
      return () => clearTimeout(timer);
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);

  return null;
}