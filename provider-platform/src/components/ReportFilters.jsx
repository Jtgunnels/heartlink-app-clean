// HeartLink Provider Platform — ReportFilters (Final Layout Version)
// Centered, responsive control bar beneath KPI grid for time range, category, and search.

import React from "react";
import "./ReportFilters.css";

export default function ReportFilters({
  dateRange,
  setDateRange,
  category,
  setCategory,
  searchQuery,
  setSearchQuery,
}) {
  return (
    <div className="report-filters centered-filters">
      {/* === Time Range Selector === */}
      <div className="filter-group">
        <label htmlFor="dateRange" className="filter-label">
          Time Range
        </label>
        <select
          id="dateRange"
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="filter-select"
        >
          <option value="7">Last 7 Days</option>
          <option value="30">Last 30 Days</option>
          <option value="90">Last 90 Days</option>
          <option value="custom">Custom Range</option>
        </select>
      </div>

      {/* === Category Selector === */}
      <div className="filter-group">
        <label htmlFor="category" className="filter-label">
          Category
        </label>
        <select
          id="category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="filter-select"
        >
          <option value="All">All Categories</option>
          <option value="Green">Stable</option>
          <option value="Yellow">Mild</option>
          <option value="Orange">Moderate</option>
          <option value="Red">Severe</option>
        </select>
      </div>

      {/* === Search Field === */}
      <div className="filter-group search-group">
        <label htmlFor="search" className="filter-label">
          Search
        </label>
        <input
          id="search"
          type="text"
          placeholder="Search by patient or ID"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="filter-search"
        />
      </div>
    </div>
  );
}
