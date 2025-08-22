// src/features/reports/ReportsPage.jsx
import React from "react";
import ExpensesPanel from "./ExpensesPanel";

export default function ReportsPage() {
  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-semibold text-[#2d2d2d]">Reportes</h1>
      <ExpensesPanel />
    </div>
  );
}
