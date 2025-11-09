import React, { useEffect, useMemo, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Area,
} from "recharts";
import {
  getEnrollmentAnalytics, // ✅ keeps the correct export
  getEnrollmentTrend,
} from "../../utils/fetchReportData"; // ✅ removed getActiveCompositionData import
import { useContainerWidth } from "../../hooks/useContainerWidth";

const COLORS = ["#19588F", "#45B8A1"];
const GRADIENT_ID = "activeGradient";

function toNumber(value, fallback = 30) {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : fallback;
}

export default function EnrollmentOverview({ timeRange = 90 }) {
  const numericRange = useMemo(() => toNumber(timeRange, 90), [timeRange]);
  const [composition, setComposition] = useState([]);
  const [trend, setTrend] = useState([]);
  const { ref: pieRef, width: pieWidth } = useContainerWidth(320);
  const { ref: trendRef, width: trendWidth } = useContainerWidth(320);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // ✅ replaced getActiveCompositionData with getEnrollmentAnalytics
        const [comp, trendData] = await Promise.all([
          getEnrollmentAnalytics(numericRange),
          getEnrollmentTrend(numericRange),
        ]);
        if (cancelled) return;

        // getEnrollmentAnalytics historically returned an array of slices
        // but newer implementations may return an object with totals.
        // Normalize both shapes to an array so callers can safely use .find/.filter.
        let normalizedComp = [];
        if (Array.isArray(comp)) {
          normalizedComp = comp;
        } else if (comp && typeof comp === "object") {
          normalizedComp = [
            {
              label: "Active",
              value: comp.active ?? 0,
              total: comp.total ?? comp.active ?? 0,
            },
            { label: "Discharged", value: comp.discharged ?? 0 },
          ];
        }

        setComposition(normalizedComp);
        setTrend(trendData || []);
      } catch (err) {
        console.warn("EnrollmentOverview fetch error:", err);
        if (!cancelled) {
          setComposition([]);
          setTrend([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [numericRange]);

  const totalActive =
    composition.find((slice) => typeof slice.total === "number")?.total || 0;
  const pieData = composition.filter(
    (slice) => typeof slice.value === "number"
  );

  return (
    <div className="enrollment-overview-container">
      <div className="enrollment-header">
        <h3 className="report-title">Program Enrollment Overview</h3>
        <p className="chart-desc">
          Snapshot of current active composition and {numericRange}-day growth
          trend.
        </p>
      </div>

      <div className="enrollment-dual-card">
        <div className="enrollment-chart composition" ref={pieRef}>
          <h3 className="chart-title">Active Population Composition</h3>
          <p className="chart-subtitle">
            Breakdown of new and ongoing participants (Active only).
          </p>

          <div className="chart-wrapper">
            <PieChart width={pieWidth} height={300}>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="label"
                cx="50%"
                cy="50%"
                innerRadius={80}
                outerRadius={110}
                paddingAngle={3}
              >
                {pieData.map((entry, index) => (
                  <Cell
                    key={entry.label ?? index}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <text
                x="50%"
                y="50%"
                textAnchor="middle"
                dominantBaseline="middle"
                className="donut-center-label"
              >
                {totalActive}
              </text>
              <Tooltip formatter={(value, name) => [`${value}`, name]} />
            </PieChart>
          </div>
        </div>

        <div className="enrollment-chart growth" ref={trendRef}>
          <h3 className="chart-title">
            Active Population Growth ({numericRange} Days)
          </h3>
          <p className="chart-subtitle">
            Trend of total active participants over the selected reporting
            period.
          </p>

          <div className="chart-wrapper">
            <LineChart
              width={trendWidth}
              height={300}
              data={trend}
              margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
            >
              <defs>
                <linearGradient id={GRADIENT_ID} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#19588F" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#19588F" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                strokeOpacity={0.12}
              />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value) => [`${value}`, "Active Patients"]} />
              <Area
                type="monotone"
                dataKey="active"
                fill="url(#activeGradient)"
                stroke="none"
              />
              <Line
                type="monotone"
                dataKey="active"
                stroke="#19588F"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </div>
        </div>
      </div>
    </div>
  );
}
