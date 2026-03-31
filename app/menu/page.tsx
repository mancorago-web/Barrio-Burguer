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
      <header 
        className="text-blue-900 p-3 md:p-4 shadow-lg"
        style={{
          backgroundImage: `
            linear-gradient(45deg, #1d4ed8 25%, transparent 25%),
            linear-gradient(-45deg, #1d4ed8 25%, transparent 25%),
            linear-gradient(45deg, transparent 75%, #1d4ed8 75%),
            linear-gradient(-45deg, transparent 75%, #1d4ed8 75%)
          `,
          backgroundSize: '20px 20px',
          backgroundColor: '#ffffff',
          backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
        }}
      >
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img src="/icons/icon-192x192.png" alt="Barrio Burger" className="w-10 h-10 md:w-12 md:h-12" />
            <span className="bg-white px-3 py-1 rounded-lg shadow">
              <h1 className="text-lg md:text-2xl font-bold text-blue-900">
                Barrio Burger
              </h1>
            </span>
          </div>
          <button 
            onClick={cerrarSesion}
            className="bg-red-500 text-white px-3 py-2 md:px-4 md:py-2 rounded hover:bg-red-600 text-sm md:text-base"
          >
            Salir
          </button>
        </div>
      </header>

      <div className="container mx-auto p-3 md:p-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
          {rol === "cocina" ? (
            <>
              <Link href="/inventario" className="block">
                <div className="bg-white p-4 md:p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow cursor-pointer border-l-4 border-blue-500">
                  <h2 className="text-lg md:text-xl font-bold text-gray-800 mb-1 md:mb-2">📦 Inventario</h2>
                  <p className="text-gray-600 text-sm">Control de stock</p>
                </div>
              </Link>

              <Link href="/ventas" className="block">
                <div className="bg-white p-4 md:p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow cursor-pointer border-l-4 border-red-500">
                  <h2 className="text-lg md:text-xl font-bold text-gray-800 mb-1 md:mb-2">👨‍🍳 Cocina</h2>
                  <p className="text-gray-600 text-sm">Pedidos para cocina</p>
                </div>
              </Link>
            </>
          ) : (
            <>
              <Link href="/inventario" className="block">
                <div className="bg-white p-4 md:p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow cursor-pointer border-l-4 border-blue-500">
                  <h2 className="text-lg md:text-xl font-bold text-gray-800 mb-1 md:mb-2">📦 Inventario</h2>
                  <p className="text-gray-600 text-sm">Control de stock, recetas y consumo</p>
                </div>
              </Link>

              <Link href="/caja" className="block">
                <div className="bg-white p-4 md:p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow cursor-pointer border-l-4 border-green-500">
                  <h2 className="text-lg md:text-xl font-bold text-gray-800 mb-1 md:mb-2">💰 Caja Chica</h2>
                  <p className="text-gray-600 text-sm">Gestión de efectivo y gastos</p>
                </div>
              </Link>

              <Link href="/ventas" className="block">
                <div className="bg-white p-4 md:p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow cursor-pointer border-l-4 border-purple-500">
                  <h2 className="text-lg md:text-xl font-bold text-gray-800 mb-1 md:mb-2">🛒 Ventas</h2>
                  <p className="text-gray-600 text-sm">Salón y delivery</p>
                </div>
              </Link>
            </>
          )}

          {(rol === "admin" || rol === "jefe") && (
            <>
              <Link href="/dashboard" className="block">
                <div className="bg-white p-4 md:p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow cursor-pointer border-l-4 border-purple-500">
                  <h2 className="text-lg md:text-xl font-bold text-gray-800 mb-1 md:mb-2">📊 Dashboard</h2>
                  <p className="text-gray-600 text-sm">Ventas en tiempo real</p>
                </div>
              </Link>

              <Link href="/facturas" className="block">
                <div className="bg-white p-4 md:p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow cursor-pointer border-l-4 border-yellow-500">
                  <h2 className="text-lg md:text-xl font-bold text-gray-800 mb-1 md:mb-2">🧾 Facturas</h2>
                  <p className="text-gray-600 text-sm">Facturas y comprobantes</p>
                </div>
              </Link>

              <Link href="/planillas" className="block">
                <div className="bg-white p-4 md:p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow cursor-pointer border-l-4 border-teal-500">
                  <h2 className="text-lg md:text-xl font-bold text-gray-800 mb-1 md:mb-2">📋 Planillas</h2>
                  <p className="text-gray-600 text-sm">Control de colaboradores</p>
                </div>
              </Link>
            </>
          )}

          {rol === "admin" && (
            <Link href="/gestion-usuarios" className="block">
              <div className="bg-white p-4 md:p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow cursor-pointer border-l-4 border-red-500">
                <h2 className="text-lg md:text-xl font-bold text-gray-800 mb-1 md:mb-2">👥 Usuarios</h2>
                <p className="text-gray-600 text-sm">Gestión de usuarios</p>
              </div>
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
