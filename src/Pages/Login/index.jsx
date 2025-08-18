import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import imgHolaBebe from '/public/HolaBebeHD-removebg-preview.png';

import { toast } from "sonner";
import { invoke } from "@tauri-apps/api/core";

export default function Login() {
  const [formData, setFormData] = useState({ username: "", password: "" });
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try{
      const success = await invoke("login_user", {
        data: {
          username: formData.username,
          password: formData.password
        }
      });

      console.log(success)

      if (success) {
        toast.success("Inicio de sesión exitoso");
        navigate("/app")
      } else {
        toast.error("Usuario o contraseña incorrectos");
      }
    } catch (error) {
      console.log(error)
      console.error("Error al conectar con backend:", error);
      toast.error(error);
    }

    setFormData({ username: "", password: "" });
  };


  return (
    <div className="flex justify-center bg-[#5dc2d0] min-h-screen items-center">
      <div className="h-[400px] w-80 p-7 bg-[#DE72A4] shadow-2xl rounded-lg">
        <div className="h-1/3 relative">
            <div className="bottom-0 transform -translate-x-2 absolute">
              <img src={imgHolaBebe}/>
            </div>
        </div>
        <div className="h-2/3 flex flex-col">
          <form onSubmit={handleSubmit} className="w-full space-y-6">
            <div className="mb-1">
              <label className="block text-white text-sm font-bold mb-1">USUARIO:</label>
              <Input
                name="username"
                placeholder="Ingrese su usuario"
                value={formData.username}
                onChange={handleChange}
                className="bg-white"
              />

              <label className="block text-sm  font-bold text-white mb-1 mt-3">CONTRASEÑA:</label>
              <Input
                type="password"
                name="password"
                placeholder="Ingrese su contraseña"
                value={formData.password}
                onChange={handleChange}
                className="bg-white"
              />
            </div>
            <Button className="bg-[#138c9a] w-full hover:bg-[#00525f] mb-1 mt-2" type="submit">
              INGRESAR
            </Button>
            <div className="mb-2 flex justify-center hover:text-slate-300 transition-all duration-300 text-white w-full items-center">
              <Link className="underline" to="/">¿Olvidaste la contraseña?</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
