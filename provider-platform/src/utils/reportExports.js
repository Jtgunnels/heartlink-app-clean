// src/utils/reportExports.js
// HeartLink Provider Platform — Enhanced Export Utilities (Paginated + Branded)
// - Proper header/footer with logo (keeps aspect ratio)
// - True page margins
// - Canvas pagination (no “one big page”)
// - Footer never overlaps charts

import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const LOGO_PATH = "/heartlink_full_light.png";
const APP_TITLE = "HeartLink Program Insights"; // ← updated to match Master List vFinal++

// ----- Tunables (pts) -----
const PAGE_FORMAT = "a4";
const MARGIN_X = 40;
const HEADER_BOTTOM_Y = 96;
const CONTENT_TOP_Y = 112;
const FOOTER_TOP_OFFSET = 34;
const FOOTER_TEXT_OFFSET = 22;
const PAGE_NUM_OFFSET = 10;

/* ------------------- CSV EXPORT ------------------- */
export async function exportAsCSV(rows, filename = "HeartLink_Report.csv") {
  if (!Array.isArray(rows) || rows.length === 0) {
    const blob = new Blob(["No data"], { type: "text/plain;charset=utf-8" });
    saveAs(blob, filename);
    return;
  }
  const headers = Array.from(
    rows.reduce((set, r) => {
      Object.keys(r || {}).forEach((k) => set.add(k));
      return set;
    }, new Set())
  );
  const csv = [
    "\uFEFF",
    headers.join(","),
    ...rows.map((r) => headers.map((h) => csvCell(r[h])).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  saveAs(blob, filename);
}
function csvCell(v) {
  if (v == null) return "";
  const s = String(v).replace(/"/g, '""');
  return /[",\n]/.test(s) ? `"${s}"` : s;
}

/* ------------------- SINGLE REPORT PDF ------------------- */
export async function exportVisibleAsPDF(
  node,
  filename = "HeartLink_Report.pdf",
  title = "Report"
) {
  if (!node) return;

  const canvas = await html2canvas(node, { scale: 3, backgroundColor: "#FFFFFF" });
  const pdf = new jsPDF({ orientation: "p", unit: "pt", format: PAGE_FORMAT });
  const { pageWidth, pageHeight } = dims(pdf);

  await addHeader(pdf, title);

  await renderCanvasPaginated(pdf, canvas, {
    pageWidth,
    pageHeight,
    marginX: MARGIN_X,
    topY: CONTENT_TOP_Y,
    bottomY: pageHeight - FOOTER_TOP_OFFSET,
  });

  addFooter(pdf);
  pdf.save(filename);
}

/* ------------------- COMBINED MULTI-REPORT PDF ------------------- */
export async function exportAllReportsAsPDF(filename = "HeartLink_Full_Report.pdf") {
  const sections = Array.from(document.querySelectorAll(".report-surface"));
  if (!sections.length) return;

  const pdf = new jsPDF({ orientation: "p", unit: "pt", format: PAGE_FORMAT });
  const { pageWidth, pageHeight } = dims(pdf);
  let firstPage = true;

  for (const section of sections) {
    const canvas = await html2canvas(section, { scale: 3, backgroundColor: "#FFFFFF" });
    const sectionTitle =
      section.querySelector(".report-title")?.innerText ||
      document.querySelector(".report-title")?.innerText ||
      "Report Section";

    if (!firstPage) pdf.addPage();
    firstPage = false;

    await addHeader(pdf, sectionTitle);

    await renderCanvasPaginated(pdf, canvas, {
      pageWidth,
      pageHeight,
      marginX: MARGIN_X,
      topY: CONTENT_TOP_Y,
      bottomY: pageHeight - FOOTER_TOP_OFFSET,
    });

    addFooter(pdf);
  }

  pdf.save(filename);
}

/* ------------------- CHART IMAGE EXPORT ------------------- */
export async function exportNodeAsImage(node, filename = "HeartLink_Chart.png") {
  if (!node) return;
  const canvas = await html2canvas(node, { scale: 2, backgroundColor: "#FFFFFF" });
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  saveAs(blob, filename);
}

/* ------------------- INTERNAL HELPERS ------------------- */
async function addHeader(pdf, reportTitle) {
  const pageWidth = pdf.internal.pageSize.getWidth();

  try {
    const img = new Image();
    img.src = LOGO_PATH;
    await new Promise((res, rej) => {
      img.onload = res;
      img.onerror = rej;
    });

    const logoWidth = 90;
    const logoHeight = (img.height / img.width) * logoWidth;
    const logoY = 28;
    pdf.addImage(img, "PNG", MARGIN_X, logoY, logoWidth, logoHeight);
  } catch {
    // logo missing — safe to ignore
  }

  const timestamp = new Date().toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  pdf.setTextColor(25, 88, 143);
  pdf.text(APP_TITLE, pageWidth / 2, 48, { align: "center" }); // updated app title

  pdf.setFontSize(15);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(26, 31, 54);
  pdf.text(reportTitle, pageWidth / 2, 70, { align: "center" });

  pdf.setFontSize(10);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(107, 122, 137);
  pdf.text(`Generated ${timestamp}`, pageWidth / 2, 86, { align: "center" });

  pdf.setDrawColor(230, 236, 243);
  pdf.line(MARGIN_X, HEADER_BOTTOM_Y, pageWidth - MARGIN_X, HEADER_BOTTOM_Y);
}

function addFooter(pdf) {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const pageNumber = pdf.internal.getNumberOfPages();

  pdf.setDrawColor(230, 236, 243);
  pdf.line(MARGIN_X, pageHeight - FOOTER_TOP_OFFSET, pageWidth - MARGIN_X, pageHeight - FOOTER_TOP_OFFSET);

  pdf.setFont("helvetica", "italic");
  pdf.setFontSize(10);
  pdf.setTextColor(107, 122, 137);

  pdf.text(
    "*For program performance awareness only — not diagnostic guidance.*",
    pageWidth / 2,
    pageHeight - FOOTER_TEXT_OFFSET,
    { align: "center" }
  );

  pdf.setFontSize(9);
  pdf.text(`Page ${pageNumber}`, pageWidth - MARGIN_X - 20, pageHeight - PAGE_NUM_OFFSET);
}

function dims(pdf) {
  return {
    pageWidth: pdf.internal.pageSize.getWidth(),
    pageHeight: pdf.internal.pageSize.getHeight(),
  };
}

async function renderCanvasPaginated(
  pdf,
  originalCanvas,
  { pageWidth, marginX, topY, bottomY }
) {
  const contentHeightPt = bottomY - topY;
  const targetWidthPt = pageWidth - 2 * marginX;
  const scale = targetWidthPt / originalCanvas.width;
  const sliceHeightPx = contentHeightPt / scale;

  let remainingPx = originalCanvas.height;
  let sourceY = 0;
  let isFirstSlice = true;

  const pageCanvas = document.createElement("canvas");
  pageCanvas.width = originalCanvas.width;

  while (remainingPx > 0) {
    const thisSlicePx = Math.min(sliceHeightPx, remainingPx);
    pageCanvas.height = Math.ceil(thisSlicePx);
    const ctx = pageCanvas.getContext("2d");
    ctx.clearRect(0, 0, pageCanvas.width, pageCanvas.height);
    ctx.drawImage(originalCanvas, 0, sourceY, pageCanvas.width, thisSlicePx, 0, 0, pageCanvas.width, thisSlicePx);

    const imgData = pageCanvas.toDataURL("image/png");
    if (!isFirstSlice) {
      pdf.addPage();
      await addHeader(pdf, "Continued");
    }

    const sliceHeightPt = thisSlicePx * scale;
    pdf.addImage(imgData, "PNG", marginX, topY, targetWidthPt, sliceHeightPt, undefined, "FAST");
    addFooter(pdf);

    sourceY += thisSlicePx;
    remainingPx -= thisSlicePx;
    isFirstSlice = false;
  }
}
