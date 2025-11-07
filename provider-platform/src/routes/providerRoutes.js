// src/routes/providerRoutes.js
// HeartLink Provider Platform — Client Routing Map (React Router v6)

import DashboardOverview from "../pages/DashboardOverview.jsx";
import PatientsPage from "../pages/PatientsPage.jsx";
import ReportsPage from "../pages/ReportsPage.jsx";
import SettingsPage from "../pages/SettingsPage.jsx";
import NotFoundPage from "../pages/NotFoundPage.jsx";

export const providerRoutes = [
  {
    path: "/",
    element: <DashboardOverview />,
  },
  {
    path: "/patients",
    element: <PatientsPage />,
  },
  {
    path: "/reports",
    element: <ReportsPage />,
  },
  {
    path: "/settings",
    element: <SettingsPage />,
  },
  {
    path: "*",
    element: <NotFoundPage />,
  },
];
