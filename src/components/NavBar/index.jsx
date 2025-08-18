import { Button } from "../ui/button";
import { Link, useNavigate } from "react-router-dom";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Avatar, AvatarFallback } from "../ui/Avatar";

export default function Navbar() {
  const [user, setUser] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    const handleUser = async () => {
      try {
        const current_user = await invoke("get_current_user");

        if (current_user) setUser(current_user);
      } catch (error) {
        console.error("Error al obtener usuario:", error);
      }
    };

    handleUser();
  }, []);

  const handleLogout = async () => {
    try {
      await invoke("logout_user");
      navigate("/");
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  return (
    <div className="bg-[#308382] py-3 px-2 grid grid-cols-2 shadow-xl text-white items-center">
      <div className="w-full">
        <Link to={"/app"} className="font-bold hover:text-slate-300">ANÁLISIS DE VENTAS</Link>
      </div>
      <div className="flex justify-end items-center mr-4">
        <div className="">
            <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button className="py-7 cursor-pointer">
                <Avatar>
                    <AvatarFallback className="text-black">
                        <svg xmlns="http://www.w3.org/2000/svg"  viewBox="0 0 24 24" fill="currentColor" className="w-12 h-12" ><path d="M12 4a4 4 0 0 1 4 4a4 4 0 0 1-4 4a4 4 0 0 1-4-4a4 4 0 0 1 4-4m0 10c4.42 0 8 1.79 8 4v2H4v-2c0-2.21 3.58-4 8-4" /></svg>
                    </AvatarFallback>
                    </Avatar>
                    {user.name ? `${user.name} ${user.lastname}` : "Cargando..."}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="p-3 mr-4 w-56">
                <DropdownMenuLabel>Mi cuenta</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>Cerrar sesión</DropdownMenuItem>
            </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
