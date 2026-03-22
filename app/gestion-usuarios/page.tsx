"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword, signOut, onAuthStateChanged, deleteUser } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, setDoc, getDoc, deleteDoc, collection, getDocs } from "firebase/firestore";

type Usuario = {
  uid: string;
  email: string;
  rol: "admin" | "jefe" | "cocina";
  nombre: string;
};

export default function GestionUsuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [creando, setCreando] = useState(false);
  const [nuevoEmail, setNuevoEmail] = useState("");
  const [nuevaPassword, setNuevaPassword] = useState("");
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoRol, setNuevoRol] = useState<"admin" | "jefe" | "cocina">("cocina");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/");
        return;
      }
      
      const userDoc = await getDoc(doc(db, "usuarios", user.uid));
      if (!userDoc.exists() || (userDoc.data().rol !== "admin" && userDoc.data().rol !== "jefe")) {
        await signOut(auth);
        router.push("/");
        return;
      }
      
      cargarUsuarios();
    });
    
    return () => unsubscribe();
  }, [router]);

  const cargarUsuarios = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "usuarios"));
      const lista: Usuario[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        lista.push({
          uid: doc.id,
          email: data.email,
          rol: data.rol,
          nombre: data.nombre || data.email.split("@")[0],
        });
      });
      setUsuarios(lista);
    } catch (err) {
      console.error("Error cargando usuarios:", err);
    }
    setLoading(false);
  };

  const crearUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setCreando(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, nuevoEmail, nuevaPassword);
      await setDoc(doc(db, "usuarios", userCredential.user.uid), {
        email: nuevoEmail,
        rol: nuevoRol,
        nombre: nuevoNombre || nuevoEmail.split("@")[0],
      });
      
      setSuccess(`Usuario ${nuevoRol === "admin" ? "administrador" : "de cocina"} creado exitosamente`);
      setNuevoEmail("");
      setNuevaPassword("");
      setNuevoNombre("");
      setNuevoRol("cocina");
      cargarUsuarios();
    } catch (err: any) {
      if (err.code === "auth/email-already-in-use") {
        setError("El usuario ya existe");
      } else {
        setError("Error al crear usuario");
      }
    }
    setCreando(false);
  };

  const eliminarUsuario = async (uid: string, email: string) => {
    if (!confirm(`¿Estás seguro de eliminar al usuario ${email}?`)) return;
    
    try {
      await deleteDoc(doc(db, "usuarios", uid));
      setSuccess("Usuario eliminado");
      cargarUsuarios();
    } catch (err) {
      setError("Error al eliminar usuario");
    }
  };

  const cerrarSesion = async () => {
    await signOut(auth);
    router.push("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p>Cargando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-blue-600 text-white p-4">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">👥 Gestión de Usuarios</h1>
          <div className="flex gap-2">
            <button 
              onClick={() => router.push("/menu")}
              className="bg-blue-700 px-4 py-2 rounded hover:bg-blue-800"
            >
              ← Menú Principal
            </button>
            <button 
              onClick={cerrarSesion}
              className="bg-red-500 px-4 py-2 rounded hover:bg-red-600"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </header>

      <div className="container mx-auto p-4">
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-bold mb-4">Crear Nuevo Usuario</h2>
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
          
          {success && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
              {success}
            </div>
          )}

          <form onSubmit={crearUsuario}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-bold mb-1">Nombre</label>
                <input
                  type="text"
                  className="w-full border p-2 rounded"
                  value={nuevoNombre}
                  onChange={(e) => setNuevoNombre(e.target.value)}
                  placeholder="Nombre del usuario"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">Email</label>
                <input
                  type="email"
                  className="w-full border p-2 rounded"
                  value={nuevoEmail}
                  onChange={(e) => setNuevoEmail(e.target.value)}
                  placeholder="email@ejemplo.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">Contraseña</label>
                <input
                  type="password"
                  className="w-full border p-2 rounded"
                  value={nuevaPassword}
                  onChange={(e) => setNuevaPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required
                  minLength={6}
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">Rol</label>
                <select
                  className="w-full border p-2 rounded"
                  value={nuevoRol}
                  onChange={(e) => setNuevoRol(e.target.value as "admin" | "jefe" | "cocina")}
                >
                  <option value="cocina">Cocina</option>
                  <option value="jefe">Jefe</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
            </div>
            <button
              type="submit"
              disabled={creando}
              className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 disabled:bg-gray-400"
            >
              {creando ? "Creando..." : "Crear Usuario"}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold mb-4">Usuarios Existentes</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-200">
                  <th className="p-2 text-left">Nombre</th>
                  <th className="p-2 text-left">Email</th>
                  <th className="p-2 text-left">Usuario</th>
                  <th className="p-2 text-left">Rol</th>
                  <th className="p-2 text-center">Acción</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u) => (
                  <tr key={u.uid} className="border-b">
                    <td className="p-2">{u.nombre}</td>
                    <td className="p-2">{u.email}</td>
                    <td className="p-2">
                      <span className={`px-2 py-1 rounded text-white text-xs ${
                        u.nombre?.toLowerCase() === "admin" ? "bg-purple-600" : 
                        u.nombre?.toLowerCase() === "cubas" ? "bg-orange-500" : 
                        u.nombre?.toLowerCase() === "cocina1" ? "bg-blue-600" : 
                        "bg-gray-500"
                      }`}>
                        {u.nombre}
                      </span>
                    </td>
                    <td className="p-2">
                      <span className={`px-2 py-1 rounded text-white text-xs ${u.rol === "admin" ? "bg-purple-600" : u.rol === "jefe" ? "bg-orange-600" : "bg-blue-600"}`}>
                        {u.rol === "admin" ? "Administrador" : u.rol === "jefe" ? "Jefe" : "Cocina"}
                      </span>
                    </td>
                    <td className="p-2 text-center">
                      <button
                        onClick={() => eliminarUsuario(u.uid, u.email)}
                        className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
