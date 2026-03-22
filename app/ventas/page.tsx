"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

interface ProductoVenta {
  id: number;
  nombre: string;
  precio: number;
  categoria: string;
}

interface ItemPedido {
  producto: ProductoVenta;
  cantidad: number;
}

export default function Ventas() {
  const router = useRouter();
  const [verificando, setVerificando] = useState(true);
  const [vista, setVista] = useState<"salon" | "delivery" | "registro">("salon");
  const [tomarPedido, setTomarPedido] = useState(false);
  const [productos, setProductos] = useState<ProductoVenta[]>([]);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string>("hamburguesa");
  const [pedido, setPedido] = useState<ItemPedido[]>([]);
  const [nombreUsuario, setNombreUsuario] = useState("");
  const [modalPago, setModalPago] = useState(false);
  const [metodoPago, setMetodoPago] = useState<"efectivo" | "yape" | "pos">("efectivo");
  const [montoRecibido, setMontoRecibido] = useState(0);
  const [propina, setPropina] = useState(0);
  const [ventas, setVentas] = useState<any[]>([]);
  const [fechaFiltroVentas, setFechaFiltroVentas] = useState(new Date().toISOString().split("T")[0]);
  const [verRegistroDelivery, setVerRegistroDelivery] = useState(false);
  const [fechaFiltroDelivery, setFechaFiltroDelivery] = useState(new Date().toISOString().split("T")[0]);
  const [mesaSeleccionada, setMesaSeleccionada] = useState<string>("Mesa 1");
  const [pedidosMesas, setPedidosMesas] = useState<Record<string, ItemPedido[]>>({});
  const [pedidosAbiertos, setPedidosAbiertos] = useState<any[]>([]);
  const [recetas, setRecetas] = useState<any[]>([]);
  const [inventario, setInventario] = useState<any[]>([]);

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
      const nombre = userDoc.data().nombre || "Usuario";
      setNombreUsuario(nombre);
      setVerificando(false);
    });
    
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    const cargarMenu = async () => {
      try {
        const recetasSnap = await getDoc(doc(db, "recetas", "datos"));
        if (recetasSnap.exists()) {
          const datos = recetasSnap.data();
          if (datos.productosVenta) {
            setProductos(datos.productosVenta);
          }
          if (datos.recetas) {
            setRecetas(datos.recetas);
          }
        }
        
        const inventarioSnap = await getDoc(doc(db, "inventario", "productos"));
        if (inventarioSnap.exists()) {
          setInventario(inventarioSnap.data().productos || []);
        }
      } catch (error) {
        console.log("Usando menú por defecto");
      }
    };
    cargarMenu();
  }, []);

  const cargarVentas = async () => {
    try {
      const ventasRef = doc(db, "ventas", "pedidos");
      const ventasSnap = await getDoc(ventasRef);
      if (ventasSnap.exists()) {
        setVentas(ventasSnap.data().pedidos || []);
      }
    } catch (error) {
      console.log("Error cargando ventas:", error);
    }
  };

  const cargarPedidosAbiertos = async () => {
    try {
      const abiertosRef = doc(db, "ventas", "pedidosAbiertos");
      const abiertosSnap = await getDoc(abiertosRef);
      if (abiertosSnap.exists()) {
        setPedidosAbiertos(abiertosSnap.data().pedidos || []);
      }
    } catch (error) {
      console.log("Error cargando pedidos abiertos:", error);
    }
  };

  useEffect(() => {
    if (!verificando) {
      cargarVentas();
      cargarPedidosAbiertos();
    }
  }, [verificando]);

  useEffect(() => {
    if (!modalPago) {
      cargarVentas();
      cargarPedidosAbiertos();
    }
  }, [modalPago]);

  useEffect(() => {
    if (vista === "registro") {
      setFechaFiltroVentas(new Date().toISOString().split("T")[0]);
      cargarVentas();
    }
  }, [vista]);

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

  const agregarAlPedido = (producto: ProductoVenta) => {
    const itemExistente = pedido.find(item => item.producto.id === producto.id);
    if (itemExistente) {
      setPedido(pedido.map(item => 
        item.producto.id === producto.id 
          ? { ...item, cantidad: item.cantidad + 1 }
          : item
      ));
    } else {
      setPedido([...pedido, { producto, cantidad: 1 }]);
    }
  };

  const eliminarDelPedido = (productoId: number) => {
    const item = pedido.find(i => i.producto.id === productoId);
    if (item && item.cantidad > 1) {
      setPedido(pedido.map(item => 
        item.producto.id === productoId 
          ? { ...item, cantidad: item.cantidad - 1 }
          : item
      ));
    } else {
      setPedido(pedido.filter(item => item.producto.id !== productoId));
    }
  };

  const getTotal = () => {
    return pedido.reduce((acc, item) => acc + (item.producto.precio * item.cantidad), 0);
  };

  const getTotalConPropina = () => {
    return getTotal() + propina;
  };

  const guardarPedido = async () => {
    if (pedido.length === 0) return;
    
    const ahora = new Date();
    const fecha = ahora.toISOString().split("T")[0];
    const hora = `${ahora.getHours().toString().padStart(2, '0')}:${ahora.getMinutes().toString().padStart(2, '0')}`;

    const totalConPropina = getTotalConPropina();
    const esMancoraGo = mesaSeleccionada === "Máncora Go!";
    const tipoVenta = esMancoraGo ? "delivery" : "salon";
    const comisionMancoraGo = esMancoraGo ? getTotal() * 0.10 : 0;
    const totalFinal = esMancoraGo ? totalConPropina - comisionMancoraGo : totalConPropina;

    try {
      const nuevoPedido = {
      id: Date.now(),
      tipo: tipoVenta,
      mesa: mesaSeleccionada,
      productos: pedido,
      total: getTotal(),
      totalConPropina: totalFinal,
      totalOriginal: getTotal(),
      comision: comisionMancoraGo,
      fecha,
      hora,
      usuario: nombreUsuario,
      estado: "completado",
      metodoPago,
      montoRecibido: metodoPago === "efectivo" ? montoRecibido : totalFinal,
      cambio: metodoPago === "efectivo" ? montoRecibido - totalFinal : 0,
      fechaCierre: null
    };
      const ventasRef = doc(db, "ventas", "pedidos");
      const ventasSnap = await getDoc(ventasRef);
      const pedidosAnteriores = ventasSnap.exists() ? ventasSnap.data().pedidos || [] : [];
      
      await import("firebase/firestore").then(async ({ setDoc }) => {
        await setDoc(ventasRef, { pedidos: [nuevoPedido, ...pedidosAnteriores] }, { merge: true });
      });
      
      // Registrar propina como egreso si existe
      if (propina > 0) {
        const egresosRef = doc(db, "caja", "egresos");
        const egresosSnap = await getDoc(egresosRef);
        const egresosAnteriores = egresosSnap.exists() ? egresosSnap.data().egresos || [] : [];
        
        const nuevoEgreso = {
          id: Date.now(),
          tipo: "propina",
          monto: propina,
          descripcion: "Propina - Mesa " + mesaSeleccionada,
          fecha,
          hora,
          usuario: nombreUsuario,
          metodoPago: metodoPago
        };
        
        await setDoc(egresosRef, { egresos: [nuevoEgreso, ...egresosAnteriores] }, { merge: true });
      }
      
      // Actualizar stock de inventario según consumo de recetas
      const inventarioRef = doc(db, "inventario", "productos");
      const inventarioSnap = await getDoc(inventarioRef);
      if (inventarioSnap.exists()) {
        const productosInventario = inventarioSnap.data().productos || [];
        
        // Calcular consumo por insumo
        const consumo: Record<number, number> = {};
        
        pedido.forEach((item: ItemPedido) => {
          const productoVentaId = item.producto.id;
          const cantidadVendida = item.cantidad;
          
          const recetasProducto = recetas.filter((r: any) => r.productoVentaId === productoVentaId);
          
          recetasProducto.forEach((receta: any) => {
            const insumoId = receta.insumoId;
            const cantidadConsumida = cantidadVendida * receta.cantidad;
            
            if (consumo[insumoId]) {
              consumo[insumoId] += cantidadConsumida;
            } else {
              consumo[insumoId] = cantidadConsumida;
            }
          });
        });
        
        // Actualizar stock
        const productosActualizados = productosInventario.map((p: any) => {
          if (consumo[p.id]) {
            return {
              ...p,
              stockActual: Math.max(0, (p.stockActual || 0) - consumo[p.id])
            };
          }
          return p;
        });
        
        await setDoc(inventarioRef, { productos: productosActualizados });
        setInventario(productosActualizados);
      }
      
      // Remove from pedidosAbiertos if exists
      const abiertosRef = doc(db, "ventas", "pedidosAbiertos");
      const abiertosSnap = await getDoc(abiertosRef);
      if (abiertosSnap.exists()) {
        const pedidosAbiertosData = abiertosSnap.data().pedidos || [];
        const pedidosFiltrados = pedidosAbiertosData.filter((p: any) => p.mesa !== mesaSeleccionada);
        await setDoc(abiertosRef, { pedidos: pedidosFiltrados }, { merge: true });
      }
      
      const nuevosPedidosMesas = { ...pedidosMesas };
      delete nuevosPedidosMesas[mesaSeleccionada];
      setPedidosMesas(nuevosPedidosMesas);
      setPedido([]);
      setTomarPedido(false);
      setModalPago(false);
      setMontoRecibido(0);
      setPropina(0);
      cargarVentas();
      cargarPedidosAbiertos();
    } catch (error) {
      console.error("Error guardando pedido:", error);
    }
  };

  const registrarMesa = async () => {
    if (pedido.length === 0) return;
    
    const ahora = new Date();
    const fecha = ahora.toISOString().split("T")[0];
    const hora = `${ahora.getHours().toString().padStart(2, '0')}:${ahora.getMinutes().toString().padStart(2, '0')}`;

    try {
      const abiertosRef = doc(db, "ventas", "pedidosAbiertos");
      const abiertosSnap = await getDoc(abiertosRef);
      const pedidosAnteriores = abiertosSnap.exists() ? abiertosSnap.data().pedidos || [] : [];
      
      // Check if there's already an open pedido for this mesa
      const pedidoExistente = pedidosAnteriores.find((p: any) => p.mesa === mesaSeleccionada && p.estado === "abierto");
      
      let productosActualizados = pedido.map((item: ItemPedido) => ({
        producto: item.producto,
        cantidad: item.cantidad,
        adicional: true // Mark all new products as adicional
      }));
      
      let nuevoTotal = getTotal();
      let nuevoId: number;
      
      if (pedidoExistente) {
        // Merge with existing pedido - add products as adicional
        const productosExistentes = pedidoExistente.productos || [];
        productosActualizados = [...productosExistentes, ...productosActualizados];
        nuevoTotal = productosActualizados.reduce((acc: number, item: any) => acc + (item.producto.precio * item.cantidad), 0);
        nuevoId = pedidoExistente.id;
      } else {
        // First pedido for this mesa - mark as not adicional
        productosActualizados = pedido.map((item: ItemPedido) => ({
          producto: item.producto,
          cantidad: item.cantidad,
          adicional: false
        }));
        nuevoId = Date.now();
      }

      const nuevoPedidoAbierto = {
        id: nuevoId,
        tipo: "salon",
        mesa: mesaSeleccionada,
        productos: productosActualizados,
        total: nuevoTotal,
        fecha,
        hora,
        usuario: nombreUsuario,
        estado: "abierto"
      };

      // Update the pedidosAbiertos
      let pedidosActualizados: any[];
      if (pedidoExistente) {
        // Replace existing pedido with updated one
        pedidosActualizados = pedidosAnteriores.map((p: any) => 
          p.mesa === mesaSeleccionada && p.estado === "abierto" ? nuevoPedidoAbierto : p
        );
      } else {
        // Add new pedido
        pedidosActualizados = [nuevoPedidoAbierto, ...pedidosAnteriores];
      }
      
      await setDoc(abiertosRef, { pedidos: pedidosActualizados }, { merge: true });
      
      const nuevosPedidosMesas = { ...pedidosMesas };
      delete nuevosPedidosMesas[mesaSeleccionada];
      setPedidosMesas(nuevosPedidosMesas);
      setPedido([]);
      setTomarPedido(false);
      cargarPedidosAbiertos();
    } catch (error) {
      console.error("Error registrando mesa:", error);
    }
  };

  const categorias = ["hamburguesa", "combos", "acompanamiento", "bebida"];

  const getCategoriaNombre = (cat: string) => {
    switch(cat) {
      case "hamburguesa": return "🍔 Hamburguesas";
      case "combos": return "📦 Combos";
      case "acompanamiento": return "🍟 Acompañamientos";
      case "bebida": return "🥤 Bebidas";
      default: return cat;
    }
  };

  return (
    <main className="min-h-screen bg-gray-100">
      <header className="bg-purple-600 text-white p-4">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">🛒 Ventas</h1>
          <div className="flex gap-2">
            <button onClick={() => router.push("/menu")} className="bg-purple-700 px-4 py-2 rounded hover:bg-purple-800">
              ← Menú Principal
            </button>
            <button onClick={cerrarSesion} className="bg-red-500 px-4 py-2 rounded hover:bg-red-600">
              Cerrar Sesión
            </button>
          </div>
        </div>
      </header>
      
      <div className="container mx-auto p-4">
        <div className="flex gap-2 mb-4">
          <button 
            onClick={() => setVista("salon")} 
            className={`px-4 py-2 rounded ${vista === "salon" ? "bg-purple-600 text-white" : "bg-white text-gray-700"}`}
          >
            🏠 Salón
          </button>
          <button 
            onClick={() => setVista("delivery")} 
            className={`px-4 py-2 rounded ${vista === "delivery" ? "bg-purple-600 text-white" : "bg-white text-gray-700"}`}
          >
            🛵 Delivery
          </button>
          <button 
            onClick={() => setVista("registro")} 
            className={`px-4 py-2 rounded ${vista === "registro" ? "bg-purple-600 text-white" : "bg-white text-gray-700"}`}
          >
            📊 Registro de Ventas
          </button>
        </div>

        {vista === "salon" && (
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">🏠 Ventas en Salón</h2>
              {!tomarPedido && (
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      setPedido(pedidosMesas[mesaSeleccionada] || []);
                      setTomarPedido(true);
                    }}
                    className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
                  >
                    🍔 Tomar Pedido
                  </button>
                  <button 
                    onClick={() => {
                      cargarPedidosAbiertos();
                    }}
                    className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600"
                  >
                    📋 Registro de Mesas ({pedidosAbiertos.length})
                  </button>
                </div>
              )}
            </div>

            {tomarPedido && (
              <div className="mb-4">
                <div className="flex flex-wrap gap-2 mb-4">
                  {["Mesa 1", "Mesa 2", "Mesa 3", "Mesa 4", "Mesa 5", "Mesa 6", "Llevar", "Máncora Go!"].map(mesa => (
                    <button
                      key={mesa}
                      onClick={() => {
                        setMesaSeleccionada(mesa);
                        setPedido(pedidosMesas[mesa] || []);
                      }}
                      className={`px-4 py-2 rounded ${mesaSeleccionada === mesa ? "bg-purple-600 text-white" : "bg-gray-200"}`}
                    >
                      {mesa}
                    </button>
                  ))}
                </div>

                <div className="flex justify-end mb-4">
                  <button 
                    onClick={() => { 
                      if (pedido.length > 0) {
                        setPedidosMesas({ ...pedidosMesas, [mesaSeleccionada]: pedido });
                      }
                      setPedido([]); 
                      setTomarPedido(false); 
                    }}
                    className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                  >
                    ← Volver
                  </button>
                </div>

                <div className="flex gap-2 mb-4">
                  {categorias.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setCategoriaSeleccionada(cat)}
                      className={`px-4 py-2 rounded ${categoriaSeleccionada === cat ? "bg-purple-600 text-white" : "bg-gray-200"}`}
                    >
                      {getCategoriaNombre(cat)}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">
                  {productos
                    .filter(p => p.categoria === categoriaSeleccionada)
                    .map(producto => (
                      <button
                        key={producto.id}
                        onClick={() => agregarAlPedido(producto)}
                        className="border-2 border-gray-200 rounded-lg p-4 hover:border-purple-500 hover:bg-purple-50 transition"
                      >
                        <p className="font-bold text-gray-800">{producto.nombre}</p>
                        <p className="text-purple-600 font-bold">S/.{producto.precio.toFixed(2)}</p>
                      </button>
                    ))}
                </div>

                {pedido.length > 0 && (
                  <div className="border-t pt-4 mt-4">
                    <h3 className="font-bold mb-2">📝 Pedido - {mesaSeleccionada}:</h3>
                    <div className="space-y-2 mb-4">
                      {pedido.map((item, index) => (
                        <div key={index} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                          <div className="flex items-center gap-2">
                            <span>{item.producto.nombre}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => eliminarDelPedido(item.producto.id)}
                              className="text-red-500 font-bold"
                            >
                              -
                            </button>
                            <span className="font-bold">{item.cantidad}</span>
                            <button 
                              onClick={() => agregarAlPedido(item.producto)}
                              className="text-green-500 font-bold"
                            >
                              +
                            </button>
                            <span className="ml-2 font-bold">S/.{(item.producto.precio * item.cantidad).toFixed(2)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between items-center bg-purple-100 p-4 rounded">
                      <span className="font-bold text-lg">Total:</span>
                      <span className="font-bold text-xl text-purple-700">S/.{getTotal().toFixed(2)}</span>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <button 
                        onClick={() => { setPedido([]); setTomarPedido(false); }}
                        className="flex-1 bg-gray-300 text-gray-700 py-2 rounded hover:bg-gray-400"
                      >
                        Cancelar
                      </button>
                      <button 
                        onClick={registrarMesa}
                        className="flex-1 bg-orange-500 text-white py-2 rounded hover:bg-orange-600"
                      >
                        Registrar Mesa
                      </button>
                      <button 
                        onClick={() => setModalPago(true)}
                        className="flex-1 bg-green-600 text-white py-2 rounded hover:bg-green-700"
                      >
                        Siguiente
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {!tomarPedido && pedidosAbiertos.length > 0 && (
              <div className="mt-4">
                <h3 className="font-bold mb-2">📋 Mesas Abiertas ({pedidosAbiertos.length})</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {pedidosAbiertos.map((pa: any) => (
                    <div key={pa.id} className="border-2 border-orange-300 rounded-lg p-3 bg-orange-50">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-bold text-lg">{pa.mesa}</span>
                        <span className="text-sm text-gray-500">{pa.hora}</span>
                      </div>
                      <div className="text-sm mb-2">
                        {pa.productos?.map((p: any, i: number) => (
                          <div key={i} className="flex items-center justify-between gap-1 py-1">
                            <div className="flex items-center gap-1">
                              <span>{p.cantidad}x {p.producto?.nombre}</span>
                              {p.adicional && (
                                <span className="text-xs bg-orange-200 text-orange-700 px-1 rounded">adicional</span>
                              )}
                            </div>
                            <button 
                              onClick={async () => {
                                // Remove this item from the pedido
                                const productosActualizados = pa.productos.filter((_: any, idx: number) => idx !== i);
                                const nuevoTotal = productosActualizados.reduce((acc: number, item: any) => acc + (item.producto.precio * item.cantidad), 0);
                                
                                const pedidoActualizado = {
                                  ...pa,
                                  productos: productosActualizados,
                                  total: nuevoTotal,
                                  hora: `${new Date().getHours().toString().padStart(2, '0')}:${new Date().getMinutes().toString().padStart(2, '0')}`
                                };
                                
                                try {
                                  const abiertosRef = doc(db, "ventas", "pedidosAbiertos");
                                  const abiertosSnap = await getDoc(abiertosRef);
                                  if (abiertosSnap.exists()) {
                                    const pedidosData = abiertosSnap.data().pedidos || [];
                                    const pedidosActualizados = pedidosData.map((p: any) => 
                                      p.id === pa.id ? pedidoActualizado : p
                                    );
                                    await setDoc(abiertosRef, { pedidos: pedidosActualizados }, { merge: true });
                                    cargarPedidosAbiertos();
                                  }
                                } catch (error) {
                                  console.error("Error eliminando item:", error);
                                }
                              }}
                              className="text-red-500 hover:text-red-700 text-xs font-bold ml-2"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <span className="font-bold text-orange-600">S/.{pa.total?.toFixed(2)}</span>
                        <button 
                          onClick={async () => {
                            // If all items are deleted, remove the pedido completely
                            if (pa.productos.length === 0) {
                              try {
                                const abiertosRef = doc(db, "ventas", "pedidosAbiertos");
                                const abiertosSnap = await getDoc(abiertosRef);
                                if (abiertosSnap.exists()) {
                                  const pedidosData = abiertosSnap.data().pedidos || [];
                                  const pedidosFiltrados = pedidosData.filter((p: any) => p.id !== pa.id);
                                  await setDoc(abiertosRef, { pedidos: pedidosFiltrados }, { merge: true });
                                  cargarPedidosAbiertos();
                                }
                              } catch (error) {
                                console.error("Error eliminando pedido:", error);
                              }
                              return;
                            }
                            
                            setMesaSeleccionada(pa.mesa);
                            setPedido(pa.productos);
                            setTomarPedido(true);
                            setModalPago(true);
                          }}
                          className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600"
                        >
                          Cobrar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {vista === "delivery" && (
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">🛵 Ventas Delivery - Máncora Go!</h2>
              <button
                onClick={() => setVerRegistroDelivery(!verRegistroDelivery)}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                📋 {verRegistroDelivery ? "← Resumen" : "Registro de Delivery"}
              </button>
            </div>
            
            <div className="bg-orange-100 p-4 rounded-lg mb-4">
              <p className="text-orange-800 font-bold">Comisión Máncora Go!: 10%</p>
              <p className="text-sm text-orange-600">Las ventas desde Máncora Go! se registran desde el módulo de Salón.</p>
            </div>
            
            {verRegistroDelivery ? (
              <>
                <div className="flex items-center gap-4 mb-4">
                  <label className="text-sm font-bold">Filtrar por fecha:</label>
                  <input 
                    type="date" 
                    className="border p-2 rounded"
                    value={fechaFiltroDelivery}
                    onChange={(e) => setFechaFiltroDelivery(e.target.value)}
                  />
                </div>
                
                {(() => {
                  const deliveryVentas = [...ventas.filter(v => v.tipo === "delivery" && v.fecha === fechaFiltroDelivery)]
                    .sort((a, b) => {
                      const aTime = a.hora.split(':').map(Number);
                      const bTime = b.hora.split(':').map(Number);
                      const aMinutes = aTime[0] * 60 + aTime[1];
                      const bMinutes = bTime[0] * 60 + bTime[1];
                      return bMinutes - aMinutes;
                    });
                  const totalDelivery = deliveryVentas.reduce((acc, v) => acc + (v.totalConPropina || 0), 0);
                  const totalComision = deliveryVentas.reduce((acc, v) => acc + (v.comision || 0), 0);
                  const totalOriginal = deliveryVentas.reduce((acc, v) => acc + (v.totalOriginal || v.total || 0), 0);
                  
                  return (
                    <>
                      {deliveryVentas.length > 0 && (
                        <div className="bg-green-100 p-4 rounded-lg mb-4">
                          <p className="text-green-800 font-bold">Delivery ({fechaFiltroDelivery}): S/.{totalDelivery.toFixed(2)}</p>
                          <div className="flex flex-wrap gap-4 mt-2 pt-2 border-t border-green-200">
                            <span className="text-sm">Total Ventas: <strong>S/.{totalOriginal.toFixed(2)}</strong></span>
                            <span className="text-sm text-orange-600">Comisiones (-10%): <strong>-S/.{totalComision.toFixed(2)}</strong></span>
                            <span className="text-sm font-bold">Pedidos: <strong>{deliveryVentas.length}</strong></span>
                          </div>
                        </div>
                      )}
                      
                      {deliveryVentas.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">No hay ventas de delivery en esta fecha.</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-gray-200">
                                <th className="p-2 text-left">Hora</th>
                                <th className="p-2 text-left">Productos</th>
                                <th className="p-2 text-right">Subtotal</th>
                                <th className="p-2 text-right">Comisión</th>
                                <th className="p-2 text-right">Total Recibido</th>
                                <th className="p-2 text-left">Usuario</th>
                              </tr>
                            </thead>
                            <tbody>
                              {deliveryVentas.map((v: any, idx: number) => (
                                <tr key={idx} className="border-b">
                                  <td className="p-2">{v.hora}</td>
                                  <td className="p-2">
                                    {v.productos?.map((p: any, i: number) => (
                                      <span key={i} className="text-xs block">
                                        {p.cantidad}x {p.producto?.nombre}
                                      </span>
                                    ))}
                                  </td>
                                  <td className="p-2 text-right">S/.{(v.totalOriginal || v.total || 0).toFixed(2)}</td>
                                  <td className="p-2 text-right text-orange-600">-S/.{(v.comision || 0).toFixed(2)}</td>
                                  <td className="p-2 text-right font-bold text-green-600">S/.{(v.totalConPropina || 0).toFixed(2)}</td>
                                  <td className="p-2">
                                    <span className="px-2 py-1 rounded text-white text-xs bg-gray-500">
                                      {v.usuario || "-"}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </>
                  );
                })()}
              </>
            ) : (
              <>
                {(() => {
                  const deliveryVentas = ventas.filter(v => v.tipo === "delivery");
                  const totalDelivery = deliveryVentas.reduce((acc, v) => acc + (v.totalConPropina || 0), 0);
                  const totalComision = deliveryVentas.reduce((acc, v) => acc + (v.comision || 0), 0);
                  
                  return (
                    <>
                      {deliveryVentas.length > 0 && (
                        <div className="bg-green-100 p-4 rounded-lg mb-4">
                          <p className="text-green-800 font-bold">Total Delivery Hoy: S/.{totalDelivery.toFixed(2)}</p>
                          <p className="text-sm text-green-600">Total Comisiones: S/.{totalComision.toFixed(2)}</p>
                          <p className="text-sm text-green-600">{deliveryVentas.length} pedidos</p>
                        </div>
                      )}
                      
                      {deliveryVentas.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">No hay ventas de delivery registradas.</p>
                      ) : (
                        <div className="space-y-3">
                          {deliveryVentas
                            .sort((a, b) => {
                              const aTime = a.hora.split(':').map(Number);
                              const bTime = b.hora.split(':').map(Number);
                              const aMinutes = aTime[0] * 60 + aTime[1];
                              const bMinutes = bTime[0] * 60 + bTime[1];
                              return bMinutes - aMinutes;
                            })
                            .map((v: any) => (
                              <div key={v.id} className="border rounded-lg p-4 bg-orange-50">
                                <div className="flex justify-between items-center mb-2">
                                  <span className="font-bold">🛵 {v.mesa}</span>
                                  <span className="text-sm text-gray-500">{v.hora}</span>
                                </div>
                                <div className="text-sm space-y-1 mb-2">
                                  {v.productos?.map((p: any, i: number) => (
                                    <div key={i} className="flex justify-between">
                                      <span>{p.cantidad}x {p.producto?.nombre}</span>
                                      <span>S/.{(p.producto?.precio * p.cantidad).toFixed(2)}</span>
                                    </div>
                                  ))}
                                </div>
                                <div className="border-t pt-2 mt-2">
                                  <div className="flex justify-between text-sm">
                                    <span>Subtotal:</span>
                                    <span>S/.{(v.totalOriginal || v.total || 0).toFixed(2)}</span>
                                  </div>
                                  {v.comision > 0 && (
                                    <div className="flex justify-between text-sm text-orange-600">
                                      <span>Comisión (-10%):</span>
                                      <span>-S/.{v.comision.toFixed(2)}</span>
                                    </div>
                                  )}
                                  <div className="flex justify-between font-bold text-green-600">
                                    <span>Total Recibido:</span>
                                    <span>S/.{(v.totalConPropina || 0).toFixed(2)}</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
                    </>
                  );
                })()}
              </>
            )}
          </div>
        )}

        {vista === "registro" && (
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-lg font-bold mb-4">📊 Registro de Ventas</h2>
            
            <div className="flex items-center gap-4 mb-4">
              <label className="text-sm font-bold">Filtrar por fecha:</label>
              <input 
                type="date" 
                className="border p-2 rounded"
                value={fechaFiltroVentas}
                onChange={(e) => setFechaFiltroVentas(e.target.value)}
              />
            </div>

            {(() => {
              const ventasFiltradas = [...ventas.filter(v => v.fecha === fechaFiltroVentas)]
                .sort((a, b) => {
                  const aTime = a.hora.split(':').map(Number);
                  const bTime = b.hora.split(':').map(Number);
                  const aMinutes = aTime[0] * 60 + aTime[1];
                  const bMinutes = bTime[0] * 60 + bTime[1];
                  return bMinutes - aMinutes;
                });
              const totalDia = ventasFiltradas.reduce((acc, v) => acc + (v.totalConPropina || v.total || 0), 0);
              const totalPropinas = ventasFiltradas.reduce((acc, v) => acc + (v.propina || 0), 0);
              const totalEfectivo = ventasFiltradas.filter(v => v.metodoPago === "efectivo").reduce((acc, v) => acc + (v.totalConPropina || v.total || 0), 0);
              const totalYape = ventasFiltradas.filter(v => v.metodoPago === "yape").reduce((acc, v) => acc + (v.totalConPropina || v.total || 0), 0);
              const totalPos = ventasFiltradas.filter(v => v.metodoPago === "pos").reduce((acc, v) => acc + (v.totalConPropina || v.total || 0), 0);
              
              return (
                <>
                  <div className="bg-purple-100 p-4 rounded mb-4">
                    <p className="text-purple-800 font-bold">Total del día ({fechaFiltroVentas}): S/.{totalDia.toFixed(2)}</p>
                    <p className="text-sm text-purple-600">{ventasFiltradas.length} ventas</p>
                    {totalPropinas > 0 && (
                      <p className="text-sm text-green-600">Propinas: S/.{totalPropinas.toFixed(2)}</p>
                    )}
                    <div className="flex flex-wrap gap-4 mt-2 pt-2 border-t border-purple-200">
                      <span className="text-sm bg-green-100 px-2 py-1 rounded">💵 Efectivo: <strong>S/.{totalEfectivo.toFixed(2)}</strong></span>
                      <span className="text-sm bg-orange-100 px-2 py-1 rounded">📱 Yape: <strong>S/.{totalYape.toFixed(2)}</strong></span>
                      <span className="text-sm bg-blue-100 px-2 py-1 rounded">💳 POS: <strong>S/.{totalPos.toFixed(2)}</strong></span>
                    </div>
                  </div>

                  {ventasFiltradas.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No hay ventas en esta fecha.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-200">
                            <th className="p-2 text-left">Hora</th>
                            <th className="p-2 text-left">Tipo</th>
                            <th className="p-2 text-left">Mesa</th>
                            <th className="p-2 text-left">Productos</th>
                            <th className="p-2 text-right">Total</th>
                            <th className="p-2 text-right">Propina</th>
                            <th className="p-2 text-left">Método</th>
                            <th className="p-2 text-left">Usuario</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ventasFiltradas.map((v, idx) => (
                            <tr key={idx} className="border-b">
                              <td className="p-2">{v.hora}</td>
                              <td className="p-2">
                                <span className={`px-2 py-1 rounded text-white text-xs ${v.tipo === "salon" ? "bg-blue-500" : "bg-orange-500"}`}>
                                  {v.tipo === "salon" ? "Salón" : "Delivery"}
                                </span>
                              </td>
                              <td className="p-2">{v.mesa || "-"}</td>
                              <td className="p-2">
                                {v.productos?.map((p: any, i: number) => (
                                  <span key={i} className="text-xs">
                                    {p.cantidad}x{p.producto?.nombre}{i < v.productos.length - 1 ? ", " : ""}
                                  </span>
                                ))}
                              </td>
                              <td className="p-2 text-right font-bold">S/.{(v.totalConPropina || v.total || 0).toFixed(2)}</td>
                              <td className="p-2 text-right text-green-600 font-bold">
                                {v.propina > 0 ? `S/.${v.propina.toFixed(2)}` : "-"}
                              </td>
                              <td className="p-2">
                                <span className={`px-2 py-1 rounded text-white text-xs ${
                                  v.metodoPago === "efectivo" ? "bg-green-500" : 
                                  v.metodoPago === "yape" ? "bg-orange-500" : 
                                  "bg-blue-500"
                                }`}>
                                  {v.metodoPago === "efectivo" ? "Efectivo" : 
                                   v.metodoPago === "yape" ? "Yape" : "POS"}
                                </span>
                              </td>
                              <td className="p-2">
                                <span className={`px-2 py-1 rounded text-white text-xs ${
                                  v.usuario?.toLowerCase() === "admin" ? "bg-purple-600" : 
                                  v.usuario?.toLowerCase() === "cubas" ? "bg-orange-500" : 
                                  v.usuario?.toLowerCase() === "cocina1" ? "bg-blue-600" : 
                                  "bg-gray-500"
                                }`}>
                                  {v.usuario || "-"}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div className="mt-8 border-t pt-6">
                    <h3 className="text-lg font-bold mb-4">📦 Consumo y Costos</h3>
                    
                    {(() => {
                      const consumo: Record<string, { nombre: string; unidad: string; cantidad: number; costoUnitario: number; stockActual: number }> = {};
                      
                      ventasFiltradas.forEach(venta => {
                        venta.productos?.forEach((item: any) => {
                          const productoVentaId = item.producto?.id;
                          const cantidadVendida = item.cantidad;
                          
                          if (!productoVentaId) return;
                          
                          const recetasProducto = recetas.filter((r: any) => r.productoVentaId === productoVentaId);
                          
                          recetasProducto.forEach((receta: any) => {
                            const insumo = inventario.find((i: any) => i.id === receta.insumoId);
                            if (!insumo) return;
                            
                            const cantidadConsumida = cantidadVendida * receta.cantidad;
                            const costoConsumido = cantidadConsumida * (insumo.precioCompra || 0);
                            
                            if (consumo[receta.insumoId]) {
                              consumo[receta.insumoId].cantidad += cantidadConsumida;
                            } else {
                              consumo[receta.insumoId] = {
                                nombre: insumo.nombre,
                                unidad: insumo.unidad || "und",
                                cantidad: cantidadConsumida,
                                costoUnitario: insumo.precioCompra || 0,
                                stockActual: insumo.stockActual || 0
                              };
                            }
                          });
                        });
                      });
                      
                      const totalCosto = Object.values(consumo).reduce((acc, item) => acc + (item.cantidad * item.costoUnitario), 0);
                      const totalVentasNetas = totalDia - totalPropinas;
                      const gananciaAproximada = totalVentasNetas - totalCosto;
                      const margenPorcentaje = totalVentasNetas > 0 ? (gananciaAproximada / totalVentasNetas * 100) : 0;
                      
                      const consumoArray = Object.entries(consumo);
                      
                      return (
                        <>
                          <div className="grid grid-cols-3 gap-4 mb-4">
                            <div className="bg-blue-100 p-4 rounded-lg text-center">
                              <p className="text-sm text-blue-600">Costo Total</p>
                              <p className="text-2xl font-bold text-blue-800">S/.{totalCosto.toFixed(2)}</p>
                            </div>
                            <div className="bg-green-100 p-4 rounded-lg text-center">
                              <p className="text-sm text-green-600">Ganancia Aproximada</p>
                              <p className="text-2xl font-bold text-green-800">S/.{gananciaAproximada.toFixed(2)}</p>
                            </div>
                            <div className="bg-purple-100 p-4 rounded-lg text-center">
                              <p className="text-sm text-purple-600">Margen de Ganancia</p>
                              <p className="text-2xl font-bold text-purple-800">{margenPorcentaje.toFixed(1)}%</p>
                            </div>
                          </div>
                          
                          {consumoArray.length > 0 ? (
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="bg-gray-200">
                                    <th className="p-2 text-left">Insumo</th>
                                    <th className="p-2 text-right">Stock Actual</th>
                                    <th className="p-2 text-right">Consumido</th>
                                    <th className="p-2 text-right">Nuevo Stock</th>
                                    <th className="p-2 text-right">Costo Unit.</th>
                                    <th className="p-2 text-right">Costo Total</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {consumoArray.map(([id, item]: [string, any]) => {
                                    const nuevoStock = item.stockActual - item.cantidad;
                                    const esBajoStock = nuevoStock < (inventario.find((i: any) => i.id === Number(id))?.stockMinimo || 0);
                                    return (
                                      <tr key={id} className={`border-b ${esBajoStock ? "bg-red-50" : ""}`}>
                                        <td className="p-2 font-medium">{item.nombre}</td>
                                        <td className="p-2 text-right">{item.stockActual.toFixed(2)} {item.unidad}</td>
                                        <td className="p-2 text-right text-red-600">-{item.cantidad.toFixed(2)} {item.unidad}</td>
                                        <td className={`p-2 text-right font-bold ${esBajoStock ? "text-red-600" : "text-green-600"}`}>
                                          {nuevoStock.toFixed(2)} {item.unidad}
                                          {esBajoStock && " ⚠️"}
                                        </td>
                                        <td className="p-2 text-right">S/.{item.costoUnitario.toFixed(2)}</td>
                                        <td className="p-2 text-right">S/.{(item.cantidad * item.costoUnitario).toFixed(2)}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <p className="text-gray-500 text-center py-4">No hay consumo registrado para esta fecha.</p>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </>
              );
            })()}
          </div>
        )}
      </div>

      {modalPago && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">💳 Método de Pago</h2>
            
            <div className="mb-3 bg-gray-100 rounded p-3 max-h-40 overflow-y-auto">
              <h3 className="font-bold text-sm mb-2">📋 Pedido - {mesaSeleccionada}:</h3>
              {pedido.map((item: any, index: number) => (
                <div key={index} className="flex justify-between text-sm py-1">
                  <span>{item.cantidad}x {item.producto.nombre}</span>
                  <span className="font-bold">S/.{(item.producto.precio * item.cantidad).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="mb-4">
              {mesaSeleccionada === "Máncora Go!" ? (
                <div className="bg-orange-50 border border-orange-200 rounded p-3">
                  <p className="font-bold text-lg mb-1">🛵 Venta Máncora Go!</p>
                  <div className="text-sm space-y-1">
                    <p className="flex justify-between">
                      <span>Subtotal:</span>
                      <span className="font-bold">S/.{getTotal().toFixed(2)}</span>
                    </p>
                    {propina > 0 && (
                      <p className="flex justify-between text-green-600">
                        <span>Propina:</span>
                        <span className="font-bold">+ S/.{propina.toFixed(2)}</span>
                      </p>
                    )}
                    <p className="flex justify-between text-orange-600">
                      <span>Comisión (-10%):</span>
                      <span className="font-bold">- S/.{(getTotal() * 0.10).toFixed(2)}</span>
                    </p>
                    <p className="flex justify-between text-lg font-bold border-t pt-1 mt-1">
                      <span>Total a Recibir:</span>
                      <span className="text-green-600">S/.{(getTotalConPropina() - getTotal() * 0.10).toFixed(2)}</span>
                    </p>
                  </div>
                </div>
              ) : (
                <p className="font-bold text-lg mb-1">Total a pagar: <span className="text-green-600">S/.{getTotalConPropina().toFixed(2)}</span></p>
              )}
            </div>

            <div className="flex gap-2 mb-4">
              <button 
                onClick={() => setMetodoPago("efectivo")}
                className={`flex-1 py-3 rounded ${metodoPago === "efectivo" ? "bg-green-600 text-white" : "bg-gray-200"}`}
              >
                💵 Efectivo
              </button>
              <button 
                onClick={() => setMetodoPago("yape")}
                className={`flex-1 py-3 rounded ${metodoPago === "yape" ? "bg-green-600 text-white" : "bg-gray-200"}`}
              >
                📱 Yape
              </button>
              <button 
                onClick={() => setMetodoPago("pos")}
                className={`flex-1 py-3 rounded ${metodoPago === "pos" ? "bg-green-600 text-white" : "bg-gray-200"}`}
              >
                💳 POS
              </button>
            </div>

            <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded p-3">
              <label className="block text-gray-700 font-bold mb-1">🍽 Propina:</label>
              <input 
                type="number" 
                step="0.01"
                min="0"
                className="w-full border p-2 rounded text-lg"
                value={propina || ""}
                onChange={(e) => setPropina(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
              />
            </div>

            {(() => {
              const totalConComision = mesaSeleccionada === "Máncora Go!" ? getTotalConPropina() - getTotal() * 0.10 : getTotalConPropina();
              return (
                <>
                  {metodoPago === "efectivo" && (
                    <div className="mb-4">
                      <label className="block text-gray-700 font-bold mb-1">Monto que paga el cliente:</label>
                      <input 
                        type="number" 
                        step="0.01"
                        className="w-full border p-2 rounded text-lg"
                        value={montoRecibido || ""}
                        onChange={(e) => setMontoRecibido(parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                      />
                      {montoRecibido > 0 && (
                        <div className="mt-4 bg-blue-100 p-4 rounded">
                          <p className="text-gray-700">Subtotal: <span className="font-bold">S/.{getTotal().toFixed(2)}</span></p>
                          {propina > 0 && (
                            <p className="text-gray-700">Propina: <span className="font-bold text-green-600">S/.{propina.toFixed(2)}</span></p>
                          )}
                          {mesaSeleccionada === "Máncora Go!" && (
                            <p className="text-orange-600">Comisión (-10%): <span className="font-bold">-S/.{(getTotal() * 0.10).toFixed(2)}</span></p>
                          )}
                          <p className="text-gray-700 font-bold border-t pt-1 mt-1">Total: S/.{totalConComision.toFixed(2)}</p>
                          <p className="text-gray-700 mt-2">Paga: <span className="font-bold">S/.{montoRecibido.toFixed(2)}</span></p>
                          <p className="text-xl font-bold mt-2">
                            Cambio: <span className="text-green-600">S/.{(montoRecibido - totalConComision).toFixed(2)}</span>
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {metodoPago !== "efectivo" && (
                    <div className="mb-4 bg-blue-50 p-3 rounded">
                      <p className="text-gray-700">Subtotal: <span className="font-bold">S/.{getTotal().toFixed(2)}</span></p>
                      {propina > 0 && (
                        <p className="text-gray-700">Propina: <span className="font-bold text-green-600">S/.{propina.toFixed(2)}</span></p>
                      )}
                      {mesaSeleccionada === "Máncora Go!" && (
                        <p className="text-orange-600">Comisión (-10%): <span className="font-bold">-S/.{(getTotal() * 0.10).toFixed(2)}</span></p>
                      )}
                      <p className="text-gray-700 font-bold border-t pt-1 mt-1">Total a pagar: S/.{totalConComision.toFixed(2)}</p>
                    </div>
                  )}
                </>
              );
            })()}

            <div className="flex gap-2 mt-4">
              <button 
                onClick={() => { setModalPago(false); setMontoRecibido(0); setPropina(0); }}
                className="flex-1 bg-gray-300 text-gray-700 py-2 rounded hover:bg-gray-400"
              >
                Cancelar
              </button>
              <button 
                onClick={guardarPedido}
                disabled={metodoPago === "efectivo" && montoRecibido < (mesaSeleccionada === "Máncora Go!" ? getTotalConPropina() - getTotal() * 0.10 : getTotalConPropina())}
                className={`flex-1 py-2 rounded ${metodoPago === "efectivo" && montoRecibido < (mesaSeleccionada === "Máncora Go!" ? getTotalConPropina() - getTotal() * 0.10 : getTotalConPropina()) ? "bg-gray-400 cursor-not-allowed" : "bg-green-600 text-white hover:bg-green-700"}`}
              >
                Confirmar Pago
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
