import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTier } from "../context/useTier";
import { useAuth } from "../context/AuthProvider";
import heartlinkLogo from "/heartlink_full_light.png";
import "./NavBar.css";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../utils/firebaseConfig";

export default function NavBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { tier } = useTier();
  const [menuOpen, setMenuOpen] = useState(false);
  const { logout, user } = useAuth();

  // Tier-based access control
  const REPORTS_LABEL = "Reports & Analytics";

  const allowedPages = {
    Bronze: ["Dashboard", "Patients"],
    Silver: ["Dashboard", "Patients", REPORTS_LABEL],
    Gold: ["Dashboard", "Patients", REPORTS_LABEL, "Clinical Review", "Settings"],
    Platinum: ["Dashboard", "Patients", REPORTS_LABEL, "Clinical Review", "Settings"],
    Diamond: ["Dashboard", "Patients", REPORTS_LABEL, "Clinical Review", "System Insights", "Settings"],
  };

  const [reviewCount, setReviewCount] = useState(0);

  

  useEffect(() => {
    // Only subscribe to Firestore listeners when a user is signed in.
    if (!user) {
      setReviewCount(0);
      return () => {};
    }
    const STATUSES = ["Review Recommended", "Needs Immediate Review"];
    const filters = [
      where("status", "==", "Active"),
      where("aseCategory", "in", STATUSES),
    ];

    // Use providerId from storage (set at login). If missing, skip provider-scoped listener.
    const providerId = sessionStorage.getItem("providerId") || localStorage.getItem("providerId");

    const providerRef = providerId ? collection(db, "providers", providerId, "patients") : null;

    const rootRef = collection(db, "patients");

    let providerCount = null;
    let fallbackCount = null;

    const applyCount = () => {
      if (providerCount != null) {
        if (providerCount > 0) {
          setReviewCount(providerCount);
          return;
        }
        if (fallbackCount != null && fallbackCount > 0) {
          setReviewCount(fallbackCount);
          return;
        }
        setReviewCount(providerCount);
        return;
      }
      if (fallbackCount != null) {
        setReviewCount(fallbackCount);
      }
    };

  let unsubscribeProvider = null;
    if (providerRef) {
      unsubscribeProvider = onSnapshot(
        query(providerRef, ...filters),
        (snapshot) => {
          providerCount = snapshot.size;
          applyCount();
        },
        (error) => {
          console.warn("Provider review listener failed", error);
          providerCount = null;
          applyCount();
        }
      );
    } else {
      // no providerId available; treat provider scoped count as null so fallback is used
      providerCount = null;
    }

    const unsubscribeFallback = onSnapshot(
      query(rootRef, ...filters),
      (snapshot) => {
        fallbackCount = snapshot.size;
        if (providerCount == null || providerCount === 0) {
          applyCount();
        }
      },
      (error) => {
        console.warn("Fallback review listener failed", error);
      }
    );

    return () => {
      unsubscribeProvider?.();
      unsubscribeFallback?.();
    };
  }, [user]);

  const pages = [
    { name: "Dashboard", to: { pathname: "/dashboard" }, badge: reviewCount },
    { name: "Patients", to: { pathname: "/patients" } },
    { name: REPORTS_LABEL, to: { pathname: "/reports" } },
    
    { name: "Settings", to: { pathname: "/settings" } },
  ];

  const currentTier = tier || "Bronze";
  const visiblePages = allowedPages[currentTier] || ["Dashboard"];

  const isActive = useMemo(() => {
    const currentParams = new URLSearchParams(location.search);
    return (page) => {
      const target = page.to ?? { pathname: page.path ?? "" };
      const pathname = target.pathname ?? "";
      if (location.pathname !== pathname) return false;
      const desiredSearch = target.search ?? "";
      if (!desiredSearch) return true;
      const desiredParams = new URLSearchParams(desiredSearch);
      for (const [key, value] of desiredParams.entries()) {
        if (currentParams.get(key) !== value) return false;
      }
      return true;
    };
  }, [location.pathname, location.search]);

  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* Left: Logo */}
        <div className="navbar-left">
          <img
            src={heartlinkLogo}
            alt="HeartLink Logo"
            className="navbar-logo"
          />
        </div>

        {/* Center: Desktop Nav Links */}
        <div className={`navbar-links ${menuOpen ? "open" : ""}`}>
          {pages
            .filter((page) => visiblePages.includes(page.name))
            .map((page) => (
              <Link
                key={page.name}
                to={page.to ?? page.path}
                onClick={() => setMenuOpen(false)}
                className={`nav-link ${isActive(page) ? "active" : ""}`}
                aria-current={isActive(page) ? "page" : undefined}
              >
                {page.name}
                {page.badge && page.badge > 0 ? (
                  <span className="nav-badge" aria-label={`${page.badge} patients requiring review`}>
                    {page.badge}
                  </span>
                ) : null}
              </Link>
            ))}
        </div>

        {/* Right: Tier badge + Mobile Toggle */}
        <div className="navbar-right">
          <span className={`tier-badge tier-${currentTier.toLowerCase()}`}>
            {currentTier}
          </span>
          <button
            type="button"
            className="logout-btn"
            onClick={async () => {
              setMenuOpen(false);
              try {
                await logout();
              } catch (err) {
                console.warn("Logout failed", err);
              } finally {
                navigate("/login", { replace: true });
              }
            }}
          >
            Logout
          </button>

          {/* Mobile menu button */}
          <button
            className={`menu-toggle ${menuOpen ? "open" : ""}`}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle navigation menu"
          >
            <span className="bar"></span>
            <span className="bar"></span>
            <span className="bar"></span>
          </button>
        </div>
      </div>
    </nav>
  );
}
