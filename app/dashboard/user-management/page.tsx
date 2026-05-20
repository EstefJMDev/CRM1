"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type AppUser = {
  id: string;
  name: string;
  lastName?: string | null;
  email: string;
  role: "SUPER_ADMIN" | "TENANT_ADMIN" | "ADMIN" | "USER";
  mustChangePassword?: boolean;
  isActive?: boolean;
};

type ManagedUser = {
  id: string;
  name: string;
  lastName?: string | null;
  email: string;
  role: "SUPER_ADMIN" | "TENANT_ADMIN" | "ADMIN" | "USER";
  mustChangePassword: boolean;
  isActive: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
};

export default function UserManagementPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [profileForm, setProfileForm] = useState({ name: "", lastName: "", email: "" });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [newUserForm, setNewUserForm] = useState({ name: "", lastName: "", email: "", temporaryPassword: "", role: "USER" });
  const [resetPasswords, setResetPasswords] = useState<Record<string, string>>({});
  const [editUsers, setEditUsers] = useState<Record<string, { name: string; lastName: string; email: string; role: string; isActive: boolean }>>({});

  const isSuperAdmin = currentUser?.role === "SUPER_ADMIN";
  const mustChangePassword = Boolean(currentUser?.mustChangePassword);

  const sortedUsers = useMemo(
    () => [...users].sort((a, b) => Number(new Date(b.createdAt)) - Number(new Date(a.createdAt))),
    [users]
  );

  const mapEditState = (list: ManagedUser[]) => {
    const next: Record<string, { name: string; lastName: string; email: string; role: string; isActive: boolean }> = {};
    for (const user of list) {
      next[user.id] = {
        name: user.name || "",
        lastName: user.lastName || "",
        email: user.email || "",
        role: user.role,
        isActive: Boolean(user.isActive),
      };
    }
    setEditUsers(next);
  };

  useEffect(() => {
    const localToken = localStorage.getItem("token") || "";
    const localUser = localStorage.getItem("user");

    if (!localToken || !localUser) {
      router.push("/auth/login");
      return;
    }

    const parsedUser = JSON.parse(localUser) as AppUser;
    setToken(localToken);
    setCurrentUser(parsedUser);
    setProfileForm({
      name: parsedUser.name || "",
      lastName: parsedUser.lastName || "",
      email: parsedUser.email || "",
    });

    const loadUsers = async () => {
      if (parsedUser.role !== "SUPER_ADMIN") {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch("/api/users", {
          headers: { Authorization: `Bearer ${localToken}` },
        });
        if (!response.ok) throw new Error("No se pudo cargar usuarios");
        const data = (await response.json()) as ManagedUser[];
        setUsers(data);
        mapEditState(data);
      } catch (loadError) {
        console.error(loadError);
        setError("No se pudo cargar la lista de usuarios");
      } finally {
        setLoading(false);
      }
    };

    void loadUsers();
  }, [router]);

  const refreshUsers = async () => {
    if (!isSuperAdmin || !token) return;
    const response = await fetch("/api/users", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return;
    const data = (await response.json()) as ManagedUser[];
    setUsers(data);
    mapEditState(data);
  };

  const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    const response = await fetch("/api/users/me", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(profileForm),
    });

    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "No se pudo actualizar el perfil");
      return;
    }

    const mergedUser = { ...currentUser, ...data } as AppUser;
    setCurrentUser(mergedUser);
    localStorage.setItem("user", JSON.stringify(mergedUser));
    setSuccess("Perfil actualizado");
  };

  const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError("Las contrasenas no coinciden");
      return;
    }

    const response = await fetch("/api/users/me/password", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "No se pudo cambiar la contrasena");
      return;
    }

    setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    const mergedUser = { ...currentUser, mustChangePassword: false } as AppUser;
    setCurrentUser(mergedUser);
    localStorage.setItem("user", JSON.stringify(mergedUser));
    setSuccess("Contrasena actualizada");
  };

  const handleCreateUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    const response = await fetch("/api/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(newUserForm),
    });

    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "No se pudo crear el usuario");
      return;
    }

    setNewUserForm({ name: "", lastName: "", email: "", temporaryPassword: "", role: "USER" });
    setSuccess("Usuario creado con contrasena temporal");
    await refreshUsers();
  };

  const handleResetPassword = async (userId: string) => {
    const temporaryPassword = String(resetPasswords[userId] || "");
    if (temporaryPassword.length < 6) {
      setError("La contrasena temporal debe tener al menos 6 caracteres");
      return;
    }

    setError("");
    setSuccess("");

    const response = await fetch(`/api/users/${userId}/reset-password`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ temporaryPassword }),
    });

    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "No se pudo resetear la contrasena");
      return;
    }

    setResetPasswords((prev) => ({ ...prev, [userId]: "" }));
    setSuccess("Contrasena temporal aplicada");
    await refreshUsers();
  };

  const handleUpdateUser = async (userId: string) => {
    const editable = editUsers[userId];
    if (!editable) return;

    setError("");
    setSuccess("");

    const response = await fetch(`/api/users/${userId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(editable),
    });

    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "No se pudo actualizar el usuario");
      return;
    }

    setSuccess("Usuario actualizado");
    await refreshUsers();
  };

  if (loading) {
    return <div className="min-h-screen bg-gray-100 flex items-center justify-center text-gray-600">Cargando...</div>;
  }

  if (mustChangePassword) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.20),_transparent_35%),linear-gradient(180deg,#eef4ff_0%,#f7f9fc_45%,#eef2f7_100%)]">
        <header className="bg-white/80 backdrop-blur-sm border-b border-white/60">
          <div className="max-w-[96vw] mx-auto px-3 sm:px-4 lg:px-5 py-4 flex justify-between items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Gestion de Usuario</h1>
              <p className="text-sm text-gray-600">{currentUser?.name} {currentUser?.lastName || ""}</p>
            </div>
            <Link href="/dashboard" className="bg-gray-700 hover:bg-gray-800 text-white font-medium py-2 px-4 rounded-lg">
              Volver al dashboard
            </Link>
          </div>
        </header>

        <main className="max-w-[96vw] mx-auto px-3 sm:px-4 lg:px-5 py-10">
          {error && <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}
          {success && <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">{success}</div>}

          <div className="mx-auto max-w-2xl">
            <section className="overflow-hidden rounded-[28px] border border-white/70 bg-white shadow-[0_28px_80px_rgba(15,23,42,0.10)]">
              <div className="border-b border-blue-100 bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_55%,#60a5fa_100%)] px-8 py-8 text-white">
                <div className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em]">
                  Seguridad de acceso
                </div>
                <h2 className="mt-4 text-3xl font-bold tracking-tight">Cambia tu contrasena temporal</h2>
                <p className="mt-3 max-w-xl text-sm leading-6 text-blue-50">
                  Tu cuenta ha sido restablecida por un administrador. Antes de continuar, define una nueva contrasena para proteger tu acceso.
                </p>
              </div>

              <div className="grid gap-8 px-8 py-8 md:grid-cols-[1.1fr_0.9fr]">
                <div className="space-y-4">
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-amber-900">
                    <p className="text-sm font-medium">Cambio obligatorio antes de continuar</p>
                    <p className="mt-1 text-sm text-amber-800">
                      Cuando guardes la nueva contrasena, volveras a tener acceso completo a la plataforma.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Cuenta</p>
                    <p className="mt-2 text-lg font-semibold text-gray-900">{currentUser?.name} {currentUser?.lastName || ""}</p>
                    <p className="text-sm text-gray-600">{currentUser?.email}</p>
                  </div>
                </div>

                <form className="space-y-4" onSubmit={handlePasswordSubmit}>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">Nueva contrasena</label>
                    <input
                      className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-gray-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                      type="password"
                      placeholder="Escribe tu nueva contrasena"
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">Confirmar contrasena</label>
                    <input
                      className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-gray-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                      type="password"
                      placeholder="Repite la nueva contrasena"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                    />
                  </div>

                  <button
                    className="w-full rounded-2xl bg-blue-600 px-4 py-3 font-medium text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700"
                    type="submit"
                  >
                    Guardar nueva contrasena
                  </button>
                </form>
              </div>
            </section>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-[96vw] mx-auto px-3 sm:px-4 lg:px-5 py-4 flex justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestion de Usuario</h1>
            <p className="text-sm text-gray-600">Administra tu perfil y el acceso de los usuarios</p>
          </div>
          <Link href="/dashboard" className="bg-gray-700 hover:bg-gray-800 text-white font-medium py-2 px-4 rounded-lg">
            Volver al dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-[96vw] mx-auto px-3 sm:px-4 lg:px-5 py-8 space-y-6">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}
        {success && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">{success}</div>}

        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Datos personales</h2>
          <form className="grid md:grid-cols-3 gap-4" onSubmit={handleProfileSubmit}>
            <input className="px-3 py-2 border border-gray-300 rounded-lg" placeholder="Nombre" value={profileForm.name} onChange={(e) => setProfileForm((prev) => ({ ...prev, name: e.target.value }))} />
            <input className="px-3 py-2 border border-gray-300 rounded-lg" placeholder="Apellidos" value={profileForm.lastName} onChange={(e) => setProfileForm((prev) => ({ ...prev, lastName: e.target.value }))} />
            <input className="px-3 py-2 border border-gray-300 rounded-lg" placeholder="Email" type="email" value={profileForm.email} onChange={(e) => setProfileForm((prev) => ({ ...prev, email: e.target.value }))} />
            <div className="md:col-span-3">
              <button className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg" type="submit">Guardar perfil</button>
            </div>
          </form>
        </section>

        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Cambiar contrasena</h2>
          <form className="grid md:grid-cols-3 gap-4" onSubmit={handlePasswordSubmit}>
            {!mustChangePassword && (
              <input
                className="px-3 py-2 border border-gray-300 rounded-lg"
                type="password"
                placeholder="Contrasena actual"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
              />
            )}
            <input className="px-3 py-2 border border-gray-300 rounded-lg" type="password" placeholder="Nueva contrasena" value={passwordForm.newPassword} onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))} />
            <input className="px-3 py-2 border border-gray-300 rounded-lg" type="password" placeholder="Confirmar nueva contrasena" value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))} />
            <div className="md:col-span-3">
              <button className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg" type="submit">Actualizar contrasena</button>
            </div>
          </form>
        </section>

        {isSuperAdmin && !mustChangePassword && (
          <>
            <section className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Crear usuario</h2>
              <form className="grid md:grid-cols-5 gap-4" onSubmit={handleCreateUser}>
                <input className="px-3 py-2 border border-gray-300 rounded-lg" placeholder="Nombre" value={newUserForm.name} onChange={(e) => setNewUserForm((prev) => ({ ...prev, name: e.target.value }))} />
                <input className="px-3 py-2 border border-gray-300 rounded-lg" placeholder="Apellidos" value={newUserForm.lastName} onChange={(e) => setNewUserForm((prev) => ({ ...prev, lastName: e.target.value }))} />
                <input className="px-3 py-2 border border-gray-300 rounded-lg" placeholder="Email" type="email" value={newUserForm.email} onChange={(e) => setNewUserForm((prev) => ({ ...prev, email: e.target.value }))} />
                <input className="px-3 py-2 border border-gray-300 rounded-lg" placeholder="Contrasena temporal" type="password" value={newUserForm.temporaryPassword} onChange={(e) => setNewUserForm((prev) => ({ ...prev, temporaryPassword: e.target.value }))} />
                <select className="px-3 py-2 border border-gray-300 rounded-lg" value={newUserForm.role} onChange={(e) => setNewUserForm((prev) => ({ ...prev, role: e.target.value }))}>
                  <option value="USER">USER</option>
                  <option value="TENANT_ADMIN">TENANT_ADMIN</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
                <div className="md:col-span-5">
                  <button className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg" type="submit">Crear usuario</button>
                </div>
              </form>
            </section>

            <section className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="font-semibold text-gray-900">Usuarios</h2>
                    <p className="text-sm text-gray-500">Edita datos, estado, rol y cambio de contrasena temporal.</p>
                  </div>
                  <div className="text-sm text-gray-500">Total: {sortedUsers.length}</div>
                </div>
              </div>
              <div className="overflow-x-auto">
              <table className="w-full min-w-[1180px] divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Nombre</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Apellidos</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Rol</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Estado</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Ultima conexion</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Clave</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Cambio de contrasena</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {sortedUsers.map((user) => {
                    const editable = editUsers[user.id];
                    const lastLoginLabel = user.lastLoginAt
                      ? new Date(user.lastLoginAt).toLocaleString("es-ES")
                      : "Nunca";

                    return (
                      <tr key={user.id} className="hover:bg-gray-50 align-top">
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {user.role === "SUPER_ADMIN" ? user.name : (
                            <input
                              className="w-full rounded-lg border border-gray-300 px-3 py-2"
                              value={editable?.name || ""}
                              onChange={(e) => setEditUsers((prev) => ({ ...prev, [user.id]: { ...prev[user.id], name: e.target.value } }))}
                            />
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {user.role === "SUPER_ADMIN" ? (user.lastName || "") : (
                            <input
                              className="w-full rounded-lg border border-gray-300 px-3 py-2"
                              value={editable?.lastName || ""}
                              onChange={(e) => setEditUsers((prev) => ({ ...prev, [user.id]: { ...prev[user.id], lastName: e.target.value } }))}
                            />
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {user.role === "SUPER_ADMIN" ? user.email : (
                            <input
                              className="w-full rounded-lg border border-gray-300 px-3 py-2"
                              type="email"
                              value={editable?.email || ""}
                              onChange={(e) => setEditUsers((prev) => ({ ...prev, [user.id]: { ...prev[user.id], email: e.target.value } }))}
                            />
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {user.role === "SUPER_ADMIN" ? "SUPER_ADMIN" : (
                            <select
                              className="rounded-lg border border-gray-300 px-3 py-2"
                              value={editable?.role || "USER"}
                              onChange={(e) => setEditUsers((prev) => ({ ...prev, [user.id]: { ...prev[user.id], role: e.target.value } }))}
                            >
                              <option value="USER">USER</option>
                              <option value="TENANT_ADMIN">TENANT_ADMIN</option>
                              <option value="ADMIN">ADMIN</option>
                            </select>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {user.role === "SUPER_ADMIN" ? (
                            user.isActive ? "Activo" : "Desactivado"
                          ) : (
                            <label className="inline-flex items-center gap-2 rounded-full bg-gray-50 px-3 py-2">
                              <input
                                type="checkbox"
                                checked={Boolean(editable?.isActive)}
                                onChange={(e) => setEditUsers((prev) => ({ ...prev, [user.id]: { ...prev[user.id], isActive: e.target.checked } }))}
                              />
                              {editable?.isActive ? "Activo" : "Desactivado"}
                            </label>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">{lastLoginLabel}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                            user.mustChangePassword
                              ? "bg-amber-100 text-amber-800"
                              : "bg-green-100 text-green-800"
                          }`}>
                            {user.mustChangePassword ? "Debe cambiar" : "Activa"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {user.role === "SUPER_ADMIN" ? (
                            <span className="text-xs text-gray-500">No disponible</span>
                          ) : (
                            <div className="flex min-w-[320px] items-center gap-2">
                              <input
                                className="flex-1 rounded-lg border border-gray-300 px-3 py-2"
                                type="password"
                                placeholder="Nueva temporal"
                                value={resetPasswords[user.id] || ""}
                                onChange={(e) => setResetPasswords((prev) => ({ ...prev, [user.id]: e.target.value }))}
                              />
                              <button
                                className="whitespace-nowrap rounded-lg bg-amber-500 px-3 py-2 text-white hover:bg-amber-600"
                                onClick={() => void handleResetPassword(user.id)}
                                type="button"
                              >
                                Cambio de contrasena
                              </button>
                              <button
                                className="rounded-lg bg-blue-600 px-3 py-2 text-white hover:bg-blue-700"
                                onClick={() => void handleUpdateUser(user.id)}
                                type="button"
                              >
                                Guardar
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
