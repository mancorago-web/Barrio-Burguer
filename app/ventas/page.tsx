"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import * as XLSX from "xlsx";
import { getFreshServerDate } from "@/lib/serverDate";

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
  const [vista, setVista] = useState<"salon" | "delivery" | "registro" | "cocina">("salon");
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
  const [fechaFiltroVentas, setFechaFiltroVentas] = useState("");
  const [verRegistroDelivery, setVerRegistroDelivery] = useState(false);
  const [fechaFiltroDelivery, setFechaFiltroDelivery] = useState("");
  const [mesaSeleccionada, setMesaSeleccionada] = useState<string>("Mesa 1");
  const [pedidosMesas, setPedidosMesas] = useState<Record<string, ItemPedido[]>>({});
  const [pedidosAbiertos, setPedidosAbiertos] = useState<any[]>([]);
  const [recetas, setRecetas] = useState<any[]>([]);
  const [inventario, setInventario] = useState<any[]>([]);
  const [guardandoPedido, setGuardandoPedido] = useState(false);
  const [pedidosCocina, setPedidosCocina] = useState<any[]>([]);
  const [verRegistroCocina, setVerRegistroCocina] = useState(false);
  const [fechaFiltroCocina, setFechaFiltroCocina] = useState("");
  const [rol, setRol] = useState<string>("cocina");

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
      const userRol = userDoc.data().rol || "cocina";
      setNombreUsuario(nombre);
      setRol(userRol);
      setVerificando(false);
    });
    
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    const initializeDates = () => {
      const now = new Date();
      const formatter = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Lima",
      });
      const localDate = formatter.format(now);
      setFechaFiltroVentas(localDate);
      setFechaFiltroDelivery(localDate);
      setFechaFiltroCocina(localDate);
    };
    initializeDates();
  }, []);

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
      const formatter = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima" });
      setFechaFiltroVentas(formatter.format(new Date()));
      cargarVentas();
    }
  }, [vista]);

  useEffect(() => {
    if (vista === "cocina") {
      const cocinaRef = doc(db, "cocina", "pedidos");
      const unsubscribe = onSnapshot(cocinaRef, (snapshot) => {
        if (snapshot.exists()) {
          setPedidosCocina(snapshot.data().pedidos || []);
        } else {
          setPedidosCocina([]);
        }
      });
      return () => unsubscribe();
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

  const marcarPedidoListo = async (pedidoId: number) => {
    try {
      const cocinaRef = doc(db, "cocina", "pedidos");
      const cocinaSnap = await getDoc(cocinaRef);
      if (cocinaSnap.exists()) {
        const pedidosActualizados = cocinaSnap.data().pedidos.map((p: any) => 
          p.id === pedidoId ? { ...p, estado: "listo" } : p
        );
        await setDoc(cocinaRef, { pedidos: pedidosActualizados }, { merge: true });
        setPedidosCocina(pedidosActualizados);
      }
    } catch (error) {
      console.error("Error marcando pedido como listo:", error);
    }
  };

  const getTotalConPropina = () => {
    return getTotal() + propina;
  };

  const eliminarVenta = async (id: number) => {
    if (!confirm("¿Estás seguro de eliminar esta venta?")) return;
    
    try {
      const ventasRef = doc(db, "ventas", "pedidos");
      const ventasSnap = await getDoc(ventasRef);
      const pedidosAnteriores = ventasSnap.exists() ? ventasSnap.data().pedidos || [] : [];
      
      const pedidosActualizados = pedidosAnteriores.map((p: any) => {
        if (p.id === id) {
          return { ...p, eliminado: true, fechaEliminacion: new Date().toISOString() };
        }
        return p;
      });
      
      await setDoc(ventasRef, { pedidos: pedidosActualizados }, { merge: true });
      
      setVentas(pedidosActualizados);
      alert("Venta marcada como eliminada");
    } catch (error) {
      console.error("Error eliminando venta:", error);
      alert("Error al eliminar la venta");
    }
  };

  const guardarPedido = async () => {
    if (pedido.length === 0 || guardandoPedido) return;
    
    setGuardandoPedido(true);
    
    const serverDate = await getFreshServerDate();
    const { fecha, hora } = serverDate;

    const esPersonal = mesaSeleccionada === "Personal";
    const totalOriginal = getTotal();
    const totalBase = esPersonal ? 0 : totalOriginal;
    const totalConPropina = esPersonal ? 0 : getTotalConPropina();
    const esMancoraGo = mesaSeleccionada === "Máncora Go!";
    const tipoVenta = esMancoraGo ? "delivery" : esPersonal ? "personal" : "salon";
    const comisionMancoraGo = esMancoraGo ? getTotal() * 0.10 : 0;
    const totalFinal = esPersonal ? 0 : (esMancoraGo ? totalConPropina - comisionMancoraGo : totalConPropina);

    try {
      const nuevoPedido = {
      id: Date.now(),
      tipo: tipoVenta,
      mesa: mesaSeleccionada,
      productos: pedido,
      total: totalBase,
      totalConPropina: totalFinal,
      totalOriginal: totalOriginal,
      comision: comisionMancoraGo,
      fecha,
      hora,
      usuario: nombreUsuario,
      estado: "completado",
      metodoPago: esPersonal ? "personal" : metodoPago,
      montoRecibido: esPersonal ? 0 : (metodoPago === "efectivo" ? montoRecibido : totalFinal),
      cambio: esPersonal ? 0 : (metodoPago === "efectivo" ? montoRecibido - totalFinal : 0),
      fechaCierre: null,
      propina: 0,
      esPersonal: esPersonal
    };
      const ventasRef = doc(db, "ventas", "pedidos");
      const ventasSnap = await getDoc(ventasRef);
      const pedidosAnteriores = ventasSnap.exists() ? ventasSnap.data().pedidos || [] : [];
      
      await setDoc(ventasRef, { pedidos: [nuevoPedido, ...pedidosAnteriores] }, { merge: true });
      
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
      
      // Enviar copia a cocina
      const cocinaRef = doc(db, "cocina", "pedidos");
      const cocinaSnap = await getDoc(cocinaRef);
      const pedidosCocinaAnteriores = cocinaSnap.exists() ? cocinaSnap.data().pedidos || [] : [];
      
      const pedidoCocina = {
        id: Date.now(),
        mesa: mesaSeleccionada,
        productos: pedido.map((item: ItemPedido) => ({
          nombre: item.producto.nombre,
          cantidad: item.cantidad
        })),
        hora,
        fecha,
        usuario: nombreUsuario,
        estado: "pendiente"
      };
      
      await setDoc(cocinaRef, { pedidos: [pedidoCocina, ...pedidosCocinaAnteriores] }, { merge: true });
      
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
    } finally {
      setGuardandoPedido(false);
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
      
      // Enviar copia a cocina
      const cocinaRef = doc(db, "cocina", "pedidos");
      const cocinaSnap = await getDoc(cocinaRef);
      const pedidosCocinaAnteriores = cocinaSnap.exists() ? cocinaSnap.data().pedidos || [] : [];
      
      const pedidoCocina = {
        id: Date.now(),
        mesa: mesaSeleccionada,
        productos: pedido.map((item: ItemPedido) => ({
          nombre: item.producto.nombre,
          cantidad: item.cantidad
        })),
        hora,
        fecha,
        usuario: nombreUsuario,
        estado: "pendiente"
      };
      
      await setDoc(cocinaRef, { pedidos: [pedidoCocina, ...pedidosCocinaAnteriores] }, { merge: true });
      
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
      <header className="bg-purple-600 text-white p-3 md:p-4">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-base md:text-xl font-bold">🛒 Ventas</h1>
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
      
      <div className="container mx-auto p-3 md:p-4">
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          <button 
            onClick={() => setVista("salon")} 
            className={`px-3 py-2 rounded text-sm whitespace-nowrap ${vista === "salon" ? "bg-purple-600 text-white" : "bg-white text-gray-700"}`}
          >
            🏠 Salón
          </button>
          <button 
            onClick={() => setVista("registro")} 
            className={`px-3 py-2 rounded text-sm whitespace-nowrap ${vista === "registro" ? "bg-purple-600 text-white" : "bg-white text-gray-700"}`}
          >
            📊 Registro
          </button>
          {(rol === "admin" || rol === "cocina") && (
            <button 
              onClick={() => setVista("cocina")} 
              className={`px-3 py-2 rounded text-sm whitespace-nowrap ${vista === "cocina" ? "bg-red-600 text-white" : "bg-white text-gray-700"}`}
            >
              👨‍🍳 Cocina
            </button>
          )}
        </div>

        {vista === "salon" && (
          <div className="bg-white rounded-lg shadow p-3 md:p-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
              <h2 className="text-base md:text-lg font-bold">🏠 Ventas en Salón</h2>
              {!tomarPedido && (
                <div className="flex gap-2 w-full sm:w-auto">
                  <button 
                    onClick={() => {
                      setPedido(pedidosMesas[mesaSeleccionada] || []);
                      setTomarPedido(true);
                    }}
                    className="flex-1 sm:flex-none bg-purple-600 text-white px-3 py-2 rounded text-sm hover:bg-purple-700"
                  >
                    🍔 Tomar Pedido
                  </button>
                  <button 
                    onClick={() => {
                      cargarPedidosAbiertos();
                    }}
                    className="flex-1 sm:flex-none bg-orange-500 text-white px-3 py-2 rounded text-sm hover:bg-orange-600"
                  >
                    📋 ({pedidosAbiertos.length})
                  </button>
                </div>
              )}
            </div>

            {tomarPedido && (
              <div className="mb-4">
                <div className="flex flex-wrap gap-2 mb-4">
                  {["Mesa 1", "Mesa 2", "Mesa 3", "Mesa 4", "Mesa 5", "Mesa 6", "Llevar", "Máncora Go!", "Personal"].map(mesa => (
                    <button
                      key={mesa}
                      onClick={() => {
                        setMesaSeleccionada(mesa);
                        setPedido(pedidosMesas[mesa] || []);
                      }}
                      className={`px-3 py-2 rounded text-sm ${mesaSeleccionada === mesa ? mesa === "Personal" ? "bg-red-600 text-white" : "bg-purple-600 text-white" : "bg-gray-200"}`}
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

                <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                  {categorias.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setCategoriaSeleccionada(cat)}
                      className={`px-3 py-1.5 rounded text-xs md:text-sm whitespace-nowrap ${categoriaSeleccionada === cat ? "bg-purple-600 text-white" : "bg-gray-200"}`}
                    >
                      {getCategoriaNombre(cat)}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 mb-4">
                  {productos
                    .filter(p => p.categoria === categoriaSeleccionada)
                    .map(producto => (
                      <button
                        key={producto.id}
                        onClick={() => agregarAlPedido(producto)}
                        className="border border-gray-200 rounded-lg p-2 md:p-3 hover:border-purple-500 hover:bg-purple-50 transition text-left"
                      >
                        <p className="font-medium text-gray-800 text-xs md:text-sm truncate">{producto.nombre}</p>
                        <p className="text-purple-600 font-bold text-sm md:text-base">S/.{producto.precio.toFixed(2)}</p>
                      </button>
                    ))}
                </div>

                {pedido.length > 0 && (
                  <div className="border-t pt-3 md:pt-4 mt-3 md:mt-4">
                    <h3 className="font-bold text-sm md:text-base mb-2">📝 Pedido - {mesaSeleccionada}:</h3>
                    <div className="space-y-1 md:space-y-2 mb-3 md:mb-4">
                      {pedido.map((item, index) => (
                        <div key={index} className="flex justify-between items-center bg-gray-50 p-2 rounded text-sm">
                          <span className="truncate flex-1 mr-2">{item.producto.nombre}</span>
                          <div className="flex items-center gap-1">
                            <button 
                              onClick={() => eliminarDelPedido(item.producto.id)}
                              className="w-6 h-6 bg-red-100 text-red-600 rounded font-bold text-xs hover:bg-red-200"
                            >
                              -
                            </button>
                            <span className="font-bold w-6 text-center">{item.cantidad}</span>
                            <button 
                              onClick={() => agregarAlPedido(item.producto)}
                              className="w-6 h-6 bg-green-100 text-green-600 rounded font-bold text-xs hover:bg-green-200"
                            >
                              +
                            </button>
                            <span className="ml-2 font-bold">S/.{(item.producto.precio * item.cantidad).toFixed(2)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between items-center bg-purple-100 p-3 rounded">
                      <span className="font-bold text-base">Total:</span>
                      <span className="font-bold text-lg text-purple-700">S/.{getTotal().toFixed(2)}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-3">
                      <button 
                        onClick={() => { setPedido([]); setTomarPedido(false); }}
                        className="bg-gray-300 text-gray-700 py-2 rounded text-sm hover:bg-gray-400"
                      >
                        Cancelar
                      </button>
                      <button 
                        onClick={registrarMesa}
                        className="bg-orange-500 text-white py-2 rounded text-sm hover:bg-orange-600"
                      >
                        Registrar
                      </button>
                      <button 
                        onClick={() => setModalPago(true)}
                        className="bg-green-600 text-white py-2 rounded text-sm hover:bg-green-700"
                      >
                        Cobrar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {!tomarPedido && pedidosAbiertos.length > 0 && (
              <div className="mt-4">
                <h3 className="font-bold text-sm md:text-base mb-2">📋 Mesas Abiertas ({pedidosAbiertos.length})</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {pedidosAbiertos.map((pa: any) => (
                    <div key={pa.id} className="border-2 border-orange-300 rounded-lg p-2 md:p-3 bg-orange-50">
                      <div className="flex justify-between items-center mb-1 md:mb-2">
                        <span className="font-bold text-sm md:text-base">{pa.mesa}</span>
                        <span className="text-xs text-gray-500">{pa.hora}</span>
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

        {vista === "registro" && (
          <div className="bg-white rounded-lg shadow p-3 md:p-4">
            <h2 className="text-base md:text-lg font-bold mb-3 md:mb-4">📊 Registro de Ventas</h2>
            
            <div className="flex flex-wrap items-center gap-2 mb-3 md:mb-4">
              <label className="text-xs md:text-sm font-bold">Fecha:</label>
              <input 
                type="date" 
                className="border p-2 rounded text-sm"
                value={fechaFiltroVentas}
                onChange={(e) => setFechaFiltroVentas(e.target.value)}
              />
              <button
                onClick={() => {
                  const ventasParaExportar = [...ventas.filter(v => v.fecha === fechaFiltroVentas && !v.eliminado)];
                  const dataExport = ventasParaExportar.map((v, index) => ({
                    "#": index + 1,
                    "Hora": v.hora || "-",
                    "Mesa": v.mesa || v.tipo || "-",
                    "Subtotal": v.total || 0,
                    "Propina": v.propina || 0,
                    "Total": v.totalConPropina || v.total || 0,
                    "Método": v.metodoPago === "efectivo" ? "Efectivo" : v.metodoPago === "yape" ? "Yape" : v.metodoPago === "pos" ? "POS" : v.metodoPago || "-",
                    "Usuario": v.usuario || "-",
                    "Productos": v.productos?.map((p: any) => `${p.cantidad}x ${p.producto?.nombre || "N/A"}`).join(", ") || "-"
                  }));
                  const ws = XLSX.utils.json_to_sheet(dataExport);
                  const wb = XLSX.utils.book_new();
                  XLSX.utils.book_append_sheet(wb, ws, "Ventas");
                  XLSX.writeFile(wb, `Ventas_${fechaFiltroVentas}.xlsx`);
                }}
                className="bg-green-600 text-white px-3 py-2 rounded text-sm hover:bg-green-700"
              >
                📥 Exportar
              </button>
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
              const ventasActivas = ventasFiltradas.filter(v => !v.eliminado);
              const totalDia = ventasActivas.reduce((acc, v) => acc + (v.totalConPropina || v.total || 0), 0);
              const totalPropinas = ventasActivas.reduce((acc, v) => acc + (v.propina || 0), 0);
              const totalEfectivo = ventasActivas.filter(v => v.metodoPago === "efectivo").reduce((acc, v) => acc + (v.totalConPropina || v.total || 0), 0);
              const totalYape = ventasActivas.filter(v => v.metodoPago === "yape").reduce((acc, v) => acc + (v.totalConPropina || v.total || 0), 0);
              const totalPos = ventasActivas.filter(v => v.metodoPago === "pos").reduce((acc, v) => acc + (v.totalConPropina || v.total || 0), 0);
              const ventasEliminadas = ventasFiltradas.filter(v => v.eliminado);
              const totalEliminadas = ventasEliminadas.reduce((acc, v) => acc + (v.totalConPropina || v.total || 0), 0);
              
              return (
                <>
                  <div className="bg-purple-100 p-3 md:p-4 rounded mb-4">
                    <p className="text-purple-800 font-bold text-sm md:text-base">Total del día: S/.{totalDia.toFixed(2)}</p>
                    <p className="text-xs md:text-sm text-purple-600">{ventasActivas.length} ventas</p>
                    {ventasEliminadas.length > 0 && (
                      <p className="text-xs md:text-sm text-red-500">({ventasEliminadas.length} eliminadas: S/.{totalEliminadas.toFixed(2)})</p>
                    )}
                    {totalPropinas > 0 && (
                      <p className="text-xs md:text-sm text-green-600">Propinas: S/.{totalPropinas.toFixed(2)}</p>
                    )}
                    <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-purple-200">
                      <div className="bg-green-100 p-2 rounded text-center">
                        <p className="text-xs text-green-600">💵 Efectivo</p>
                        <p className="font-bold text-green-800 text-sm">S/.{totalEfectivo.toFixed(2)}</p>
                      </div>
                      <div className="bg-orange-100 p-2 rounded text-center">
                        <p className="text-xs text-orange-600">📱 Yape</p>
                        <p className="font-bold text-orange-800 text-sm">S/.{totalYape.toFixed(2)}</p>
                      </div>
                      <div className="bg-blue-100 p-2 rounded text-center">
                        <p className="text-xs text-blue-600">💳 POS</p>
                        <p className="font-bold text-blue-800 text-sm">S/.{totalPos.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>

                  {ventasFiltradas.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No hay ventas en esta fecha.</p>
                  ) : (
                    <div className="space-y-2">
                      {ventasFiltradas.map((v, idx) => (
                        <div key={idx} className={`border rounded-lg p-3 ${v.eliminado ? "bg-gray-100 border-gray-400 opacity-60" : "bg-white"}`}>
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold">{v.hora}</span>
                                {v.eliminado && (
                                  <span className="px-2 py-0.5 rounded text-white text-xs bg-gray-500">
                                    ELIMINADO
                                  </span>
                                )}
                                {!v.eliminado && (
                                  <>
                                    <span className={`px-2 py-0.5 rounded text-white text-xs ${v.tipo === "salon" ? "bg-blue-500" : "bg-orange-500"}`}>
                                      {v.tipo === "salon" ? "Salón" : "Delivery"}
                                    </span>
                                    <span className="font-medium">{v.mesa}</span>
                                    <span className={`px-2 py-0.5 rounded text-white text-xs ${
                                      v.metodoPago === "efectivo" ? "bg-green-500" : 
                                      v.metodoPago === "yape" ? "bg-orange-500" : 
                                      "bg-blue-500"
                                    }`}>
                                      {v.metodoPago === "efectivo" ? "Efectivo" : v.metodoPago === "yape" ? "Yape" : "POS"}
                                    </span>
                                    {v.propina > 0 && (
                                      <span className="text-xs text-green-600">+Propina</span>
                                    )}
                                  </>
                                )}
                              </div>
                              <div className="mt-2 text-sm text-gray-600">
                                {v.productos?.map((p: any, i: number) => (
                                  <div key={i} className="flex justify-between">
                                    <span>{p.cantidad}x {p.producto?.nombre}</span>
                                    <span className="font-medium">S/.{(p.producto?.precio * p.cantidad).toFixed(2)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2 ml-2">
                              {v.eliminado ? (
                                <span className="font-bold text-gray-500 line-through">S/.{(v.totalConPropina || v.total || 0).toFixed(2)}</span>
                              ) : (
                                <>
                                  <span className="font-bold text-green-600">S/.{(v.totalConPropina || v.total || 0).toFixed(2)}</span>
                                  <button
                                    onClick={() => eliminarVenta(v.id)}
                                    className="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600"
                                  >
                                    ✕ Eliminar
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-8 border-t pt-6">
                    <h3 className="text-lg font-bold mb-4">📦 Consumo y Costos</h3>
                    
                    {(() => {
                      const consumo: Record<string, { nombre: string; unidad: string; cantidad: number; costoUnitario: number }> = {};
                      
                      ventasActivas.forEach(venta => {
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
                                costoUnitario: insumo.precioCompra || 0
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
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 mb-4">
                            <div className="bg-blue-100 p-2 sm:p-4 rounded-lg text-center">
                              <p className="text-xs sm:text-sm text-blue-600">Costo Total</p>
                              <p className="text-lg sm:text-2xl font-bold text-blue-800">S/.{totalCosto.toFixed(2)}</p>
                            </div>
                            <div className="bg-green-100 p-2 sm:p-4 rounded-lg text-center">
                              <p className="text-xs sm:text-sm text-green-600">Ganancia Aprox.</p>
                              <p className="text-lg sm:text-2xl font-bold text-green-800">S/.{gananciaAproximada.toFixed(2)}</p>
                            </div>
                            <div className="bg-purple-100 p-2 sm:p-4 rounded-lg text-center">
                              <p className="text-xs sm:text-sm text-purple-600">Margen</p>
                              <p className="text-lg sm:text-2xl font-bold text-purple-800">{margenPorcentaje.toFixed(1)}%</p>
                            </div>
                          </div>
                          
                          {consumoArray.length > 0 ? (
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs md:text-sm">
                                <thead>
                                  <tr className="bg-gray-200">
                                    <th className="p-1 md:p-2 text-left">Insumo</th>
                                    <th className="p-1 md:p-2 text-right">Consumido</th>
                                    <th className="p-1 md:p-2 text-right">Costo Unit.</th>
                                    <th className="p-1 md:p-2 text-right">Total</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {consumoArray.map(([id, item]: [string, any]) => (
                                      <tr key={id} className="border-b">
                                        <td className="p-2 font-medium">{item.nombre}</td>
                                        <td className="p-2 text-right text-red-600">{item.cantidad.toFixed(2)} {item.unidad}</td>
                                        <td className="p-2 text-right">S/.{item.costoUnitario.toFixed(2)}</td>
                                        <td className="p-2 text-right">S/.{(item.cantidad * item.costoUnitario).toFixed(2)}</td>
                                      </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <p className="text-gray-500 text-center py-4">No hay consumo registrado para esta fecha.</p>
                          )}
                        </>
                      );
                    })()}

                    <div className="mt-8 border-t pt-6">
                      <h3 className="text-lg font-bold mb-4">📋 Conteo de Items</h3>
                      
                      {(() => {
                        const conteoItems: Record<string, number> = {};
                        
                        ventasActivas.forEach(venta => {
                          venta.productos?.forEach((item: any) => {
                            const nombreProducto = item.producto?.nombre || "Sin nombre";
                            if (conteoItems[nombreProducto]) {
                              conteoItems[nombreProducto] += item.cantidad;
                            } else {
                              conteoItems[nombreProducto] = item.cantidad;
                            }
                          });
                        });
                        
                        const itemsOrdenados = Object.entries(conteoItems).sort((a, b) => b[1] - a[1]);
                        
                        return (
                          <>
                            {itemsOrdenados.length > 0 ? (
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                {itemsOrdenados.map(([nombre, cantidad]) => (
                                  <div key={nombre} className="bg-gray-100 p-3 rounded-lg text-center">
                                    <p className="font-medium text-sm truncate">{nombre}</p>
                                    <p className="text-xl font-bold text-green-600">{cantidad}</p>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-gray-500 text-center py-4">No hay items vendidos en esta fecha.</p>
                            )}
                          </>
                        );
                      })()}
                    </div>
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
                disabled={guardandoPedido || (metodoPago === "efectivo" && montoRecibido < (mesaSeleccionada === "Máncora Go!" ? getTotalConPropina() - getTotal() * 0.10 : getTotalConPropina()))}
                className={`flex-1 py-2 rounded flex items-center justify-center gap-2 ${guardandoPedido || (metodoPago === "efectivo" && montoRecibido < (mesaSeleccionada === "Máncora Go!" ? getTotalConPropina() - getTotal() * 0.10 : getTotalConPropina())) ? "bg-gray-400 cursor-not-allowed" : "bg-green-600 text-white hover:bg-green-700"}`}
              >
                {guardandoPedido ? "Guardando..." : "Confirmar Pago"}
              </button>
            </div>
          </div>
        </div>
      )}

      {vista === "cocina" && !verRegistroCocina && (
        <div className="bg-white rounded-lg shadow p-3 md:p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-base md:text-lg font-bold">👨‍🍳 Pedidos para Cocina</h2>
            <button
              onClick={() => setVerRegistroCocina(true)}
              className="bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700"
            >
              📋 Registro Cocina
            </button>
          </div>
          
          {pedidosCocina.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No hay pedidos en cocina</p>
          ) : (
            <div className="space-y-3">
              {pedidosCocina.map((pedido, idx) => (
                <div key={pedido.id || idx} className={`border rounded-lg p-3 ${pedido.estado === "listo" ? "bg-green-100" : "bg-red-50"}`}>
                  <div className="flex justify-between items-center mb-2">
                    <span className={`font-bold text-lg px-2 py-1 rounded ${
                      pedido.mesa === "Personal" ? "bg-red-500 text-white" :
                      pedido.mesa === "Máncora Go!" ? "bg-orange-500 text-white" :
                      pedido.mesa === "Llevar" ? "bg-blue-500 text-white" :
                      "bg-green-500 text-white"
                    }`}>
                      {pedido.mesa}
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <span className="text-sm text-gray-500 block">{pedido.fecha}</span>
                        <span className="text-sm text-gray-500">{pedido.hora}</span>
                      </div>
                      {pedido.estado !== "listo" ? (
                        <button
                          onClick={() => marcarPedidoListo(pedido.id)}
                          className="bg-green-500 text-white px-3 py-1 rounded text-sm font-bold hover:bg-green-600"
                        >
                          Listo
                        </button>
                      ) : (
                        <span className="text-green-600 font-bold text-sm">✓</span>
                      )}
                    </div>
                  </div>
                  <ul className="space-y-1">
                    {pedido.productos?.map((item: any, i: number) => (
                      <li key={i} className={`flex justify-between items-center py-1 border-b last:border-0 ${pedido.estado === "listo" ? "border-green-200" : "border-red-100"}`}>
                        <span className="font-medium">{item.cantidad}x {item.nombre}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {vista === "cocina" && verRegistroCocina && (
        <div className="bg-white rounded-lg shadow p-3 md:p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-base md:text-lg font-bold">📋 Registro de Cocina</h2>
            <button
              onClick={() => setVerRegistroCocina(false)}
              className="bg-gray-500 text-white px-3 py-2 rounded text-sm hover:bg-gray-600"
            >
              ← Volver
            </button>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <label className="text-sm font-bold">Fecha:</label>
            <input 
              type="date" 
              className="border p-2 rounded text-sm"
              value={fechaFiltroCocina}
              onChange={(e) => setFechaFiltroCocina(e.target.value)}
            />
          </div>
          
          {(() => {
            const pedidosFiltrados = [...pedidosCocina.filter(p => p.fecha === fechaFiltroCocina)]
              .sort((a, b) => {
                const aTime = a.hora.split(':').map(Number);
                const bTime = b.hora.split(':').map(Number);
                const aMinutes = aTime[0] * 60 + aTime[1];
                const bMinutes = bTime[0] * 60 + bTime[1];
                return bMinutes - aMinutes;
              });
            
            return (
              <>
                <div className="bg-blue-100 p-3 rounded mb-4">
                  <p className="text-blue-800 font-bold text-sm md:text-base">
                    {pedidosFiltrados.length} pedidos para {fechaFiltroCocina}
                  </p>
                </div>
                
                {pedidosFiltrados.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No hay pedidos en esta fecha.</p>
                ) : (
                  <div className="space-y-3">
                    {pedidosFiltrados.map((pedido, idx) => (
                      <div key={pedido.id || idx} className="border rounded-lg p-3 bg-gray-50">
                        <div className="flex justify-between items-center mb-2">
                          <span className={`font-bold text-lg px-2 py-1 rounded ${
                            pedido.mesa === "Personal" ? "bg-red-500 text-white" :
                            pedido.mesa === "Máncora Go!" ? "bg-orange-500 text-white" :
                            pedido.mesa === "Llevar" ? "bg-blue-500 text-white" :
                            "bg-green-500 text-white"
                          }`}>
                            {pedido.mesa}
                          </span>
                          <div className="text-right">
                            <span className="text-sm text-gray-500 block">{pedido.fecha}</span>
                            <span className="text-sm text-gray-500">{pedido.hora}</span>
                          </div>
                        </div>
                        <ul className="space-y-1">
                          {pedido.productos?.map((item: any, i: number) => (
                            <li key={i} className="flex justify-between items-center py-1 border-b border-gray-200 last:border-0">
                              <span className="font-medium">{item.cantidad}x {item.nombre}</span>
                            </li>
                          ))}
                        </ul>
                        <p className="text-xs text-gray-500 mt-2">Atendido por: {pedido.usuario}</p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}
    </main>
  );
}
