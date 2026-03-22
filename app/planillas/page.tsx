"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

interface Pago {
  id: number;
  fecha: string;
  monto: number;
  tipo: "quincenal" | "diario" | "bono" | "horaExtra";
  observacion?: string;
}

interface Colaborador {
  id: string;
  nombre: string;
  puesto: string;
  tipoPago: "quincenal" | "diario";
  montoBase: number;
  pagos: Pago[];
  ultimoPago: string;
  proximoPago: string;
}

export default function Planillas() {
  const router = useRouter();
  const [verificando, setVerificando] = useState(true);
  const [rol, setRol] = useState<string | null>(null);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [modalPago, setModalPago] = useState(false);
  const [colaboradorSeleccionado, setColaboradorSeleccionado] = useState<Colaborador | null>(null);
  const [nuevoPago, setNuevoPago] = useState({
    monto: 0,
    tipo: "diario" as "quincenal" | "diario" | "bono" | "horaExtra",
    observacion: "",
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
      const planillasRef = doc(db, "planillas", "colaboradores");
      const planillasSnap = await getDoc(planillasRef);
      if (planillasSnap.exists()) {
        setColaboradores(planillasSnap.data().colaboradores || []);
      } else {
        // Crear colaboradores iniciales
        const colaboradoresIniciales: Colaborador[] = [
          {
            id: "david",
            nombre: "David",
            puesto: "Atención al Cliente",
            tipoPago: "quincenal",
            montoBase: 750,
            pagos: [],
            ultimoPago: "",
            proximoPago: calcularProximoPagoQuincenal(),
          },
          {
            id: "luis",
            nombre: "Luis",
            puesto: "Cocina",
            tipoPago: "diario",
            montoBase: 50,
            pagos: [],
            ultimoPago: "",
            proximoPago: new Date().toISOString().split("T")[0],
          },
        ];
        setColaboradores(colaboradoresIniciales);
        await setDoc(planillasRef, { colaboradores: colaboradoresIniciales });
      }
    } catch (error) {
      console.log("Error cargando datos:", error);
    }
  };

  const calcularProximoPagoQuincenal = () => {
    const hoy = new Date();
    const dia = hoy.getDate();
    const proximoPago = new Date(hoy);
    
    if (dia < 15) {
      proximoPago.setDate(15);
    } else {
      proximoPago.setMonth(proximoPago.getMonth() + 1);
      proximoPago.setDate(1);
    }
    
    return proximoPago.toISOString().split("T")[0];
  };

  const guardarPago = async () => {
    if (!colaboradorSeleccionado || nuevoPago.monto <= 0) return;

    const pago: Pago = {
      id: Date.now(),
      fecha: new Date().toISOString().split("T")[0],
      monto: nuevoPago.monto,
      tipo: nuevoPago.tipo,
      observacion: nuevoPago.observacion,
    };

    const colaboradorActualizado = {
      ...colaboradorSeleccionado,
      pagos: [pago, ...colaboradorSeleccionado.pagos],
      ultimoPago: pago.fecha,
      proximoPago: colaboradorSeleccionado.tipoPago === "quincenal" 
        ? calcularProximoPagoQuincenal() 
        : new Date(Date.now() + 86400000).toISOString().split("T")[0],
    };

    const actualizados = colaboradores.map(c => 
      c.id === colaboradorActualizado.id ? colaboradorActualizado : c
    );
    setColaboradores(actualizados);

    try {
      await setDoc(doc(db, "planillas", "colaboradores"), { colaboradores: actualizados });
    } catch (error) {
      console.error("Error guardando pago:", error);
    }

    setModalPago(false);
    setColaboradorSeleccionado(null);
    setNuevoPago({ monto: 0, tipo: "diario", observacion: "" });
  };

  const getTotalPagadoMes = (pagos: Pago[]) => {
    const hoy = new Date();
    const mesActual = hoy.getMonth();
    const anioActual = hoy.getFullYear();
    
    return pagos
      .filter(p => {
        const fechaPago = new Date(p.fecha);
        return fechaPago.getMonth() === mesActual && fechaPago.getFullYear() === anioActual;
      })
      .reduce((acc, p) => acc + p.monto, 0);
  };

  const getPagosDelMes = (pagos: Pago[]) => {
    const hoy = new Date();
    const mesActual = hoy.getMonth();
    const anioActual = hoy.getFullYear();
    
    return pagos.filter(p => {
      const fechaPago = new Date(p.fecha);
      return fechaPago.getMonth() === mesActual && fechaPago.getFullYear() === anioActual;
    });
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
      <header className="bg-teal-600 text-white p-4">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">📋 Planillas</h1>
          <div className="flex gap-2">
            <button 
              onClick={() => router.push("/menu")} 
              className="bg-teal-700 px-4 py-2 rounded hover:bg-teal-800"
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {colaboradores.map(colab => {
            const totalMes = getTotalPagadoMes(colab.pagos);
            const pagosMes = getPagosDelMes(colab.pagos);
            
            return (
              <div key={colab.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold">{colab.nombre}</h3>
                    <p className="text-gray-600">{colab.puesto}</p>
                    <p className="text-sm text-teal-600 font-bold mt-1">
                      {colab.tipoPago === "quincenal" ? "Quincenal" : "Diario"}: S/.{colab.montoBase.toFixed(2)}
                    </p>
                  </div>
                  <button 
                    onClick={() => {
                      setColaboradorSeleccionado(colab);
                      setNuevoPago({
                        monto: colab.montoBase,
                        tipo: colab.tipoPago,
                        observacion: "",
                      });
                      setModalPago(true);
                    }}
                    className="bg-teal-600 text-white px-4 py-2 rounded hover:bg-teal-700"
                  >
                    + Registrar Pago
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-gray-100 p-3 rounded">
                    <p className="text-sm text-gray-600">Último Pago</p>
                    <p className="font-bold">{colab.ultimoPago || "Sin registros"}</p>
                  </div>
                  <div className="bg-teal-100 p-3 rounded">
                    <p className="text-sm text-teal-600">Próximo Pago</p>
                    <p className="font-bold">{colab.proximoPago || "-"}</p>
                  </div>
                </div>

                <div className="bg-green-100 p-3 rounded mb-4">
                  <p className="text-sm text-green-600">Total Pagado Este Mes</p>
                  <p className="text-2xl font-bold text-green-700">S/.{totalMes.toFixed(2)}</p>
                  <p className="text-xs text-green-600">{pagosMes.length} pagos registrados</p>
                </div>

                {pagosMes.length > 0 && (
                  <div>
                    <h4 className="font-bold text-sm mb-2">Últimos Pagos:</h4>
                    <div className="max-h-32 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-200">
                            <th className="p-1 text-left">Fecha</th>
                            <th className="p-1 text-right">Monto</th>
                            <th className="p-1 text-left">Tipo</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pagosMes.slice(0, 5).map(p => (
                            <tr key={p.id} className="border-b">
                              <td className="p-1">{p.fecha}</td>
                              <td className="p-1 text-right font-bold">S/.{p.monto.toFixed(2)}</td>
                              <td className="p-1">
                                <span className={`px-2 py-0.5 rounded text-xs text-white ${
                                  p.tipo === "quincenal" ? "bg-blue-500" :
                                  p.tipo === "diario" ? "bg-green-500" :
                                  p.tipo === "bono" ? "bg-purple-500" : "bg-orange-500"
                                }`}>
                                  {p.tipo === "quincenal" ? "Quincenal" :
                                   p.tipo === "diario" ? "Diario" :
                                   p.tipo === "bono" ? "Bono" : "H.Extra"}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold mb-4">Historial de Pagos</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-200">
                  <th className="p-2 text-left">Fecha</th>
                  <th className="p-2 text-left">Colaborador</th>
                  <th className="p-2 text-left">Tipo</th>
                  <th className="p-2 text-right">Monto</th>
                  <th className="p-2 text-left">Observación</th>
                </tr>
              </thead>
              <tbody>
                {colaboradores.flatMap(colab => 
                  colab.pagos.map(pago => ({ ...pago, nombre: colab.nombre }))
                ).sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()).map(pago => (
                  <tr key={pago.id} className="border-b">
                    <td className="p-2">{pago.fecha}</td>
                    <td className="p-2 font-medium">{pago.nombre}</td>
                    <td className="p-2">
                      <span className={`px-2 py-1 rounded text-xs text-white ${
                        pago.tipo === "quincenal" ? "bg-blue-500" :
                        pago.tipo === "diario" ? "bg-green-500" :
                        pago.tipo === "bono" ? "bg-purple-500" : "bg-orange-500"
                      }`}>
                        {pago.tipo === "quincenal" ? "Quincenal" :
                         pago.tipo === "diario" ? "Diario" :
                         pago.tipo === "bono" ? "Bono" : "H.Extra"}
                      </span>
                    </td>
                    <td className="p-2 text-right font-bold">S/.{pago.monto.toFixed(2)}</td>
                    <td className="p-2 text-gray-600">{pago.observacion || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {colaboradores.every(c => c.pagos.length === 0) && (
              <p className="text-center text-gray-500 py-4">No hay pagos registrados.</p>
            )}
          </div>
        </div>
      </div>

      {modalPago && colaboradorSeleccionado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              Registrar Pago - {colaboradorSeleccionado.nombre}
            </h2>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-bold mb-1">Tipo de Pago:</label>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => setNuevoPago({ ...nuevoPago, tipo: "diario", monto: 50 })}
                    className={`px-3 py-1 rounded text-sm ${
                      nuevoPago.tipo === "diario" ? "bg-green-600 text-white" : "bg-gray-200"
                    }`}
                  >
                    Diario
                  </button>
                  <button
                    onClick={() => setNuevoPago({ ...nuevoPago, tipo: "quincenal", monto: 750 })}
                    className={`px-3 py-1 rounded text-sm ${
                      nuevoPago.tipo === "quincenal" ? "bg-blue-600 text-white" : "bg-gray-200"
                    }`}
                  >
                    Quincenal
                  </button>
                  <button
                    onClick={() => setNuevoPago({ ...nuevoPago, tipo: "bono", monto: 0 })}
                    className={`px-3 py-1 rounded text-sm ${
                      nuevoPago.tipo === "bono" ? "bg-purple-600 text-white" : "bg-gray-200"
                    }`}
                  >
                    Bono
                  </button>
                  <button
                    onClick={() => setNuevoPago({ ...nuevoPago, tipo: "horaExtra", monto: 0 })}
                    className={`px-3 py-1 rounded text-sm ${
                      nuevoPago.tipo === "horaExtra" ? "bg-orange-600 text-white" : "bg-gray-200"
                    }`}
                  >
                    Hora Extra
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold mb-1">Monto (S/.):</label>
                <input 
                  type="number"
                  step="0.01"
                  className="w-full border p-2 rounded"
                  value={nuevoPago.monto || ""}
                  onChange={(e) => setNuevoPago({ ...nuevoPago, monto: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-1">Observación:</label>
                <input 
                  type="text"
                  className="w-full border p-2 rounded"
                  value={nuevoPago.observacion}
                  onChange={(e) => setNuevoPago({ ...nuevoPago, observacion: e.target.value })}
                  placeholder="Ej: Pago completo del día"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button 
                onClick={guardarPago}
                className="flex-1 bg-green-600 text-white py-2 rounded hover:bg-green-700"
              >
                Registrar Pago
              </button>
              <button 
                onClick={() => {
                  setModalPago(false);
                  setColaboradorSeleccionado(null);
                }}
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
