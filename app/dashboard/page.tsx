"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, onSnapshot } from "firebase/firestore";

interface Venta {
  id: number;
  tipo: "salon" | "delivery";
  mesa: string;
  productos: any[];
  total: number;
  totalConPropina: number;
  totalOriginal?: number;
  comision?: number;
  fecha: string;
  hora: string;
  usuario?: string;
  estado: string;
  metodoPago?: string;
  propina?: number;
}

export default function Dashboard() {
  const router = useRouter();
  const [verificando, setVerificando] = useState(true);
  const [rol, setRol] = useState<string | null>(null);
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [loading, setLoading] = useState(true);
  const [ultimoCierre, setUltimoCierre] = useState<string | null>(null);
  const [mostrarModalCierre, setMostrarModalCierre] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/");
        return;
      }
      
      const userDoc = await import("firebase/firestore").then(m => 
        m.getDoc(m.doc(db, "usuarios", user.uid))
      );
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

  useEffect(() => {
    if (verificando) return;

    const ventasRef = doc(db, "ventas", "pedidos");
    const configRef = doc(db, "ventas", "config");
    
    const unsubscribeVentas = onSnapshot(ventasRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setVentas(data.pedidos || []);
      }
      setLoading(false);
    });

    const unsubscribeConfig = onSnapshot(configRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setUltimoCierre(data.ultimoCierre || null);
        
        if (data.ultimoCierre) {
          setMostrarModalCierre(true);
        }
      }
    });

    return () => {
      unsubscribeVentas();
      unsubscribeConfig();
    };
  }, [verificando]);

  useEffect(() => {
    if (mostrarModalCierre && ultimoCierre) {
      const timer = setTimeout(() => {
        setMostrarModalCierre(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [mostrarModalCierre, ultimoCierre]);

  const cerrarSesion = async () => {
    await signOut(auth);
    router.push("/");
  };

  if (verificando || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando ventas...</p>
        </div>
      </div>
    );
  }

  if (rol !== "admin" && rol !== "jefe") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="bg-white p-6 rounded-lg shadow-md text-center">
          <h2 className="text-xl font-bold text-red-600 mb-4">Acceso denegado</h2>
          <p className="text-gray-600 mb-4">No tienes permisos para ver esta sección.</p>
          <button 
            onClick={() => router.push("/menu")}
            className="bg-green-600 text-white px-3 py-2 rounded text-sm hover:bg-green-700"
          >
            ← Menú
          </button>
        </div>
      </div>
    );
  }

  const hoy = new Date().toISOString().split("T")[0];
  const fechaDesde = ultimoCierre || hoy;
  const ventasDesdeCierre = ventas.filter(v => v.fecha >= fechaDesde);
  
  const totalHoy = ventasDesdeCierre.reduce((acc, v) => acc + (v.totalConPropina || v.total || 0), 0);
  const totalPropinas = ventasDesdeCierre.reduce((acc, v) => acc + (v.propina || 0), 0);
  const totalVentasNetas = totalHoy - totalPropinas;
  
  const totalEfectivo = ventasDesdeCierre.filter(v => v.metodoPago === "efectivo").reduce((acc, v) => acc + (v.totalConPropina || 0), 0);
  const totalYape = ventasDesdeCierre.filter(v => v.metodoPago === "yape").reduce((acc, v) => acc + (v.totalConPropina || 0), 0);
  const totalPos = ventasDesdeCierre.filter(v => v.metodoPago === "pos").reduce((acc, v) => acc + (v.totalConPropina || 0), 0);
  
  const ventasSalon = ventasDesdeCierre.filter(v => v.tipo === "salon").length;
  const ventasDelivery = ventasDesdeCierre.filter(v => v.tipo === "delivery").length;
  const totalComision = ventasDesdeCierre.reduce((acc, v) => acc + (v.comision || 0), 0);

  const obtenerFechaAnterior = (dias: number) => {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() - dias);
    return fecha.toISOString().split("T")[0];
  };

  const ventasAyer = ventas.filter(v => v.fecha === obtenerFechaAnterior(1));
  const totalAyer = ventasAyer.reduce((acc, v) => acc + (v.totalConPropina || v.total || 0), 0);
  const diferencia = totalHoy - totalAyer;
  const porcentajeCambio = totalAyer > 0 ? ((diferencia / totalAyer) * 100).toFixed(1) : "0";

  const productosMasVendidos = () => {
    const conteo: Record<string, { cantidad: number; nombre: string }> = {};
    ventasDesdeCierre.forEach(venta => {
      venta.productos?.forEach((p: any) => {
        if (conteo[p.producto?.nombre]) {
          conteo[p.producto.nombre].cantidad += p.cantidad;
        } else {
          conteo[p.producto?.nombre] = { cantidad: p.cantidad, nombre: p.producto?.nombre || "Sin nombre" };
        }
      });
    });
    return Object.values(conteo).sort((a, b) => b.cantidad - a.cantidad).slice(0, 5);
  };

  const productosVendidos = productosMasVendidos();

  return (
    <main className="min-h-screen bg-gray-100">
      <header className="bg-purple-600 text-white p-3 md:p-4">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-base md:text-xl font-bold">📊 Dashboard</h1>
          <div className="flex gap-2">
            <button onClick={() => router.push("/menu")} className="bg-purple-700 px-2 md:px-4 py-2 rounded text-sm hover:bg-purple-800">
              ← Menú
            </button>
            <button onClick={cerrarSesion} className="bg-red-500 px-2 md:px-4 py-2 rounded text-sm hover:bg-red-600">
              Salir
            </button>
          </div>
        </div>
      </header>

      {mostrarModalCierre && ultimoCierre && (
        <div className="bg-blue-500 text-white p-3 text-center animate-pulse">
          <p className="text-sm font-bold">📊 Dashboard activo desde el último cierre: {ultimoCierre}</p>
        </div>
      )}

      <div className="container mx-auto p-3 md:p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg md:text-xl font-bold text-gray-800">📈 Ventas en Tiempo Real</h2>
            <p className="text-xs md:text-sm text-gray-500">Actualizado: {new Date().toLocaleTimeString()}</p>
            {ultimoCierre && (
              <p className="text-xs text-blue-600">Desde cierre: {ultimoCierre}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
            <span className="text-xs md:text-sm text-green-600 font-bold">EN VIVO</span>
          </div>
        </div>

        <div className="bg-purple-600 text-white p-4 md:p-6 rounded-lg mb-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm opacity-80">{ultimoCierre ? "Total desde Cierre" : "Total del Día"}</p>
              <p className="text-2xl md:text-4xl font-bold">S/.{totalHoy.toFixed(2)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm opacity-80">vs Ayer</p>
              <p className={`text-lg font-bold ${diferencia >= 0 ? "text-green-300" : "text-red-300"}`}>
                {diferencia >= 0 ? "+" : ""}{porcentajeCambio}%
              </p>
              <p className="text-xs opacity-80">
                {diferencia >= 0 ? "+" : ""}S/.{Math.abs(diferencia).toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mb-4">
          <div className="bg-green-100 p-3 md:p-4 rounded-lg text-center">
            <p className="text-xs md:text-sm text-green-600">💵 Efectivo</p>
            <p className="text-lg md:text-2xl font-bold text-green-800">S/.{totalEfectivo.toFixed(2)}</p>
          </div>
          <div className="bg-orange-100 p-3 md:p-4 rounded-lg text-center">
            <p className="text-xs md:text-sm text-orange-600">📱 Yape</p>
            <p className="text-lg md:text-2xl font-bold text-orange-800">S/.{totalYape.toFixed(2)}</p>
          </div>
          <div className="bg-blue-100 p-3 md:p-4 rounded-lg text-center">
            <p className="text-xs md:text-sm text-blue-600">💳 POS</p>
            <p className="text-lg md:text-2xl font-bold text-blue-800">S/.{totalPos.toFixed(2)}</p>
          </div>
          <div className="bg-purple-100 p-3 md:p-4 rounded-lg text-center">
            <p className="text-xs md:text-sm text-purple-600">📋 Pedidos</p>
            <p className="text-lg md:text-2xl font-bold text-purple-800">{ventasDesdeCierre.length}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mb-4">
          <div className="bg-blue-50 p-3 md:p-4 rounded-lg text-center">
            <p className="text-xs md:text-sm text-blue-600">🏠 Salón</p>
            <p className="text-lg md:text-2xl font-bold text-blue-800">{ventasSalon}</p>
          </div>
          <div className="bg-orange-50 p-3 md:p-4 rounded-lg text-center">
            <p className="text-xs md:text-sm text-orange-600">🛵 Delivery</p>
            <p className="text-lg md:text-2xl font-bold text-orange-800">{ventasDelivery}</p>
          </div>
          <div className="bg-green-50 p-3 md:p-4 rounded-lg text-center">
            <p className="text-xs md:text-sm text-green-600">💰 Propinas</p>
            <p className="text-lg md:text-2xl font-bold text-green-800">S/.{totalPropinas.toFixed(2)}</p>
          </div>
          <div className="bg-red-50 p-3 md:p-4 rounded-lg text-center">
            <p className="text-xs md:text-sm text-red-600">📉 Comisión</p>
            <p className="text-lg md:text-2xl font-bold text-red-800">-S/.{totalComision.toFixed(2)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-bold text-gray-800 mb-3">🏆 Productos Más Vendidos (Hoy)</h3>
            {productosVendidos.length > 0 ? (
              <div className="space-y-2">
                {productosVendidos.map((p, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                        {idx + 1}
                      </span>
                      <span className="text-sm">{p.nombre}</span>
                    </div>
                    <span className="font-bold text-purple-600">{p.cantidad} und</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm text-center py-4">Sin ventas hoy</p>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-bold text-gray-800 mb-3">🕐 Últimas Ventas</h3>
            {ventasDesdeCierre.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {[...ventasDesdeCierre]
                  .sort((a, b) => b.hora.localeCompare(a.hora))
                  .slice(0, 8)
                  .map((v, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-gray-50 p-2 rounded text-sm">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${v.tipo === "delivery" ? "bg-orange-500" : "bg-blue-500"}`}></span>
                        <span className="font-medium">{v.mesa}</span>
                        <span className="text-xs text-gray-500">{v.hora}</span>
                      </div>
                      <span className="font-bold text-green-600">S/.{(v.totalConPropina || v.total || 0).toFixed(2)}</span>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm text-center py-4">Sin ventas registradas</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-bold text-gray-800 mb-3">📋 Detalle de Ventas Recientes</h3>
          {ventasDesdeCierre.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs md:text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="p-2 text-left">Hora</th>
                    <th className="p-2 text-left hidden sm:table-cell">Tipo</th>
                    <th className="p-2 text-left">Mesa</th>
                    <th className="p-2 text-left hidden md:table-cell">Productos</th>
                    <th className="p-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {[...ventasDesdeCierre]
                    .sort((a, b) => b.hora.localeCompare(a.hora))
                    .slice(0, 15)
                    .map((v, idx) => (
                      <tr key={idx} className="border-b">
                        <td className="p-2">{v.hora}</td>
                        <td className="p-2 hidden sm:table-cell">
                          <span className={`px-1 py-0.5 rounded text-white text-xs ${v.tipo === "delivery" ? "bg-orange-500" : "bg-blue-500"}`}>
                            {v.tipo === "salon" ? "Salón" : "Delivery"}
                          </span>
                        </td>
                        <td className="p-2">{v.mesa}</td>
                        <td className="p-2 hidden md:table-cell">
                          {v.productos?.slice(0, 2).map((p: any, i: number) => (
                            <span key={i} className="text-xs">
                              {p.cantidad}x{p.producto?.nombre}{i < Math.min(v.productos.length, 2) - 1 ? ", " : ""}
                            </span>
                          ))}
                          {v.productos?.length > 2 && <span className="text-xs text-gray-500"> +{v.productos.length - 2}</span>}
                        </td>
                        <td className="p-2 text-right font-bold text-green-600">S/.{(v.totalConPropina || v.total || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No hay ventas registradas hoy</p>
          )}
        </div>
      </div>
    </main>
  );
}
