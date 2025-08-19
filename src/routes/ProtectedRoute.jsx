import React from "react";
import { Navigate } from "react-router-dom";
import { loadSession } from "../store/session";

export default function ProtectedRoute({ children, adminOnly = false }) {
  const session = loadSession();
  if (!session) return <Navigate to="/login" replace />;
  if (adminOnly && session.role !== "ADMIN") return <Navigate to="/orders" replace />;
  return children;
}
