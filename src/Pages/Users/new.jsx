import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";

export default function NewUser() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    lastname: "",
    ci: "",
    email: "",
    celular: "",
    username: "",
    password: "",
    rol: "1",      // ajústalo a tu modelo (u64 en tu backend)
    photo: "",     // si quieres guardar URL
    active: true,
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const palette = {
    "--hb-primary": "#19C1BE",
    "--hb-secondary": "#F27AB0",
    "--hb-success": "#71C562",
    "--hb-info": "#1C7F95",
    "--hb-accent": "#A64AC9",
    "--hb-warn": "#FF6F61",
  };

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };

  const validate = () => {
    if (!form.name.trim()) return "Nombre es requerido.";
    if (!form.lastname.trim()) return "Apellido es requerido.";
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) return "Email inválido.";
    if (!form.username.trim()) return "Usuario es requerido.";
    if (!form.password || form.password.length < 6) return "Password mínimo 6 caracteres.";
    return "";
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const v = validate();
    if (v) return setError(v);
    setError("");
    setSaving(true);

    try {
      // OJO: Mapea a los nombres esperados por tu comando create_user
      // Si usas el create_user que te pasé antes con nombres en español:
      // { nombre, apPaterno, ci, email, celular, usuario, password, cargo, photoUrl, active }
      await invoke("create_user", {
        payload: {
          nombre: form.name,
          apPaterno: form.lastname,
          ci: form.ci,
          email: form.email,
          celular: form.celular,
          usuario: form.username,
          password: form.password,
          cargo: String(form.rol),      // si tu backend espera String; si espera u64, convierte en backend
          photoUrl: form.photo || null, // si tu backend guarda photo_url; si guarda "photo", ajusta el campo
          active: !!form.active,
        },
      });

      navigate("/users"); // volver a la lista al crear
    } catch (err) {
      console.error(err);
      setError(err?.toString?.() || "Error al crear usuario");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-full w-full px-6 py-6" style={palette}>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--hb-info)" }}>
          Nuevo Usuario
        </h1>
        <button
          type="button"
          onClick={() => navigate("/app/usuarios")}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          <ArrowLeftIcon className="h-5 w-5" />
          Volver a la lista
        </button>
      </div>

      {/* Formulario */}
      <form
        onSubmit={onSubmit}
        className="mx-auto w-full max-w-3xl rounded-2xl border border-gray-200 bg-white p-5 shadow"
      >
        {error ? (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-inset ring-red-200">
            {error}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Nombre" name="name" value={form.name} onChange={onChange} />
          <Field label="Apellido" name="lastname" value={form.lastname} onChange={onChange} />
          <Field label="C.I." name="ci" value={form.ci} onChange={onChange} />
          <Field label="Email" type="email" name="email" value={form.email} onChange={onChange} />
          <Field label="Celular" name="celular" value={form.celular} onChange={onChange} />
          <Field label="Usuario" name="username" value={form.username} onChange={onChange} />
          <Field label="Contraseña" type="password" name="password" value={form.password} onChange={onChange} />
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Rol</label>
            <select
              name="rol"
              value={form.rol}
              onChange={onChange}
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-[var(--hb-primary)] focus:outline-none focus:ring-1"
            >
              <option value="1">1 (Admin)</option>
              <option value="2">2 (Vendedor)</option>
              <option value="3">3 (Usuario)</option>
            </select>
          </div>

          <Field label="Foto (URL)" name="photo" value={form.photo} onChange={onChange} />
          <div className="flex items-center gap-2">
            <input
              id="active"
              name="active"
              type="checkbox"
              checked={form.active}
              onChange={onChange}
              className="h-4 w-4 rounded border-gray-300 text-[var(--hb-primary)] focus:ring-[var(--hb-primary)]"
            />
            <label htmlFor="active" className="text-sm text-gray-700">
              Activo
            </label>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate("/app/usuarios")}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow disabled:opacity-50"
            style={{ backgroundColor: "var(--hb-secondary)" }}
          >
            {saving ? "Guardando…" : "Crear usuario"}
          </button>
        </div>
      </form>
    </div>
  );
}

/* Input reutilizable */
function Field({ label, name, value, onChange, type = "text" }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-[var(--hb-primary)] focus:outline-none focus:ring-1"
      />
    </div>
  );
}
