import React, { useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import {
  UserCircleIcon,
  CheckIcon,
  ArrowPathIcon,
  EyeIcon,
  EyeSlashIcon,
} from "@heroicons/react/24/outline";

const SESSION_KEY = "app_session";
const roleToUi = (r) => (r === "SELLER" ? "CAJERO" : r);

export default function ProfilePage() {
  const session = useMemo(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);
  const [user, setUser] = useState(null);

  // Formularios
  const [form, setForm] = useState({ name: "", username: "" });
  const [pwd, setPwd] = useState({ new_password: "", confirm: "" });
  const [showPwd, setShowPwd] = useState(false);
  const [showPwd2, setShowPwd2] = useState(false);

  useEffect(() => {
    (async () => {
      if (!session?.session_id || !session?.user_id) {
        setLoading(false);
        return;
      }
      try {
        // 👇 clave correcta: userId
        const u = await invoke("get_user_by_id", {
          sessionId: session.session_id,
          userId: session.user_id,
        });
        setUser(u);
        setForm({ name: u.name || "", username: u.username || "" });
      } catch (err) {
        console.error(err);
        toast.error(
          typeof err === "string" ? err : err?.message || "No se pudo cargar el perfil"
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [session]);

  function change(k, v) {
    setForm((s) => ({ ...s, [k]: v }));
  }

  async function saveProfile(e) {
    e.preventDefault();
    if (!form.name || form.name.length < 3) {
      toast.error("El nombre debe tener al menos 3 caracteres.");
      return;
    }
    if (!/^[a-zA-Z0-9_.-]{3,32}$/.test(form.username)) {
      toast.error("Usuario inválido (3–32; letras, números, _ . -).");
      return;
    }

    setSavingProfile(true);
    const tid = toast.loading("Guardando perfil…");
    try {
      // 👇 clave correcta: userId
      await invoke("update_user", {
        sessionId: session.session_id,
        userId: user.id,
        changes: { name: form.name, username: form.username },
      });

      toast.success("Perfil actualizado", { id: tid });

      // refrescar usuario
      const u = await invoke("get_user_by_id", {
        sessionId: session.session_id,
        userId: session.user_id,
      });
      setUser(u);

      // actualiza username en la sesión persistida
      try {
        const newSess = { ...session, username: form.username };
        localStorage.setItem(SESSION_KEY, JSON.stringify(newSess));
      } catch {}
    } catch (err) {
      toast.error(
        typeof err === "string" ? err : err?.message || "No se pudo actualizar",
        { id: tid }
      );
    } finally {
      setSavingProfile(false);
    }
  }

  async function changePassword(e) {
    e.preventDefault();
    if (!pwd.new_password || pwd.new_password.length < 8) {
      toast.error("La nueva contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (pwd.new_password !== pwd.confirm) {
      toast.error("Las contraseñas no coinciden.");
      return;
    }

    setSavingPwd(true);
    const tid = toast.loading("Actualizando contraseña…");
    try {
      // 👇 clave correcta: userId
      await invoke("update_user", {
        sessionId: session.session_id,
        userId: user.id,
        changes: { new_password: pwd.new_password },
      });
      toast.success("Contraseña actualizada", { id: tid });
      setPwd({ new_password: "", confirm: "" });
      setShowPwd(false);
      setShowPwd2(false);
    } catch (err) {
      toast.error(
        typeof err === "string" ? err : err?.message || "No se pudo actualizar la contraseña",
        { id: tid }
      );
    } finally {
      setSavingPwd(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
        Cargando…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
        No se encontró información de perfil.
      </div>
    );
  }

  const uiRole = roleToUi(user.role);

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <UserCircleIcon className="w-12 h-12 text-[#5B2A86]" />
          <div>
            <h1 className="text-2xl font-semibold text-[#2d2d2d]">Mi Perfil</h1>
            <p className="text-gray-600">Gestiona tu información y tu contraseña.</p>
          </div>
        </div>
      </section>

      {/* Datos de cuenta */}
      <section className="grid gap-6 md:grid-cols-2">
        {/* Form Perfil */}
        <form
          onSubmit={saveProfile}
          className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm"
        >
          <h2 className="text-lg font-semibold text-[#2d2d2d] mb-3">Datos de cuenta</h2>
          <div className="grid gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
              <input
                className="w-full bg-gray-100 border border-gray-300 rounded-lg p-2.5 text-base focus:ring-2 focus:ring-[#5B2A86] focus:outline-none"
                placeholder="Tu nombre"
                value={form.name}
                onChange={(e) => change("name", e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Usuario</label>
              <input
                className="w-full bg-gray-100 border border-gray-300 rounded-lg p-2.5 text-base focus:ring-2 focus:ring-[#5B2A86] focus:outline-none"
                placeholder="usuario"
                value={form.username}
                onChange={(e) => change("username", e.target.value)}
              />
            </div>

            {/* Solo lectura / info */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="block text-sm font-medium text-gray-700 mb-1">Rol</span>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    uiRole === "ADMIN"
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-purple-100 text-purple-800"
                  }`}
                >
                  {uiRole}
                </span>
              </div>
              <div>
                <span className="block text-sm font-medium text-gray-700 mb-1">Sucursal</span>
                <span className="text-sm text-gray-800">{user.branch_id || "—"}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="submit"
                disabled={savingProfile}
                className="inline-flex items-center gap-2 bg-[#5B2A86] text-white rounded-lg px-4 py-2 font-semibold hover:bg-[#4b2270] transition-colors"
              >
                <CheckIcon className="w-5 h-5" />
                Guardar cambios
              </button>

              <button
                type="button"
                disabled={savingProfile}
                onClick={() =>
                  setForm({ name: user.name || "", username: user.username || "" })
                }
                className="inline-flex items-center gap-2 border rounded-lg px-4 py-2 text-gray-700 hover:bg-gray-50"
                title="Restablecer"
              >
                <ArrowPathIcon className="w-5 h-5" />
                Restablecer
              </button>
            </div>
          </div>
        </form>

        {/* Cambiar contraseña */}
        <form
          onSubmit={changePassword}
          className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm"
        >
          <h2 className="text-lg font-semibold text-[#2d2d2d] mb-3">Cambiar contraseña</h2>
          <div className="grid gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nueva contraseña
              </label>
              <div className="relative">
                <input
                  type={showPwd ? "text" : "password"}
                  className="w-full bg-gray-100 border border-gray-300 rounded-lg p-2.5 pr-10 text-base focus:ring-2 focus:ring-[#5B2A86] focus:outline-none"
                  placeholder="••••••••"
                  value={pwd.new_password}
                  onChange={(e) =>
                    setPwd((s) => ({ ...s, new_password: e.target.value }))
                  }
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-200"
                  title={showPwd ? "Ocultar" : "Mostrar"}
                >
                  {showPwd ? (
                    <EyeSlashIcon className="w-5 h-5 text-gray-600" />
                  ) : (
                    <EyeIcon className="w-5 h-5 text-gray-600" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirmar contraseña
              </label>
              <div className="relative">
                <input
                  type={showPwd2 ? "text" : "password"}
                  className="w-full bg-gray-100 border border-gray-300 rounded-lg p-2.5 pr-10 text-base focus:ring-2 focus:ring-[#5B2A86] focus:outline-none"
                  placeholder="••••••••"
                  value={pwd.confirm}
                  onChange={(e) => setPwd((s) => ({ ...s, confirm: e.target.value }))}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd2((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-200"
                  title={showPwd2 ? "Ocultar" : "Mostrar"}
                >
                  {showPwd2 ? (
                    <EyeSlashIcon className="w-5 h-5 text-gray-600" />
                  ) : (
                    <EyeIcon className="w-5 h-5 text-gray-600" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="submit"
                disabled={savingPwd}
                className="inline-flex items-center gap-2 bg-[#5B2A86] text-white rounded-lg px-4 py-2 font-semibold hover:bg-[#4b2270] transition-colors"
              >
                <CheckIcon className="w-5 h-5" />
                Actualizar contraseña
              </button>
            </div>
          </div>
        </form>
      </section>
    </div>
  );
}
