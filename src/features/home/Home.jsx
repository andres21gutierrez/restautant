import React from "react";
import { Link } from "react-router-dom";
import { loadSession } from "../../store/session";
import {
  ShoppingCart,
  Package,
  Users as UsersIcon,
  BarChart3,
  Wallet,
} from "lucide-react";

// ----- Permisos por rol (fallback si no usas session.permissions) -----
const ROLE_PERMS = {
  ADMIN:  ["orders", "products", "users", "reports", "cash"],
  SELLER: ["orders", "cash"],
};

function can(session, feature) {
  // 1) Permisos finos si existen
  if (Array.isArray(session?.permissions)) {
    return session.permissions.includes(feature);
  }
  // 2) Fallback por rol
  const r = session?.role;
  return ROLE_PERMS[r]?.includes(feature) ?? false;
}

const CARDS = [
  {
    key: "orders",
    to: "/orders",
    title: "Pedidos",
    cta: "Abrir módulo",
    Icon: ShoppingCart,
    accent: "from-emerald-500/20 to-emerald-500/0",
  },
  {
    key: "products",
    to: "/products",
    title: "Productos",
    cta: "Abrir módulo",
    Icon: Package,
    accent: "from-sky-500/20 to-sky-500/0",
  },
  {
    key: "users",
    to: "/users",
    title: "Usuarios",
    cta: "Abrir módulo",
    Icon: UsersIcon,
    accent: "from-amber-500/20 to-amber-500/0",
  },
  {
    key: "reports",
    to: "/reports",
    title: "Reportes",
    cta: "Ver reportes",
    Icon: BarChart3,
    accent: "from-fuchsia-500/20 to-fuchsia-500/0",
  },
  {
    key: "cash",
    to: "/reports/cash",
    title: "Arqueo",
    cta: "Abrir arqueo",
    Icon: Wallet,
    accent: "from-purple-500/20 to-purple-500/0",
  },
];

export default function Home() {
  const session = loadSession();

  const visibleCards = CARDS.filter(card => can(session, card.key));

  return (
    <div className="space-y-6">
      {/* Atajos rápidos */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visibleCards.map(({ key, to, title, cta, Icon, accent }) => (
          <Link
            key={key}
            to={to}
            className="group relative bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5"
          >
            {/* Sutil acento con gradiente */}
            <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${accent} opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity`} />

            <div className="relative flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-[#2d2d2d]">{title}</h3>
                <p className="text-sm text-gray-500">Acceso rápido</p>
              </div>
              <div className="shrink-0">
                <div className="rounded-xl p-2 bg-white/70 ring-1 ring-black/5 group-hover:ring-black/10 transition">
                  <Icon className="w-6 h-6 text-[#5B2A86]" />
                </div>
              </div>
            </div>

            <div className="mt-4 inline-flex items-center rounded-lg bg-[#5B2A86] text-white px-3 py-1.5 text-sm group-hover:bg-[#4b2270]">
              {cta}
              <span className="ml-2 opacity-90 group-hover:translate-x-0.5 transition-transform">→</span>
            </div>
          </Link>
        ))}
      </section>

      {visibleCards.length === 0 && (
        <div className="text-center text-gray-500 py-16 bg-white rounded-2xl border">
          No tienes módulos habilitados. Contacta al administrador.
        </div>
      )}
    </div>
  );
}
