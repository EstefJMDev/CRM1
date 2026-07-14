"use client";

import { useState, FormEvent, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface FormData {
  email: string;
  password: string;
  name: string;
  lastName: string;
  confirmPassword: string;
  setupToken: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState<FormData>({
    email: "",
    password: "",
    name: "",
    lastName: "",
    confirmPassword: "",
    setupToken: "",
  });

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    if (formData.password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          name: formData.name,
          lastName: formData.lastName,
          setupToken: formData.setupToken,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "No se pudo completar el registro");
        return;
      }

      router.push("/dashboard");
    } catch (err) {
      setError("Error de conexión");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell flex items-center justify-center p-4">
      <div className="app-card w-full max-w-md p-8 slide-up">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-4">Registro inicial</h1>
        <p className="text-sm text-gray-500 text-center mb-6">Solo disponible para crear el primer Super Admin.</p>

        {error && (
          <div className="alert alert-error mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input id="name" type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Nombre" required className="field-input" />
          <input id="lastName" type="text" name="lastName" value={formData.lastName} onChange={handleChange} placeholder="Apellidos" className="field-input" />
          <input id="email" type="email" name="email" value={formData.email} onChange={handleChange} placeholder="tu@email.com" required className="field-input" />
          <input id="setupToken" type="text" name="setupToken" value={formData.setupToken} onChange={handleChange} placeholder="Token de configuración inicial (opcional)" className="field-input" />
          <input id="password" type="password" name="password" value={formData.password} onChange={handleChange} placeholder="Contraseña" required className="field-input" />
          <input id="confirmPassword" type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} placeholder="Confirmar contraseña" required className="field-input" />

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {loading ? "Registrando..." : "Crear Super Admin"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link href="/auth/login" className="link-accent font-medium text-sm">
            Volver al login
          </Link>
        </div>
      </div>
    </div>
  );
}




