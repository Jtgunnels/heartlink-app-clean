import React from "react";
import "./PatientDetailModal.css";

export default function PatientDetailModal({ patient, onClose }) {
  if (!patient) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{patient.patientCode}</h2>
        <p>
          <strong>Status:</strong> {patient.status}
        </p>
        <p>
          <strong>ASE Category:</strong> {patient.aseCategory}
        </p>
        {patient.reasonSummary && (
          <p>
            <strong>Summary:</strong> {patient.reasonSummary}
          </p>
        )}
        <button className="modal-close" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
