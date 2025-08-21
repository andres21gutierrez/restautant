import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, NavLink } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/Avatar";

import logo from "/public/1000133962.jpg";

const roleToUi = (r) => (r === "SELLER" ? "CAJERO" : r);

const SESSION_KEY = "app_session";

export default function Navbar() {
  const [session, setSession] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      setSession(raw ? JSON.parse(raw) : null);
    } catch {
      setSession(null);
    }
  }, [location.pathname]);

  const isAdmin = useMemo(() => session?.role === "ADMIN", [session]);

  async function handleLogout() {
    const tid = toast.loading("Cerrando sesión…");
    try {
      if (session?.session_id) {
        await invoke("logout", { sessionId: session.session_id });
      }
      localStorage.removeItem(SESSION_KEY);
      toast.success("Sesión cerrada", { id: tid });
      navigate("/login");
    } catch (err) {
      const msg = typeof err === "string" ? err : err?.message || "No se pudo cerrar sesión";
      toast.error(msg, { id: tid });
      console.error("logout error:", err);
    }
  }

  return (
    <header className="sticky top-0 z-40 shadow-md">
      <div className="bg-[#5B2A86]">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between py-4 text-white">

            <div className="flex items-center gap-4">
              <Link to="/home" className="shrink-0 hover:opacity-90">
                <img
                  src={logo}
                  alt="Logo"
                  className="w-14 h-14 rounded-full object-cover ring-2 ring-white/20"
                />
              </Link>
              <span className="text-2xl font-bold tracking-wide">El Titi Wings</span>
            </div>

            {/* Navegación */}
            {session && (
              <nav className="hidden md:flex items-center gap-6 text-lg">
                <NavLink
                  to="/orders"
                  className={({ isActive }) =>
                    `px-3 py-1.5 rounded transition-colors ${
                      isActive ? "bg-white/10 font-semibold" : "hover:bg-white/10"
                    }`
                  }
                >
                  Pedidos
                </NavLink>
                {isAdmin && (
                  <NavLink
                  to="/products"
                  className={({ isActive }) =>
                    `px-3 py-1.5 rounded transition-colors ${
                      isActive ? "bg-white/10 font-semibold" : "hover:bg-white/10"
                    }`
                  }
                >
                  Productos
                </NavLink>
                )}
                {isAdmin && (
                  <NavLink
                    to="/users"
                    className={({ isActive }) =>
                      `px-3 py-1.5 rounded transition-colors ${
                        isActive ? "bg-white/10 font-semibold" : "hover:bg-white/10"
                      }`
                    }
                  >
                    Usuarios
                  </NavLink>
                )}
              </nav>
            )}

            {/* Usuario / sesión */}
            <div className="flex items-center gap-3">
              {!session ? (
                <Link to="/login">
                  <Button className="bg-white text-[#5B2A86] hover:bg-white/90 text-lg px-5 py-2">
                    Iniciar sesión
                  </Button>
                </Link>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="success"
                      className="text-white cursor-pointer hover:bg-white/10 flex items-center gap-3 px-3 py-7 text-lg"
                    >
                      <Avatar>
                        <AvatarFallback className="text-black bg-gray-200">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                            fill="currentColor" className="w-8 h-8">
                            <path d="M12 4a4 4 0 0 1 4 4a4 4 0 0 1-4 4a4 4 0 0 1-4-4a4 4 0 0 1 4-4m0 10c4.42 0 8 1.79 8 4v2H4v-2c0-2.21 3.58-4 8-4" />
                          </svg>
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-left leading-tight">
                        <span className="block font-semibold">{session.username}</span>
                        <span className="block text-sm opacity-90">
                          <RoleBadge role={session.role} /> — {session.branch_id}
                        </span>
                      </span>
                    </Button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent className="p-2 mr-2 w-64 text-base">
                    <DropdownMenuLabel>Mi cuenta</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/profile">Perfil</Link>
                    </DropdownMenuItem>
                    {isAdmin && (
                      <DropdownMenuItem asChild>
                        <Link to="/users">Administrar usuarios</Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-red-600" onClick={handleLogout}>
                      Cerrar sesión
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="h-[4px] bg-[#43226B]" />
    </header>
  );
}

function RoleBadge({ role }) {
  const ui = roleToUi(role);
  if (role === "ADMIN") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] bg-emerald-100 text-emerald-800">
        {ui}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] bg-purple-100 text-purple-800">
      {ui}
    </span>
  );
}
