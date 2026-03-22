"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import Link from "next/link";

export default function Menu() {
  const router = useRouter();
  const [verificando, setVerificando] = useState(true);
  const [rol, setRol] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/");
        return;
      }
      
      const userDoc = await getDoc(doc(db, "usuarios", user.uid));
      if (!userDoc.exists()) {
        await signOut(auth);
        router.push("/");
        return;
      }
      setRol(userDoc.data().rol);
      setVerificando(false);
    });
    
    return () => unsubscribe();
  }, [router]);

  if (verificando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-lg">Cargando...</p>
      </div>
    );
  }

  const cerrarSesion = async () => {
    await signOut(auth);
    router.push("/");
  };

  return (
    <main className="min-h-screen bg-gray-100">
      <header className="bg-orange-600 text-white p-4 shadow-lg">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold text-center">
            Sistema de Gestión - Barrio Burguer
          </h1>
          <button 
            onClick={cerrarSesion}
            className="bg-red-500 px-4 py-2 rounded hover:bg-red-600"
          >
            Cerrar Sesión
          </button>
        </div>
      </header>

      <div className="container mx-auto p-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link href="/inventario" className="block">
            <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow cursor-pointer border-l-4 border-blue-500">
              <h2 className="text-xl font-bold text-gray-800 mb-2">📦 Inventario</h2>
              <p className="text-gray-600">Control de stock, recetas y consumo automático</p>
            </div>
          </Link>

          <Link href="/caja" className="block">
            <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow cursor-pointer border-l-4 border-green-500">
              <h2 className="text-xl font-bold text-gray-800 mb-2">💰 Caja Chica</h2>
              <p className="text-gray-600">Gestión de efectivo diario y gastos</p>
            </div>
          </Link>

          <Link href="/ventas" className="block">
            <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow cursor-pointer border-l-4 border-purple-500">
              <h2 className="text-xl font-bold text-gray-800 mb-2">🛒 Ventas</h2>
              <p className="text-gray-600">Ventas en salón y delivery</p>
            </div>
          </Link>

          {(rol === "admin" || rol === "jefe") && (
            <>
              <Link href="/facturas" className="block">
                <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow cursor-pointer border-l-4 border-yellow-500">
                  <h2 className="text-xl font-bold text-gray-800 mb-2">🧾 Facturas</h2>
                  <p className="text-gray-600">Gestión de facturas y comprobantes</p>
                </div>
              </Link>

              <Link href="/planillas" className="block">
                <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow cursor-pointer border-l-4 border-teal-500">
                  <h2 className="text-xl font-bold text-gray-800 mb-2">📋 Planillas</h2>
                  <p className="text-gray-600">Control de planillas y colaboradores</p>
                </div>
              </Link>
            </>
          )}

          {rol === "admin" && (
            <Link href="/gestion-usuarios" className="block">
              <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow cursor-pointer border-l-4 border-red-500">
                <h2 className="text-xl font-bold text-gray-800 mb-2">👥 Usuarios</h2>
                <p className="text-gray-600">Gestión de usuarios y permisos</p>
              </div>
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
