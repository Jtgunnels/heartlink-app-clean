import { useParams } from "react-router-dom";

export default function PatientDetailPage() {
  const { code } = useParams();
  return (
    <div style={{ maxWidth: 900, margin: "24px auto", padding: "0 16px" }}>
      <h2 style={{ color: "#0E2E4F" }}>Patient {code}</h2>
      <p>Detail view (recent check-ins & trends) coming next.</p>
    </div>
  );
}
