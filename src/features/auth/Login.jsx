import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { invoke } from "@tauri-apps/api/core";
import logo from "/public/1000133962.jpg";

const TENANT_ID  = import.meta.env.VITE_TENANT_ID  || "ELTITI1";
const BRANCH_ID  = import.meta.env.VITE_BRANCH_ID  || "SUCURSAL1";
const SESSION_KEY = "app_session";

export default function Login() {
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData(s => ({ ...s, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.username || !formData.password) {
      toast.error("Por favor, ingresa usuario y contraseña.");
      return;
    }

    setLoading(true);
    const tId = toast.loading("Validando credenciales…");

    try {
      const session = await invoke("login", {
        input: {
          username: formData.username,
          password: formData.password,
          tenant_id: TENANT_ID,
          branch_id: BRANCH_ID,
        },
      });

      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      toast.success(`¡Bienvenido, ${session.username}!`, { id: tId });

      if (session.role === "ADMIN") navigate("/home");
      else navigate("/home");
    } catch (error) {
      const msg = typeof error === "string" ? error : error?.message || "Usuario o contraseña incorrectos";
      toast.error(msg, { id: tId });
      console.error("Error al conectar con backend:", error);
    } finally {
      setLoading(false);
      setFormData({ username: "", password: "" });
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-[#f5f5f5] via-[#dbece7] to-[#a6cfc4]">
      <div className="h-[330px] w-80 relative bg-white shadow-2xl rounded-xl">
        <div className="h-1/3 top-0 -translate-y-12 w-full flex justify-center absolute items-center mb-3">
          <img src={logo} alt="Logo El Titi" className="w-40 h-40 rounded-full object-contain" />
        </div>
        <div className="h-full mt-10 p-7 flex flex-col justify-center items-center">
          <form onSubmit={handleSubmit} className="w-full space-y-6">
            <div>
              <label className="block text-[#7D2181] text-base font-bold mb-1">USUARIO:</label>
              <Input
                name="username"
                placeholder="Ingrese su usuario"
                value={formData.username}
                onChange={handleChange}
                className="bg-gray-100 border border-[#7D2181]/40 focus:ring-2 focus:ring-[#76D728]"
                autoComplete="username"
              />

              <label className="block text-[#7D2181] text-base font-bold mb-1 mt-3">CONTRASEÑA:</label>
              <Input
                type="password"
                name="password"
                placeholder="Ingrese su contraseña"
                value={formData.password}
                onChange={handleChange}
                className="bg-gray-100 border border-[#7D2181]/40 focus:ring-2 focus:ring-[#76D728]"
                autoComplete="current-password"
              />
            </div>

            <Button className="bg-[#76D728] text-slate-100 w-full font-bold hover:bg-[#5BAA1D] transition-all duration-300 mb-1 mt-2" type="submit" disabled={loading}>
              {loading ? "Ingresando…" : "INGRESAR"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
