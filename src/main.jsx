import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { createHashRouter, RouterProvider } from "react-router-dom";
import Login from "./Pages/Login";
import { Toaster } from "sonner";
import Product from "./Pages/Products";
import Home from "./Pages/Home";
import User from "./Pages/Users";
import NewProduct from "./Pages/Products/new";
import NewUser from "./Pages/Users/new";

const AppRouter = () => {
  const router = createHashRouter([
    {
      path: "/",
      element:<Login/>,
    },
    {
      path: "/app",
      element: <App/>,
      children: [
        {
          path: "",
          element:<Home/>,
        },
        {
          path: "productos",
          element:<Product/>,
        },
        {
          path: "productos/create",
          element:<NewProduct/>,
        }, 
        {
          path: "usuarios",
          element:<User/>,
        },
        {
          path: "usuarios/create",
          element:<NewUser/>,
        },
      ]
    }
  ])

  return(
    <>
      <RouterProvider router={router} />
      <Toaster richColors position="bottom-right"/>
    </>

  )
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AppRouter/>
  </React.StrictMode>,
);
