// src/App.jsx
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";

import LoginPage from "./features/auth/Login";
import UsersPage from "./features/users/UsersPage";
import ProtectedRoute from "./routes/ProtectedRoute";
import AppLayout from "./components/layout/AppLayout";
import Home from "./features/home/Home";
import ProfilePage from "./features/profile/ProfilePage";
import ProductsPage from "./features/products/ProductsPage";
import OrdersPage from "./features/orders/OrdersPage";

import ReportsPage from "./features/reports/ReportsPage";
import CashPage from "./features/cash/CashPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Público */}
        <Route path="/login" element={<LoginPage />} />

        {/* Área protegida */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/home" replace />} />
          <Route path="home" element={<Home />} />
          <Route path="orders" element={<OrdersPage />} />

          {/* Solo ADMIN */}
          <Route
            path="users"
            element={
              <ProtectedRoute adminOnly>
                <UsersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="products"
            element={
              <ProtectedRoute adminOnly>
                <ProductsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="reports"
            element={
              <ProtectedRoute adminOnly>
                <ReportsPage />
              </ProtectedRoute>
            }
          />

          {/* Arqueo: visible para cualquier usuario autenticado */}
          <Route
            path="reports/cash"
            element={
              <ProtectedRoute>
                <CashPage />
              </ProtectedRoute>
            }
          />

          <Route path="profile" element={<ProfilePage />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>

      <Toaster richColors expand position="bottom-right" />
    </BrowserRouter>
  );
}
