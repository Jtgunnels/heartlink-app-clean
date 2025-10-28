import { Routes, Route, Link } from "react-router-dom";
import HeroHeader from "./components/HeroHeader";
import DashboardPage from "./pages/DashboardPage";
import PatientDetailPage from "./pages/PatientDetailPage";

export default function App() {
  return (
    <div>
      <HeroHeader />
      <nav style={{ maxWidth: 900, margin: "8px auto 0", padding: "0 16px" }}>
        <Link to="/" style={{ color: "#2AA783", fontWeight: 600, textDecoration: "none" }}>Dashboard</Link>
      </nav>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/patient/:code" element={<PatientDetailPage />} />
      </Routes>
    </div>
  );
}
