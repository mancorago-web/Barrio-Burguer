"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { auth, db } from "../firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { productosIniciales, productosVentaIniciales, recetasIniciales, type Producto, type Movimiento, type Receta, type ProductoVenta } from "./datos";
import RecetaModal from "./RecetaModal";
import AgregarProductoModal from "./AgregarProductoModal";

type Rol = "admin" | "jefe" | "cocina" | null;

function InventarioContent() {
  const [productos, setProductos] = useState<Producto[]>(productosIniciales);
  const [productosVenta, setProductosVenta] = useState<ProductoVenta[]>(productosVentaIniciales);
  const [recetas, setRecetas] = useState<Receta[]>(recetasIniciales);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [vista, setVista] = useState<"stock" | "recetas" | "movimientos" | "informe" | "baseDatos">("stock");
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modalRecetaAbierto, setModalRecetaAbierto] = useState(false);
  const [editarReceta, setEditarReceta] = useState<ProductoVenta | null>(null);
  const [tipoMovimiento, setTipoMovimiento] = useState<"entrada" | "salida">("entrada");
  const [productoSeleccionado, setProductoSeleccionado] = useState<number>(0);
  const [cantidadMovimiento, setCantidadMovimiento] = useState<number>(0);
  const [fechaMovimiento, setFechaMovimiento] = useState(new Date().toISOString().split("T")[0]);
  const [notificacion, setNotificacion] = useState<string | null>(null);
  const [tipoNotificacion, setTipoNotificacion] = useState<"verde" | "azul">("verde");
  const [categoriasExpandidas, setCategoriasExpandidas] = useState<Record<string, boolean>>({
    hamburguesas: false,
    bebidas: false,
    aseo: false,
  });
  const [recetasExpandidas, setRecetasExpandidas] = useState<Record<number, boolean>>({});
  const [modalAgregarProducto, setModalAgregarProducto] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [rol, setRol] = useState<Rol>(null);
  const [compras, setCompras] = useState<any[]>([]);
  const [mostrarRegistroCompras, setMostrarRegistroCompras] = useState(false);
  const [fechaFiltro, setFechaFiltro] = useState(new Date().toISOString().split("T")[0]);
  const [ultimaActualizacion, setUltimaActualizacion] = useState<string | null>(null);
  const [nombreUsuario, setNombreUsuario] = useState<string>("");
  const router = useRouter();
  const searchParams = useSearchParams();

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
      
      const datos = userDoc.data();
      setRol(datos.rol);
      const emailUsuario = user.email || "";
      setNombreUsuario(datos.nombre || emailUsuario.split("@")[0] || "Usuario");
      
      const vistaParam = searchParams.get("vista");
      if (vistaParam === "stock" && datos.rol !== "admin") {
        setVista("stock");
      }
      
      await cargarDatos();
    });
    
    return () => unsubscribe();
  }, [router, searchParams]);

  const cargarDatos = async () => {
    try {
      const docRef = doc(db, "inventario", "productos");
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const datos = docSnap.data();
        if (datos.productos) {
          setProductos(datos.productos);
        }
        if (datos.ultimaActualizacion) {
          setUltimaActualizacion(datos.ultimaActualizacion);
        }
      }
      
      const comprasRef = doc(db, "compras", "registros");
      const comprasSnap = await getDoc(comprasRef);
      if (comprasSnap.exists()) {
        setCompras(comprasSnap.data().compras || []);
      }
      
      const recetasRef = doc(db, "recetas", "datos");
      const recetasSnap = await getDoc(recetasRef);
      if (recetasSnap.exists()) {
        const datosRecetas = recetasSnap.data();
        if (datosRecetas.productosVenta) {
          setProductosVenta(datosRecetas.productosVenta);
        }
        if (datosRecetas.recetas) {
          setRecetas(datosRecetas.recetas);
        }
      }
    } catch (error) {
      console.log("Cargando desde localStorage:", error);
      const datosProductoGuardado = localStorage.getItem("datosProducto");
      if (datosProductoGuardado) {
        const datosProducto = JSON.parse(datosProductoGuardado);
        setProductos(productosIniciales.map(p => {
          if (datosProducto[p.id]) {
            return { 
              ...p, 
              nombre: datosProducto[p.id].nombre,
              proveedor: datosProducto[p.id].proveedor,
              numero: datosProducto[p.id].numero,
              unidad: datosProducto[p.id].unidad,
              precioCompra: datosProducto[p.id].precioCompra,
              stockMinimo: datosProducto[p.id].stockMinimo ?? p.stockMinimo,
            };
          }
          return p;
        }));
      }
    }
    setCargando(false);
  };

  const agregarProducto = (nuevoProducto: Producto) => {
    setProductos([...productos, nuevoProducto]);
  };

  const guardarBaseDatos = async () => {
    try {
      await setDoc(doc(db, "inventario", "productos"), {
        productos: productos
      });
      setTipoNotificacion("verde");
      setNotificacion("La base de datos fue actualizada correctamente");
    } catch (error) {
      console.error("Error guardando en Firebase:", error);
      const datosProducto: Record<number, any> = {};
      productos.forEach(p => {
        datosProducto[p.id] = {
          nombre: p.nombre,
          proveedor: p.proveedor,
          numero: p.numero,
          unidad: p.unidad,
          precioCompra: p.precioCompra,
          stockMinimo: p.stockMinimo,
        };
      });
      localStorage.setItem("datosProducto", JSON.stringify(datosProducto));
      setTipoNotificacion("verde");
      setNotificacion("Guardado en navegador (Firebase no disponible)");
    }
    window.scrollTo(0, 0);
    setTimeout(() => setNotificacion(null), 4000);
  };

  const enviarInventario = async () => {
    const ahora = new Date();
    const fechaActualizada = `${ahora.toLocaleDateString()} ${ahora.getHours().toString().padStart(2, '0')}:${ahora.getMinutes().toString().padStart(2, '0')}`;
    const actualizacionCompleta = `${fechaActualizada} - ${nombreUsuario}`;
    
    const productosPorPedirObj: Record<string, number> = {};
    let countFaltantes = 0;
    productos.forEach(p => {
      const stockMin = p.stockMinimo || 0;
      const stockAct = p.stockActual || 0;
      if (stockAct < stockMin && stockMin > 0) {
        productosPorPedirObj[String(p.id)] = Math.max(0, stockMin - stockAct);
        countFaltantes++;
      }
    });
    
    try {
      await setDoc(doc(db, "inventario", "productos"), {
        productos: productos,
        ultimaActualizacion: actualizacionCompleta
      });
      
      await setDoc(doc(db, "caja", "productosPorPedir"), {
        productos: productosPorPedirObj,
        ultimaActualizacion: actualizacionCompleta
      }, { merge: true });
      
      setUltimaActualizacion(actualizacionCompleta);
      setTipoNotificacion("verde");
      setNotificacion(`El inventario fue actualizado, ${countFaltantes} productos en lista de compras`);
      alert(`Inventario actualizado. ${countFaltantes} productos detectados para compra.`);
    } catch (error) {
      console.error("Error guardando en Firebase:", error);
      const stockActual: Record<number, number> = {};
      productos.forEach(p => {
        stockActual[p.id] = p.stockActual;
      });
      localStorage.setItem("stockActual", JSON.stringify(stockActual));
      localStorage.setItem("ultimaActualizacion", actualizacionCompleta);
      setUltimaActualizacion(actualizacionCompleta);
      setTipoNotificacion("verde");
      setNotificacion("Guardado en navegador (Firebase no disponible)");
    }
    window.scrollTo(0, 0);
    setTimeout(() => setNotificacion(null), 4000);
  };

  const agregarMovimiento = async () => {
    if (productoSeleccionado === 0 || cantidadMovimiento <= 0) return;

    const producto = productos.find(p => p.id === productoSeleccionado);
    const total = cantidadMovimiento * (producto?.precioCompra || 0);

    const nuevosProductos = productos.map(p => {
      if (p.id === productoSeleccionado) {
        return {
          ...p,
          stockActual: tipoMovimiento === "entrada" 
            ? p.stockActual + cantidadMovimiento 
            : p.stockActual - cantidadMovimiento
        };
      }
      return p;
    });

    setProductos(nuevosProductos);

    if (tipoMovimiento === "entrada") {
      const ahora = new Date();
      const hora = `${ahora.getHours().toString().padStart(2, '0')}:${ahora.getMinutes().toString().padStart(2, '0')}`;
      
      const nuevaCompra = {
        id: Date.now(),
        productoId: productoSeleccionado,
        productoNombre: producto?.nombre || "",
        cantidad: cantidadMovimiento,
        precioUnitario: producto?.precioCompra || 0,
        total: total,
        fecha: fechaMovimiento,
        hora: hora,
      };
      
      const nuevasCompras = [...compras, nuevaCompra];
      setCompras(nuevasCompras);
      
      try {
        await setDoc(doc(db, "compras", "registros"), {
          compras: nuevasCompras
        });
        
        await setDoc(doc(db, "inventario", "productos"), {
          productos: nuevosProductos
        });
      } catch (error) {
        console.error("Error guardando:", error);
      }
    } else {
      try {
        await setDoc(doc(db, "inventario", "productos"), {
          productos: nuevosProductos
        });
      } catch (error) {
        console.error("Error guardando inventario:", error);
      }
    }

    if (tipoMovimiento === "entrada") {
      setTipoNotificacion("verde");
      setNotificacion("Registro de compra exitoso");
      window.scrollTo(0, 0);
      setTimeout(() => setNotificacion(null), 4000);
    }

    setModalAbierto(false);
    setCantidadMovimiento(0);
  };

  const actualizarStock = (id: number, cantidad: number) => {
    setProductos(productos.map(p => {
      if (p.id === id) {
        const nuevoStock = p.stockActual + cantidad;
        return { ...p, stockActual: nuevoStock < 0 ? 0 : nuevoStock };
      }
      return p;
    }));
  };

  const getProductoNombre = (id: number) => productos.find(p => p.id === id)?.nombre || "";
  const getRecetasParaProducto = (productoVentaId: number) => 
    recetas.filter(r => r.productoVentaId === productoVentaId);

  const guardarRecetas = async (nuevosProductosVenta: ProductoVenta[], nuevasRecetas: Receta[]) => {
    try {
      await setDoc(doc(db, "recetas", "datos"), {
        productosVenta: nuevosProductosVenta,
        recetas: nuevasRecetas
      });
      setTipoNotificacion("verde");
      setNotificacion("Las recetas fueron guardadas correctamente");
      window.scrollTo(0, 0);
      setTimeout(() => setNotificacion(null), 4000);
    } catch (error) {
      console.error("Error guardando recetas:", error);
    }
  };

  const agregarReceta = (nuevoProducto: ProductoVenta, nuevasRecetas: Receta[]) => {
    const nuevosProductosVenta = [...productosVenta, nuevoProducto];
    const nuevasRecetasCompleto = [...recetas, ...nuevasRecetas];
    setProductosVenta(nuevosProductosVenta);
    setRecetas(nuevasRecetasCompleto);
    guardarRecetas(nuevosProductosVenta, nuevasRecetasCompleto);
  };

  const modificarReceta = (productoModificado: ProductoVenta, recetasModificadas: Receta[]) => {
    const nuevosProductosVenta = productosVenta.map(p => 
      p.id === productoModificado.id ? productoModificado : p
    );
    
    // Mantener las recetas de todos los productos excepto el que se modifica
    const recetasOtrosProductos = recetas.filter(r => r.productoVentaId !== productoModificado.id);
    const nuevasRecetas = [...recetasOtrosProductos, ...recetasModificadas];
    
    setProductosVenta(nuevosProductosVenta);
    setRecetas(nuevasRecetas);
    guardarRecetas(nuevosProductosVenta, nuevasRecetas);
  };

  const informeDiario = () => {
    const hoy = new Date().toISOString().split("T")[0];
    const movimientosHoy = movimientos.filter(m => m.fecha === hoy);

    const entradas = movimientosHoy.filter(m => m.tipo === "entrada").reduce((acc, m) => acc + (m.cantidad * (productos.find(p => p.id === m.productoId)?.precioCompra || 0)), 0);
    const salidas = movimientosHoy.filter(m => m.tipo === "salida").reduce((acc, m) => acc + (m.cantidad * (productos.find(p => p.id === m.productoId)?.precioCompra || 0)), 0);

    return { movimientosHoy, entradas, salidas };
  };

  const { movimientosHoy, entradas, salidas } = informeDiario();

  const cerrarSesion = async () => {
    await signOut(auth);
    router.push("/");
  };

  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-lg">Cargando...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100">
      <header className="bg-blue-600 text-white p-3 md:p-4">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-base md:text-xl font-bold">📦 Inventario</h1>
          <div className="flex gap-2">
            {(rol === "admin" || rol === "jefe") && (
              <button onClick={() => router.push("/menu")} className="bg-blue-700 px-2 md:px-4 py-2 rounded text-sm hover:bg-blue-800">
                ← Menú
              </button>
            )}
            <button onClick={cerrarSesion} className="bg-red-600 px-2 md:px-4 py-2 rounded text-sm hover:bg-red-700">
              Salir
            </button>
          </div>
        </div>
      </header>

      {notificacion && (
        <div className={`${tipoNotificacion === "verde" ? "bg-green-500" : "bg-blue-500"} text-white p-3 text-center font-bold`}>
          ✓ {notificacion}
        </div>
      )}

      <div className="container mx-auto p-3 md:p-4">
        <div className="flex gap-2 mb-3 md:mb-4 flex-wrap overflow-x-auto pb-2">
          <button onClick={() => setVista("stock")} className={`px-3 py-2 rounded text-sm whitespace-nowrap ${vista === "stock" ? "bg-blue-600 text-white" : "bg-white text-gray-700"}`}>📦 Stock</button>
          {(rol === "admin" || rol === "jefe") && (
            <>
              <button onClick={() => setVista("recetas")} className={`px-3 py-2 rounded text-sm whitespace-nowrap ${vista === "recetas" ? "bg-blue-600 text-white" : "bg-white text-gray-700"}`}>📋 Recetas</button>
              <div className="flex-1"></div>
              <button onClick={() => setVista("baseDatos")} className={`px-3 py-2 rounded text-sm whitespace-nowrap ${vista === "baseDatos" ? "bg-green-600 text-white" : "bg-green-100 text-green-700"}`}>🗄️ Datos</button>
            </>
          )}
        </div>

          {vista === "stock" && (
          <div className="bg-white rounded-lg shadow p-3 md:p-4">
            <div className="flex justify-between items-center mb-3 md:mb-4">
              <h2 className="text-base md:text-lg font-bold">Productos en Stock</h2>
              {ultimaActualizacion && (
                <span className="text-sm text-gray-500">
                  Última Actualización: {ultimaActualizacion.split(" - ")[0]}
                  <span className={`ml-2 px-2 py-1 rounded text-white text-xs ${
                    ultimaActualizacion.split(" - ")[1]?.toLowerCase() === "admin" ? "bg-purple-600" : 
                    ultimaActualizacion.split(" - ")[1]?.toLowerCase() === "cubas" ? "bg-orange-500" : 
                    ultimaActualizacion.split(" - ")[1]?.toLowerCase() === "cocina1" ? "bg-blue-600" : 
                    "bg-gray-500"
                  }`}>
                    {ultimaActualizacion.split(" - ")[1]}
                  </span>
                </span>
              )}
            </div>
            {["hamburguesas", "bebidas", "aseo"].map(cat => {
              const productosCategoria = productos.filter(p => p.categoria === cat);
              const hayFaltantes = productosCategoria.some(p => p.stockActual < p.stockMinimo);
              const bgColor = hayFaltantes ? "bg-yellow-100" : "bg-green-100";
              const borderColor = hayFaltantes ? "border-yellow-400" : "border-green-400";
              
              return (
              <div key={cat} className="mb-4 md:mb-6">
                <h3 
                  className={`${bgColor} ${borderColor} px-3 md:px-4 py-2 font-bold rounded-t-lg uppercase cursor-pointer flex justify-between items-center border-b-2 text-sm md:text-base`}
                  onClick={() => setCategoriasExpandidas(prev => ({ ...prev, [cat]: !prev[cat] }))}
                >
                  <span>{cat} {hayFaltantes ? "⚠️" : "✓"}</span>
                  <span>{categoriasExpandidas[cat] ? "▼" : "▶"}</span>
                </h3>
                {categoriasExpandidas[cat] && (
                  <div className="overflow-x-auto border border-t-0">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="p-2 text-left w-28 md:w-40">Producto</th>
                        <th className="p-2 text-center w-24 md:w-32">Stock</th>
                        <th className="p-2 text-center w-16 md:w-24 hidden sm:table-cell">Mín.</th>
                        <th className="p-2 text-center w-12">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productos.filter(p => p.categoria === cat).map(p => (
                        <tr key={p.id} className="border-b hover:bg-gray-50">
                          <td className="p-1 md:p-2 text-xs md:text-sm">{p.nombre}</td>
                          <td className="p-1">
                            <div className="flex items-center justify-center">
                              <button 
                                onClick={() => actualizarStock(p.id, -1)}
                                className="bg-red-500 text-white w-7 h-7 md:w-8 md:h-8 rounded hover:bg-red-600 flex items-center justify-center flex-shrink-0 font-bold text-sm md:text-base"
                              >
                                -
                              </button>
                              <input 
                                type="text"
                                inputMode="decimal"
                                pattern="[0-9,]*"
                                className="w-16 md:w-20 text-center border-2 border-blue-300 rounded-lg py-1.5 px-1 mx-0.5 text-sm md:text-base focus:border-blue-500 focus:outline-none bg-white"
                                value={String(p.stockActual).replace(".", ",")}
                                onChange={(e) => {
                                  const input = e.target.value.replace(/[^0-9,]/g, '');
                                  const valor = parseFloat(input.replace(",", "."));
                                  if (input === "" || (!isNaN(valor) && valor >= 0)) {
                                    setProductos(productos.map(prod => 
                                      prod.id === p.id ? { ...prod, stockActual: input === "" ? 0 : valor } : prod
                                    ));
                                  }
                                }}
                                onFocus={(e) => e.target.select()}
                              />
                              <button 
                                onClick={() => actualizarStock(p.id, 1)}
                                className="bg-green-500 text-white w-7 h-7 md:w-8 md:h-8 rounded hover:bg-green-600 flex items-center justify-center flex-shrink-0 font-bold text-sm md:text-base"
                              >
                                +
                              </button>
                              <span className="text-xs text-gray-500 ml-1 hidden md:inline">{p.unidad}</span>
                            </div>
                          </td>
                          <td className="p-1 md:p-2 text-center font-medium text-xs hidden sm:table-cell">
                            {p.stockMinimo?.toFixed(2)}
                          </td>
                          <td className="p-1 md:p-2 text-center">
                            {p.stockActual < p.stockMinimo ? (
                              <span className="text-red-600 font-bold text-xs">⚠️</span>
                            ) : (
                              <span className="text-green-600 text-xs">✓</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                )}
              </div>
              );
            })}
            <div className="flex justify-end mt-4">
              <button 
                onClick={enviarInventario}
                className="px-6 py-2 rounded text-white font-bold bg-green-600 hover:bg-green-700"
              >
                ENVIAR
              </button>
            </div>
          </div>
        )}

        {vista === "recetas" && (
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">Recetas de Productos</h2>
              <button 
                onClick={() => { setEditarReceta(null); setModalRecetaAbierto(true); }}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                + Agregar Receta
              </button>
            </div>
            {(["hamburguesa", "combos", "acompanamiento", "bebida"] as const).map(cat => {
              const productosCategoria = productosVenta.filter(p => p.categoria === cat);
              const expandida = categoriasExpandidas[cat] || false;
              
              return (
                <div key={cat} className="mb-4">
                  <h3 
                    className="bg-gray-200 px-4 py-2 font-bold text-gray-700 rounded-t-lg uppercase cursor-pointer flex justify-between items-center hover:bg-gray-300"
                    onClick={() => setCategoriasExpandidas(prev => ({ ...prev, [cat]: !prev[cat] }))}
                  >
                    <span>{cat === "hamburguesa" ? "Hamburguesas" : cat === "combos" ? "COMBOS" : cat === "acompanamiento" ? "Acompañamientos" : "Bebidas"}</span>
                    <span>{expandida ? "▼" : "▶"}</span>
                  </h3>
                  {expandida && (
                    <div className="border border-t-0 p-2">
                      {productosCategoria.map(pv => {
                        const expandidaReceta = recetasExpandidas[pv.id] || false;
                        const recetasProducto = getRecetasParaProducto(pv.id);
                        const costoTotal = recetasProducto.reduce((acc, r) => {
                          const insumo = productos.find(p => p.id === r.insumoId);
                          return acc + (r.cantidad * (insumo?.precioCompra || 0));
                        }, 0);
                        
                        return (
                          <div key={pv.id} className="border-b py-2">
                            <div 
                              className="flex justify-between items-center cursor-pointer hover:bg-gray-50 p-2 rounded"
                              onClick={() => setRecetasExpandidas(prev => ({ ...prev, [pv.id]: !prev[pv.id] }))}
                            >
                              <div className="flex items-center gap-4">
                                <h3 className="font-bold text-blue-600">{pv.nombre}</h3>
                                <span className="text-green-600 font-semibold">S/.{pv.precio.toFixed(2)}</span>
                                <span className="text-orange-600 text-sm">Costo: S/.{costoTotal.toFixed(2)}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <button 
                                  onClick={(e) => { e.stopPropagation(); setEditarReceta(pv); setModalRecetaAbierto(true); }}
                                  className="text-blue-600 hover:underline text-sm"
                                >
                                  ✏️ Modificar
                                </button>
                                <span className="text-gray-500">{expandidaReceta ? "▼" : "▶"}</span>
                              </div>
                            </div>
                            {expandidaReceta && (
                              <div className="ml-4 mt-2 p-3 bg-gray-50 rounded">
                                {recetasProducto.length === 0 ? (
                                  <p className="text-gray-500 text-sm">No hay ingredientes registrados</p>
                                ) : (
                                  <table className="w-full text-sm">
                                    <thead>
                                      <tr className="text-left text-gray-600">
                                        <th className="pb-2">Ingrediente</th>
                                        <th className="pb-2 text-center">Cantidad</th>
                                        <th className="pb-2 text-right">Precio Unit.</th>
                                        <th className="pb-2 text-right">Costo</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {recetasProducto.map(r => {
                                        const insumo = productos.find(p => p.id === r.insumoId);
                                        const costo = r.cantidad * (insumo?.precioCompra || 0);
                                        return (
                                          <tr key={r.id} className="border-t border-gray-200">
                                            <td className="py-2">{insumo?.nombre}</td>
                                            <td className="py-2 text-center">{r.cantidad} {insumo?.unidad}</td>
                                            <td className="py-2 text-right">S/.{insumo?.precioCompra.toFixed(2)}</td>
                                            <td className="py-2 text-right font-medium">S/.{costo.toFixed(2)}</td>
                                          </tr>
                                        );
                                      })}
                                      <tr className="border-t border-gray-300 font-bold">
                                        <td colSpan={3} className="py-2 text-right">Costo Total:</td>
                                        <td className="py-2 text-right text-orange-600">S/.{costoTotal.toFixed(2)}</td>
                                      </tr>
                                      <tr className="font-bold">
                                        <td colSpan={3} className="py-2 text-right">Margen de Ganancia:</td>
                                        <td className="py-2 text-right text-green-600">S/.{(pv.precio - costoTotal).toFixed(2)}</td>
                                      </tr>
                                    </tbody>
                                  </table>
                                )}
                              </div>
                            )}
                          </div>
                          );
                        })}
                        {productosCategoria.length === 0 && (
                          <p className="text-gray-500 text-center py-4">No hay productos en esta categoría</p>
                        )}
                    </div>
                  )}
                </div>
              );
            })}
            <div className="flex justify-end mt-4">
              <button 
                onClick={() => guardarRecetas(productosVenta, recetas)}
                className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 font-bold"
              >
                GUARDAR
              </button>
            </div>
          </div>
        )}

        {vista === "movimientos" && (
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-lg font-bold mb-4">Historial de Movimientos</h2>
            {movimientos.length === 0 ? (
              <p className="text-gray-500">No hay movimientos registrados</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-200">
                      <th className="p-2 text-left">Fecha</th>
                      <th className="p-2 text-left">Tipo</th>
                      <th className="p-2 text-left">Producto</th>
                      <th className="p-2 text-right">Cantidad</th>
                      <th className="p-2 text-left">Motivo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movimientos.map(m => (
                      <tr key={m.id} className="border-b">
                        <td className="p-2">{m.fecha}</td>
                        <td className="p-2">
                          <span className={m.tipo === "entrada" ? "text-green-600" : "text-red-600"}>
                            {m.tipo === "entrada" ? "Entrada" : "Salida"}
                          </span>
                        </td>
                        <td className="p-2">{getProductoNombre(m.productoId)}</td>
                        <td className="p-2 text-right">{m.cantidad}</td>
                        <td className="p-2">{m.motivo}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {vista === "informe" && (
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-lg font-bold mb-4">Informe Diario - {new Date().toISOString().split("T")[0]}</h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-green-100 p-4 rounded">
                <p className="text-green-800 font-bold">Entradas (Compras)</p>
                <p className="text-2xl font-bold">S/.{entradas.toFixed(2)}</p>
              </div>
              <div className="bg-red-100 p-4 rounded">
                <p className="text-red-800 font-bold">Salidas (Consumo)</p>
                <p className="text-2xl font-bold">S/.{salidas.toFixed(2)}</p>
              </div>
            </div>
            <h3 className="font-bold mb-2">Movimientos del día</h3>
            {movimientosHoy.length === 0 ? (
              <p className="text-gray-500">No hay movimientos hoy</p>
            ) : (
              <ul className="text-sm">
                {movimientosHoy.map(m => (
                  <li key={m.id} className="border-b py-1">
                    {m.tipo === "entrada" ? "📥" : "📤"} {getProductoNombre(m.productoId)}: {m.cantidad} - {m.motivo}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {vista === "baseDatos" && (
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">📂 Base de Datos - Productos</h2>
              <button 
                onClick={() => setModalAgregarProducto(true)}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                + Agregar Producto
              </button>
            </div>
            {["hamburguesas", "bebidas", "aseo"].map(cat => {
              const productosCategoria = productos.filter(p => p.categoria === cat);
              const expandida = categoriasExpandidas[cat] || false;
              return (
              <div key={cat} className="mb-6">
                <h3 
                  className="bg-purple-200 px-4 py-2 font-bold text-purple-800 rounded-t-lg uppercase cursor-pointer flex justify-between items-center hover:bg-purple-300"
                  onClick={() => setCategoriasExpandidas(prev => ({ ...prev, [cat]: !prev[cat] }))}
                >
                  <span>{cat} ({productosCategoria.length})</span>
                  <span>{expandida ? "▼" : "▶"}</span>
                </h3>
                {expandida && (
                <div className="overflow-x-auto border border-t-0">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="p-2 text-left">Nombre</th>
                        <th className="p-2 text-left">Proveedor</th>
                        <th className="p-2 text-left">Número</th>
                        <th className="p-2 text-left">Unidad</th>
                        <th className="p-2 text-center">Cant. Mínima</th>
                        <th className="p-2 text-right">Costo Unit.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productosCategoria.map(p => (
                        <tr key={p.id} className="border-b hover:bg-gray-50">
                          <td className="p-2">
                            <input 
                              type="text" 
                              className="w-full border p-1 rounded"
                              value={p.nombre}
                              onChange={(e) => {
                                setProductos(productos.map(prod => 
                                  prod.id === p.id ? { ...prod, nombre: e.target.value } : prod
                                ));
                              }}
                            />
                          </td>
                          <td className="p-2">
                            <input 
                              type="text" 
                              className="w-full border p-1 rounded"
                              value={p.proveedor}
                              onChange={(e) => {
                                setProductos(productos.map(prod => 
                                  prod.id === p.id ? { ...prod, proveedor: e.target.value } : prod
                                ));
                              }}
                            />
                          </td>
                          <td className="p-2">
                            <input 
                              type="text" 
                              className="w-full border p-1 rounded"
                              value={p.numero}
                              onChange={(e) => {
                                setProductos(productos.map(prod => 
                                  prod.id === p.id ? { ...prod, numero: e.target.value } : prod
                                ));
                              }}
                            />
                          </td>
                          <td className="p-2">
                            <input 
                              type="text" 
                              className="w-full border p-1 rounded"
                              value={p.unidad}
                              onChange={(e) => {
                                setProductos(productos.map(prod => 
                                  prod.id === p.id ? { ...prod, unidad: e.target.value } : prod
                                ));
                              }}
                            />
                          </td>
                          <td className="p-2">
                            <input 
                              type="number" 
                              className="w-20 border p-1 rounded text-center"
                              value={p.stockMinimo}
                              onChange={(e) => {
                                setProductos(productos.map(prod => 
                                  prod.id === p.id ? { ...prod, stockMinimo: parseInt(e.target.value) || 0 } : prod
                                ));
                              }}
                            />
                          </td>
                          <td className="p-2">
                            <input 
                              type="number" 
                              step="0.01"
                              className="w-24 border p-1 rounded text-right"
                              value={p.precioCompra}
                              onChange={(e) => {
                                setProductos(productos.map(prod => 
                                  prod.id === p.id ? { ...prod, precioCompra: parseFloat(e.target.value) || 0 } : prod
                                ));
                              }}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                )}
              </div>
              );
            })}
            <div className="flex justify-end mt-4">
              <button 
                onClick={guardarBaseDatos}
                className="px-6 py-2 rounded text-white font-bold bg-green-600 hover:bg-green-700"
              >
                GUARDAR
              </button>
            </div>
          </div>
        )}
      </div>

      {modalAbierto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Registrar Compra</h2>
            
            <label className="block mb-2">
              <span className="text-gray-700">Tipo de movimiento:</span>
              <div className="mt-1 p-2 bg-green-100 text-green-800 rounded">
                Entrada (Compra)
              </div>
            </label>

            <label className="block mb-2">
              <span className="text-gray-700">Producto:</span>
              <select 
                className="w-full border p-2 rounded mt-1"
                value={productoSeleccionado}
                onChange={(e) => setProductoSeleccionado(Number(e.target.value))}
              >
                <option value={0}>Seleccionar...</option>
                {productos.map(p => (
                  <option key={p.id} value={p.id}>{p.nombre} ({p.unidad})</option>
                ))}
              </select>
            </label>

            <label className="block mb-2">
              <span className="text-gray-700">Cantidad:</span>
              <input 
                type="number" 
                className="w-full border p-2 rounded mt-1"
                value={cantidadMovimiento}
                onChange={(e) => setCantidadMovimiento(Number(e.target.value))}
              />
            </label>

            <label className="block mb-4">
              <span className="text-gray-700">Fecha:</span>
              <input 
                type="date" 
                className="w-full border p-2 rounded mt-1"
                value={fechaMovimiento}
                onChange={(e) => setFechaMovimiento(e.target.value)}
              />
            </label>

            <div className="flex gap-2">
              <button 
                onClick={agregarMovimiento}
                className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
              >
                Guardar
              </button>
              <button 
                onClick={() => setModalAbierto(false)}
                className="flex-1 bg-gray-300 text-gray-700 py-2 rounded hover:bg-gray-400"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {modalRecetaAbierto && (
        <RecetaModal 
          producto={editarReceta} 
          productos={productos}
          recetas={recetas}
          onClose={() => { setModalRecetaAbierto(false); setEditarReceta(null); }}
          onSave={(producto, nuevasRecetas) => {
            if (editarReceta) {
              modificarReceta(producto, nuevasRecetas);
            } else {
              agregarReceta(producto, nuevasRecetas);
            }
            setModalRecetaAbierto(false);
            setEditarReceta(null);
          }}
        />
      )}

      {modalAgregarProducto && (
        <AgregarProductoModal 
          onClose={() => setModalAgregarProducto(false)}
          onSave={(producto) => agregarProducto(producto)}
        />
      )}
    </main>
  );
}

export default function Inventario() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p>Cargando...</p></div>}>
      <InventarioContent />
    </Suspense>
  );
}
