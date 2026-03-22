"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

interface FacturaCliente {
  id: number;
  nombre: string;
  ruc: string;
  razonSocial: string;
  telefono: string;
  fechaSolicitud: string;
  monto: number;
  estado: "pendiente" | "emitida";
}

interface Servicio {
  id: string;
  nombre: string;
  ultimoPago: string;
  proximoPago: string;
  monto: number;
}

export default function Facturas() {
  const router = useRouter();
  const [verificando, setVerificando] = useState(true);
  const [rol, setRol] = useState<string | null>(null);
  const [vista, setVista] = useState<"clientes" | "servicios">("clientes");
  const [facturasClientes, setFacturasClientes] = useState<FacturaCliente[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([
    { id: "luz", nombre: "Luz", ultimoPago: "", proximoPago: "", monto: 0 },
    { id: "agua", nombre: "Agua", ultimoPago: "", proximoPago: "", monto: 0 },
    { id: "internet", nombre: "Internet", ultimoPago: "", proximoPago: "", monto: 0 },
    { id: "alquiler", nombre: "Alquiler", ultimoPago: "", proximoPago: "", monto: 0 },
  ]);
  
  const [modalFactura, setModalFactura] = useState(false);
  const [nuevaFactura, setNuevaFactura] = useState({
    nombre: "",
    ruc: "",
    razonSocial: "",
    telefono: "",
    monto: 0,
  });

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
      await cargarDatos();
      setVerificando(false);
    });
    
    return () => unsubscribe();
  }, [router]);

  const cargarDatos = async () => {
    try {
      const facturasRef = doc(db, "facturas", "clientes");
      const facturasSnap = await getDoc(facturasRef);
      if (facturasSnap.exists()) {
        setFacturasClientes(facturasSnap.data().facturas || []);
      }

      const serviciosRef = doc(db, "facturas", "servicios");
      const serviciosSnap = await getDoc(serviciosRef);
      if (serviciosSnap.exists()) {
        setServicios(prev => {
          const datos = serviciosSnap.data().servicios || [];
          return prev.map(s => {
            const data = datos.find((d: any) => d.id === s.id);
            return data ? { ...s, ...data } : s;
          });
        });
      }
    } catch (error) {
      console.log("Error cargando datos:", error);
    }
  };

  const guardarFactura = async () => {
    if (!nuevaFactura.nombre || !nuevaFactura.monto) return;

    const factura: FacturaCliente = {
      id: Date.now(),
      nombre: nuevaFactura.nombre,
      ruc: nuevaFactura.ruc,
      razonSocial: nuevaFactura.razonSocial,
      telefono: nuevaFactura.telefono,
      fechaSolicitud: new Date().toISOString().split("T")[0],
      monto: nuevaFactura.monto,
      estado: "pendiente",
    };

    const nuevasFacturas = [factura, ...facturasClientes];
    setFacturasClientes(nuevasFacturas);

    try {
      await setDoc(doc(db, "facturas", "clientes"), { facturas: nuevasFacturas }, { merge: true });
    } catch (error) {
      console.error("Error guardando factura:", error);
    }

    setNuevaFactura({ nombre: "", ruc: "", razonSocial: "", telefono: "", monto: 0 });
    setModalFactura(false);
  };

  const marcarEmitida = async (id: number) => {
    const actualizadas = facturasClientes.map(f => 
      f.id === id ? { ...f, estado: "emitida" as const } : f
    );
    setFacturasClientes(actualizadas);
    
    try {
      await setDoc(doc(db, "facturas", "clientes"), { facturas: actualizadas }, { merge: true });
    } catch (error) {
      console.error("Error actualizando factura:", error);
    }
  };

  const guardarServicio = async (servicioActualizado: Servicio) => {
    const actualizados = servicios.map(s => 
      s.id === servicioActualizado.id ? servicioActualizado : s
    );
    setServicios(actualizados);

    try {
      await setDoc(doc(db, "facturas", "servicios"), { servicios: actualizados }, { merge: true });
    } catch (error) {
      console.error("Error guardando servicio:", error);
    }
  };

  if (verificando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-lg">Cargando...</p>
      </div>
    );
  }

  if (rol !== "admin" && rol !== "jefe") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <h2 className="text-xl font-bold text-red-600 mb-4">Acceso denegado</h2>
          <p className="text-gray-600 mb-4">No tienes permisos para ver esta sección.</p>
          <button 
            onClick={() => router.push("/menu")}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Volver al menú
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100">
      <header className="bg-yellow-600 text-white p-4">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">🧾 Facturas</h1>
          <div className="flex gap-2">
            <button 
              onClick={() => router.push("/menu")} 
              className="bg-yellow-700 px-4 py-2 rounded hover:bg-yellow-800"
            >
              ← Menú Principal
            </button>
            <button 
              onClick={async () => { await signOut(auth); router.push("/"); }}
              className="bg-red-500 px-4 py-2 rounded hover:bg-red-600"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </header>

      <div className="container mx-auto p-4">
        <div className="flex gap-2 mb-4">
          <button 
            onClick={() => setVista("clientes")}
            className={`px-4 py-2 rounded ${vista === "clientes" ? "bg-yellow-600 text-white" : "bg-white text-gray-700"}`}
          >
            🧾 Facturas Clientes
          </button>
          <button 
            onClick={() => setVista("servicios")}
            className={`px-4 py-2 rounded ${vista === "servicios" ? "bg-yellow-600 text-white" : "bg-white text-gray-700"}`}
          >
            💡 Servicios Básicos
          </button>
        </div>

        {vista === "clientes" && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">Facturas Clientes</h2>
              <button 
                onClick={() => setModalFactura(true)}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                + Nueva Factura
              </button>
            </div>

            {facturasClientes.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No hay facturas registradas.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-200">
                      <th className="p-2 text-left">Fecha</th>
                      <th className="p-2 text-left">Cliente</th>
                      <th className="p-2 text-left">RUC</th>
                      <th className="p-2 text-left">Razón Social</th>
                      <th className="p-2 text-left">Teléfono</th>
                      <th className="p-2 text-right">Monto</th>
                      <th className="p-2 text-center">Estado</th>
                      <th className="p-2 text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {facturasClientes.map(f => (
                      <tr key={f.id} className="border-b">
                        <td className="p-2">{f.fechaSolicitud}</td>
                        <td className="p-2 font-medium">{f.nombre}</td>
                        <td className="p-2">{f.ruc || "-"}</td>
                        <td className="p-2">{f.razonSocial || "-"}</td>
                        <td className="p-2">{f.telefono || "-"}</td>
                        <td className="p-2 text-right font-bold">S/.{f.monto.toFixed(2)}</td>
                        <td className="p-2 text-center">
                          <span className={`px-2 py-1 rounded text-white text-xs ${
                            f.estado === "pendiente" ? "bg-orange-500" : "bg-green-500"
                          }`}>
                            {f.estado === "pendiente" ? "Pendiente" : "Emitida"}
                          </span>
                        </td>
                        <td className="p-2 text-center">
                          {f.estado === "pendiente" && (
                            <button 
                              onClick={() => marcarEmitida(f.id)}
                              className="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600"
                            >
                              Marcar Emitida
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {vista === "servicios" && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-bold mb-4">Servicios Básicos</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {servicios.map(servicio => (
                <div key={servicio.id} className="border rounded-lg p-4">
                  <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                    {servicio.id === "luz" && "💡"}
                    {servicio.id === "agua" && "💧"}
                    {servicio.id === "internet" && "🌐"}
                    {servicio.id === "alquiler" && "🏠"}
                    {servicio.nombre}
                  </h3>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm text-gray-600">Último Pago:</label>
                      <input 
                        type="date"
                        className="w-full border p-2 rounded"
                        value={servicio.ultimoPago}
                        onChange={(e) => guardarServicio({ ...servicio, ultimoPago: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Próximo Pago:</label>
                      <input 
                        type="date"
                        className="w-full border p-2 rounded"
                        value={servicio.proximoPago}
                        onChange={(e) => guardarServicio({ ...servicio, proximoPago: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Monto a Pagar (S/.):</label>
                      <input 
                        type="number"
                        step="0.01"
                        className="w-full border p-2 rounded"
                        value={servicio.monto || ""}
                        onChange={(e) => guardarServicio({ ...servicio, monto: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {modalFactura && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Nueva Factura</h2>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-bold mb-1">Nombre del Cliente:</label>
                <input 
                  type="text"
                  className="w-full border p-2 rounded"
                  value={nuevaFactura.nombre}
                  onChange={(e) => setNuevaFactura({ ...nuevaFactura, nombre: e.target.value })}
                  placeholder="Nombre completo"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">RUC:</label>
                <input 
                  type="text"
                  className="w-full border p-2 rounded"
                  value={nuevaFactura.ruc}
                  onChange={(e) => setNuevaFactura({ ...nuevaFactura, ruc: e.target.value })}
                  placeholder="Ej: 20412345678"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">Razón Social:</label>
                <input 
                  type="text"
                  className="w-full border p-2 rounded"
                  value={nuevaFactura.razonSocial}
                  onChange={(e) => setNuevaFactura({ ...nuevaFactura, razonSocial: e.target.value })}
                  placeholder="Nombre de la empresa"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">Teléfono:</label>
                <input 
                  type="text"
                  className="w-full border p-2 rounded"
                  value={nuevaFactura.telefono}
                  onChange={(e) => setNuevaFactura({ ...nuevaFactura, telefono: e.target.value })}
                  placeholder="Ej: 987654321"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">Monto (S/.):</label>
                <input 
                  type="number"
                  step="0.01"
                  className="w-full border p-2 rounded"
                  value={nuevaFactura.monto || ""}
                  onChange={(e) => setNuevaFactura({ ...nuevaFactura, monto: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button 
                onClick={guardarFactura}
                className="flex-1 bg-green-600 text-white py-2 rounded hover:bg-green-700"
              >
                Guardar
              </button>
              <button 
                onClick={() => setModalFactura(false)}
                className="flex-1 bg-gray-300 text-gray-700 py-2 rounded hover:bg-gray-400"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
