import { useState } from "react";
import { Link, Outlet } from "react-router-dom";
import "./App.css";
import Navbar from "./components/NavBar";

// Datos de secciones con subrutas
const sections = [
  {
    title: "Productos",
    icon: "M144.8 17c-11.3-17.8-37.2-22.8-54-9.4C35.3 51.9 0 118 0 192h256zM496 96h-48c-35.3 0-64 28.7-64 64v64H0c0 50.6 23 96.4 60.3 130.7C25.7 363.6 0 394.7 0 432c0 44.2 35.8 80 80 80s80-35.8 80-80c0-8.9-1.8-17.2-4.4-25.2c21.6 5.9 44.6 9.2 68.4 9.2s46.9-3.3 68.4-9.2c-2.7 8-4.4 16.3-4.4 25.2c0 44.2 35.8 80 80 80s80-35.8 80-80c0-37.3-25.7-68.4-60.3-77.3C425 320.4 448 274.6 448 224v-64h48c8.8 0 16-7.2 16-16v-32c0-8.8-7.2-16-16-16M80 464c-17.6 0-32-14.4-32-32s14.4-32 32-32s32 14.4 32 32s-14.4 32-32 32m320-32c0 17.6-14.4 32-32 32s-32-14.4-32-32s14.4-32 32-32s32 14.4 32 32",
    links: [
      { label: "Ver Productos", to: "/app/productos" },
      { label: "Nuevo Producto", to: "/app/productos/create" },
    ],
  },
  {
    title: "Usuarios",
    icon: "M112 48a48 48 0 1 1 96 0a48 48 0 1 1-96 0m40 304v128c0 17.7-14.3 32-32 32s-32-14.3-32-32V256.9l-28.6 47.6c-9.1 15.1-28.8 20-43.9 10.9s-20-28.8-10.9-43.9l58.3-97c17.4-28.9 48.6-46.6 82.3-46.6h29.7c33.7 0 64.9 17.7 82.3 46.6l58.3 97c9.1 15.1 4.2 34.8-10.9 43.9s-34.8 4.2-43.9-10.9L232 256.9V480c0 17.7-14.3 32-32 32s-32-14.3-32-32V352z",
    links: [
      { label: "Ver Usuarios", to: "/app/usuarios" },
      { label: "Nuevo Usuario", to: "/app/usuarios/create" }
    ],
  },
];

const Card = ({ title, links, icon }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <button onClick={() => setIsOpen(!isOpen)} className="w-full text-left">
      <div className="flex justify-between items-center w-full bg-white p-4 hover:scale-[101%] rounded shadow">
        <div className="flex items-center gap-3">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-300 ${isOpen ? "rotate-0" : "-rotate-90"}`}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
          <p className="text-lg font-semibold">{title}</p>
        </div>

        {/* Icono derecho */}
        <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 512 512">
          <path fill="currentColor" d={icon} />
        </svg>
      </div>

      {/* Subenlaces colapsables */}
      <div className={`overflow-hidden mt-2  transition-all duration-500 ease-in-out ${isOpen ? "max-h-40" : "max-h-0"}`}>
        <ul className="space-y-1 py-2 w-full">
          {links.map((link, idx) => (
            <li key={idx} className="bg-[#f5a9cb] hover:bg-[#b14d75] rounded-xs text-center">
              <Link to={link.to} className="block w-full  py-1">
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </button>
  );
};


function App() {
  return (
    <div className="h-screen flex flex-col">
      <Navbar />
      <div className="flex flex-1 min-h-0">
        <div className="w-3/12 bg-[#a6d4ca] p-4">
          {sections.map((section, index) => (
            <Card key={index} title={section.title} links={section.links} icon={section.icon} />
          ))}
        </div>
        <div className="flex-1 overflow-y-auto min-h-0 scrollbar-custom">
          <Outlet/>
        </div>
      </div>
    </div>
  );
}

export default App;
