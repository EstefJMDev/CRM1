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
      setError("Las contrasenas no coinciden");
      return;
    }

    if (formData.password.length < 6) {
      setError("La contrasena debe tener al menos 6 caracteres");
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
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Error en el registro");
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      router.push("/dashboard");
    } catch (err) {
      setError("Error de conexion");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-8">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-4">Registro inicial</h1>
        <p className="text-sm text-gray-500 text-center mb-6">Solo disponible para crear el primer Super Admin.</p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input id="name" type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Nombre" required className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
          <input id="lastName" type="text" name="lastName" value={formData.lastName} onChange={handleChange} placeholder="Apellidos" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
          <input id="email" type="email" name="email" value={formData.email} onChange={handleChange} placeholder="tu@email.com" required className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
          <input id="password" type="password" name="password" value={formData.password} onChange={handleChange} placeholder="Contrasena" required className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
          <input id="confirmPassword" type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} placeholder="Confirmar contrasena" required className="w-full px-4 py-2 border border-gray-300 rounded-lg" />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 rounded-lg transition duration-200"
          >
            {loading ? "Registrando..." : "Crear Super Admin"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link href="/auth/login" className="text-blue-600 hover:text-blue-700 font-medium text-sm">
            Volver al login
          </Link>
        </div>
      </div>
    </div>
  );
}
