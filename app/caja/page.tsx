"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

type TipoEgreso = "egreso" | "propina";

type Egreso = {
  id: number;
  tipo: TipoEgreso;
  monto: number;
  descripcion: string;
  fecha: string;
  hora: string;
  usuario?: string;
  metodoPago?: string;
};

type InyeccionCaja = {
  id: number;
  monto: number;
  fecha: string;
  hora: string;
};

type ProductoPorPedir = {
  id: string;
  nombre: string;
  unidad: string;
  stockActual: number;
  stockMinimo: number;
  porPedir: number;
  proveedor?: string;
  numero?: string;
  precioCompra?: number;
};

export default function Caja() {
  const router = useRouter();
  const [verificando, setVerificando] = useState(true);
  const [vista, setVista] = useState<"efectivo" | "compras">("efectivo");
  const [egresos, setEgresos] = useState<Egreso[]>([]);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [tipoEgreso, setTipoEgreso] = useState<TipoEgreso>("egreso");
  const [monto, setMonto] = useState(0);
  const [descripcion, setDescripcion] = useState("");
  const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0]);
  const [mostrarRegistro, setMostrarRegistro] = useState(false);
  const [fechaFiltro, setFechaFiltro] = useState(new Date().toISOString().split("T")[0]);
  const [montoInicial, setMontoInicial] = useState(0);
  const [montoFinal, setMontoFinal] = useState(0);
  const [montoInicialGuardado, setMontoInicialGuardado] = useState(0);
  const [ultimaActualizacion, setUltimaActualizacion] = useState<string | null>(null);
  const [inyeccionMonto, setInyeccionMonto] = useState(0);
  const [inyeccionCompras, setInyeccionCompras] = useState(0);
  const [gastoCompras, setGastoCompras] = useState(0);
  const [inyecciones, setInyecciones] = useState<InyeccionCaja[]>([]);
  const [inyeccionUltimaActualizacion, setInyeccionUltimaActualizacion] = useState<string | null>(null);
  const [mostrarRegistroInyeccion, setMostrarRegistroInyeccion] = useState(false);
  const [fechaFiltroInyeccion, setFechaFiltroInyeccion] = useState(new Date().toISOString().split("T")[0]);
  const [notificacion, setNotificacion] = useState<string | null>(null);
  const [productosPorPedir, setProductosPorPedir] = useState<ProductoPorPedir[]>([]);
  const [ultimaActualizacionLista, setUltimaActualizacionLista] = useState<string | null>(null);
  const [compras, setCompras] = useState<any[]>([]);
  const [mostrarRegistroCompras, setMostrarRegistroCompras] = useState(false);
  const [fechaFiltroCompras, setFechaFiltroCompras] = useState(new Date().toISOString().split("T")[0]);
  const [nombreUsuario, setNombreUsuario] = useState("");
  const [nuevaCompraProducto, setNuevaCompraProducto] = useState("");
  const [nuevaCompraCantidad, setNuevaCompraCantidad] = useState(0);
  const [nuevaCompraPrecio, setNuevaCompraPrecio] = useState(0);
  const [modalRegistrarCompra, setModalRegistrarCompra] = useState(false);
  const [comprasARegistrar, setComprasARegistrar] = useState<Record<string, number>>({});
  const [modalCierreDia, setModalCierreDia] = useState(false);
  const [ventasDelDia, setVentasDelDia] = useState<any[]>([]);
  const [modalRegistroCierres, setModalRegistroCierres] = useState(false);
  const [cierresAnteriores, setCierresAnteriores] = useState<any[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "usuarios", user.uid));
          if (userDoc.exists()) {
            const datos = userDoc.data();
            setNombreUsuario(datos.nombre || user.displayName || user.email?.split("@")[0] || "Usuario");
          } else {
            setNombreUsuario(user.displayName || user.email?.split("@")[0] || "Usuario");
          }
        } catch {
          setNombreUsuario(user.displayName || user.email?.split("@")[0] || "Usuario");
        }
        setVerificando(false);
      } else {
        router.push("/");
      }
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const configRef = doc(db, "caja", "config");
        const configSnap = await getDoc(configRef);
        if (configSnap.exists()) {
          const data = configSnap.data();
          setMontoInicial(data.montoInicial || 0);
          setMontoInicialGuardado(data.montoInicial || 0);
          setInyeccionCompras(data.inyeccionCompras || 0);
          setUltimaActualizacion(data.ultimaActualizacion || null);
        }
      } catch (error) {
        console.log("Error cargando config:", error);
      }
    };
    cargarDatos();
  }, []);

  useEffect(() => {
    cargarEgresos();
    cargarInyecciones();
    cargarCompras();
    cargarProductosPorPedir();
  }, []);

  useEffect(() => {
    if (!verificando) {
      cargarVentas();
    }
  }, [verificando]);

  const cargarVentas = async () => {
    try {
      const ventasRef = doc(db, "ventas", "pedidos");
      const ventasSnap = await getDoc(ventasRef);
      if (ventasSnap.exists()) {
        setVentasDelDia(ventasSnap.data().pedidos || []);
      }
    } catch (error) {
      console.log("Error cargando ventas:", error);
    }
  };

  const cargarEgresos = async () => {
    try {
      const docRef = doc(db, "caja", "egresos");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setEgresos(docSnap.data().egresos || []);
      }
    } catch (error) {
      console.log("Error cargando egresos:", error);
    }
  };

  const cargarInyecciones = async () => {
    try {
      const docRef = doc(db, "caja", "inyecciones");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setInyecciones(docSnap.data().inyecciones || []);
      }
    } catch (error) {
      console.log("Error cargando inyecciones:", error);
    }
  };

  const cargarProductosPorPedir = async () => {
    try {
      const productosRef = doc(db, "caja", "productosPorPedir");
      const productosSnap = await getDoc(productosRef);
      const porPedirData = productosSnap.exists() ? productosSnap.data().productos || {} : {};
      const ultimaActualizacionData = productosSnap.exists() ? productosSnap.data().ultimaActualizacion || null : null;

      console.log("Caja - productosPorPedir de Firebase:", porPedirData);

      if (ultimaActualizacionData) {
        setUltimaActualizacionLista(ultimaActualizacionData);
      }

      const inventarioRef = doc(db, "inventario", "productos");
      const inventarioSnap = await getDoc(inventarioRef);
      
      if (inventarioSnap.exists()) {
        const datos = inventarioSnap.data();
        const productos = datos.productos || [];
        console.log("Caja - productos del inventario:", productos.length);
        
        const faltantes = productos
          .filter((p: any) => {
            const stockMin = p.stockMinimo || 0;
            const stockAct = p.stockActual || 0;
            console.log(`Caja - ${p.nombre}: stockActual=${stockAct}, stockMinimo=${stockMin}`);
            return stockAct < stockMin && stockMin > 0;
          })
          .map((p: any) => ({
            id: String(p.id),
            nombre: p.nombre,
            unidad: p.unidad || "und",
            stockActual: p.stockActual || 0,
            stockMinimo: p.stockMinimo || 0,
            porPedir: porPedirData[String(p.id)] || Math.max(0, (p.stockMinimo || 0) - (p.stockActual || 0)),
            proveedor: p.proveedor || "",
            numero: p.numero || "",
            precioCompra: p.precioCompra || 0
          }));
        
        console.log("Caja - faltantes encontrados:", faltantes);
        setProductosPorPedir(faltantes);
      } else {
        console.log("Caja - No se encontró documento de inventario en Firebase");
      }
    } catch (error) {
      console.log("Error cargando productos por pedir:", error);
    }
  };

  const guardarPorPedir = async (id: string, cantidad: number) => {
    const productosActualizados = productosPorPedir.map(p => 
      p.id === id ? { ...p, porPedir: cantidad } : p
    );
    setProductosPorPedir(productosActualizados);

    const porPedirObj: Record<string, number> = {};
    productosActualizados.forEach(p => {
      porPedirObj[p.id] = p.porPedir !== undefined ? p.porPedir : 0;
    });

    try {
      await setDoc(doc(db, "caja", "productosPorPedir"), {
        productos: porPedirObj
      }, { merge: true });
    } catch (error) {
      console.error("Error guardando por pedir:", error);
    }
  };

  const enviarListaCompras = async () => {
    const ahora = new Date();
    const fechaHora = `${ahora.toLocaleDateString()} ${ahora.getHours().toString().padStart(2, '0')}:${ahora.getMinutes().toString().padStart(2, '0')}`;

    const listaParaEnviar = productosPorPedir
      .filter(p => {
        const falta = (p.stockMinimo || 0) - (p.stockActual || 0);
        const porPedir = p.porPedir !== undefined ? p.porPedir : falta;
        return porPedir > 0;
      })
      .map(p => {
        const falta = (p.stockMinimo || 0) - (p.stockActual || 0);
        const porPedir = p.porPedir !== undefined ? p.porPedir : falta;
        return {
          id: p.id,
          nombre: p.nombre,
          proveedor: p.proveedor || "",
          numero: p.numero || "",
          stockActual: p.stockActual,
          stockMinimo: p.stockMinimo,
          porPedir,
          precioUnitario: p.precioCompra || 0,
          total: porPedir * (p.precioCompra || 0),
          fechaEnvio: ahora.toISOString().split("T")[0],
          horaEnvio: `${ahora.getHours().toString().padStart(2, '0')}:${ahora.getMinutes().toString().padStart(2, '0')}`
        };
      });

    if (listaParaEnviar.length === 0) return;

    try {
      const historialRef = doc(db, "compras", "listasEnviadas");
      const historialSnap = await getDoc(historialRef);
      const historialActual = historialSnap.exists() ? historialSnap.data().listas || [] : [];
      
      const nuevaLista = {
        id: Date.now(),
        fecha: fechaHora,
        productos: listaParaEnviar,
        total: listaParaEnviar.reduce((acc, p) => acc + p.total, 0)
      };

      await setDoc(historialRef, {
        listas: [nuevaLista, ...historialActual]
      });

      const configRef = doc(db, "inventario", "config");
      await setDoc(configRef, {
        ultimaActualizacion: `${fechaHora} - ${nombreUsuario}`
      }, { merge: true });

      setNotificacion("La lista de compra se envió exitosamente");
      setTimeout(() => setNotificacion(null), 4000);
    } catch (error) {
      console.error("Error enviando lista:", error);
    }
  };

  const enviarListaWhatsApp = () => {
    const listaParaEnviar = productosPorPedir
      .filter(p => {
        const falta = (p.stockMinimo || 0) - (p.stockActual || 0);
        const porPedir = p.porPedir !== undefined ? p.porPedir : falta;
        return porPedir > 0;
      });

    if (listaParaEnviar.length === 0) {
      setNotificacion("No hay productos para enviar");
      setTimeout(() => setNotificacion(null), 3000);
      return;
    }

    let mensaje = "🛒 *LISTA DE COMPRAS*%0A%0A";
    let total = 0;

    listaParaEnviar.forEach(p => {
      const falta = (p.stockMinimo || 0) - (p.stockActual || 0);
      const porPedir = p.porPedir !== undefined ? p.porPedir : falta;
      const unidad = p.unidad || "und";
      const precioUnitario = p.precioCompra || 0;
      const subtotal = porPedir * precioUnitario;
      total += subtotal;
      mensaje += `• ${p.nombre}: ${porPedir} ${unidad} x S/.${precioUnitario.toFixed(2)} = S/.${subtotal.toFixed(2)}%0A`;
    });

    mensaje += `%0A*TOTAL: S/.${total.toFixed(2)}*`;
    mensaje += `%0A%0AEnviado por: ${nombreUsuario}`;

    window.open(`https://wa.me/?text=${mensaje}`, "_blank");
  };

  const registrarCompras = async () => {
    const productosConCompra = Object.entries(comprasARegistrar).filter(([_, cantidad]) => cantidad > 0);
    
    if (productosConCompra.length === 0) {
      setNotificacion("No hay productos registrados para comprar");
      setTimeout(() => setNotificacion(null), 3000);
      return;
    }

    try {
      const docRef = doc(db, "inventario", "productos");
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        console.error("No se encontró el documento de productos");
        return;
      }

      const datos = docSnap.data();
      let productos = datos.productos || [];
      const ahora = new Date();
      const hora = `${ahora.getHours().toString().padStart(2, '0')}:${ahora.getMinutes().toString().padStart(2, '0')}`;
      const fecha = ahora.toISOString().split("T")[0];
      const fechaActualizada = `${ahora.toLocaleDateString()} ${hora}`;

      const nuevasComprasRegistradas: any[] = [];
      const nuevosProductos = productos.map((p: any) => {
        const cantidadComprada = comprasARegistrar[p.id] || 0;
        if (cantidadComprada > 0) {
          nuevasComprasRegistradas.push({
            id: Date.now() + Math.random(),
            productoNombre: p.nombre,
            cantidad: cantidadComprada,
            precioUnitario: p.precioCompra || 0,
            total: cantidadComprada * (p.precioCompra || 0),
            fecha,
            hora,
            usuario: nombreUsuario
          });
          return { ...p, stockActual: (p.stockActual || 0) + cantidadComprada };
        }
        return p;
      });

      await setDoc(docRef, { productos: nuevosProductos });

      const comprasRef = doc(db, "compras", "registros");
      const comprasSnap = await getDoc(comprasRef);
      const comprasAnteriores = comprasSnap.exists() ? comprasSnap.data().compras || [] : [];
      await setDoc(comprasRef, { compras: [...nuevasComprasRegistradas, ...comprasAnteriores] });

      const porPedirObj: Record<string, number> = {};
      Object.keys(comprasARegistrar).forEach(id => {
        porPedirObj[id] = 0;
      });
      await setDoc(doc(db, "caja", "productosPorPedir"), { productos: porPedirObj }, { merge: true });

      const configRef = doc(db, "inventario", "config");
      await setDoc(configRef, { ultimaActualizacion: `${fechaActualizada} - ${nombreUsuario}` }, { merge: true });

      setModalRegistrarCompra(false);
      setComprasARegistrar({});
      setNotificacion("Compra registrada exitosamente, stock actualizado");
      setTimeout(() => setNotificacion(null), 4000);
      
      cargarProductosPorPedir();
      cargarCompras();
    } catch (error) {
      console.error("Error registrando compra:", error);
    }
  };

  const cargarCompras = async () => {
    try {
      const comprasRef = doc(db, "compras", "registros");
      const comprasSnap = await getDoc(comprasRef);
      const hoy = new Date().toISOString().split("T")[0];
      if (comprasSnap.exists()) {
        const comprasData = comprasSnap.data().compras || [];
        setCompras(comprasData);
        const comprasHoy = comprasData.filter((c: any) => c.fecha === hoy);
        const totalGasto = comprasHoy.reduce((acc: number, c: any) => acc + (c.total || 0), 0);
        setGastoCompras(totalGasto);
      }
    } catch (error) {
      console.log("Error cargando compras:", error);
    }
  };

  const cargarUltimaActualizacion = async () => {
    try {
      const docRef = doc(db, "inventario", "productos");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists() && docSnap.data().ultimaActualizacion) {
        setUltimaActualizacionLista(docSnap.data().ultimaActualizacion);
      }
    } catch (error) {
      console.log("Error cargando última actualización:", error);
    }
  };

  const registrarCompra = async () => {
    if (!nuevaCompraProducto || nuevaCompraCantidad <= 0 || nuevaCompraPrecio <= 0) return;

    const nuevaCompra: any = {
      id: Date.now(),
      producto: nuevaCompraProducto,
      cantidad: nuevaCompraCantidad,
      precioUnitario: nuevaCompraPrecio,
      total: nuevaCompraCantidad * nuevaCompraPrecio,
      fecha: new Date().toISOString().split("T")[0],
      hora: `${new Date().getHours().toString().padStart(2, '0')}:${new Date().getMinutes().toString().padStart(2, '0')}`
    };

    const nuevasCompras = [...compras, nuevaCompra];
    setCompras(nuevasCompras);

    try {
      await setDoc(doc(db, "compras", "registros"), {
        compras: nuevasCompras
      });
      setNotificacion("Compra registrada exitosamente");
      setTimeout(() => setNotificacion(null), 3000);
    } catch (error) {
      console.error("Error guardando compra:", error);
    }

    setNuevaCompraProducto("");
    setNuevaCompraCantidad(0);
    setNuevaCompraPrecio(0);
  };

  const guardarMontoInicial = async () => {
    if (montoInicial <= 0) return;
    
    const ahora = new Date();
    const fecha = ahora.toISOString().split("T")[0];
    const fechaHora = `${ahora.toLocaleDateString()} ${ahora.getHours().toString().padStart(2, '0')}:${ahora.getMinutes().toString().padStart(2, '0')}`;
    const totalFinal = montoInicial + inyeccionCompras - gastoCompras - totalEgresos;
    
    try {
      await setDoc(doc(db, "caja", "config"), {
        montoInicial,
        inyeccionCompras,
        montoFinal: totalFinal,
        fecha,
        ultimaActualizacion: `${fechaHora} - ${nombreUsuario}`
      });
      setMontoInicialGuardado(montoInicial);
      setUltimaActualizacion(`${fechaHora} - ${nombreUsuario}`);
      setNotificacion("Efectivo actualizado correctamente");
      setTimeout(() => setNotificacion(null), 4000);
    } catch (error) {
      console.error("Error guardando monto inicial:", error);
    }
  };

  const guardarInyeccion = async () => {
    if (inyeccionMonto <= 0) return;

    const ahora = new Date();
    const fecha = ahora.toISOString().split("T")[0];
    const hora = `${ahora.getHours().toString().padStart(2, '0')}:${ahora.getMinutes().toString().padStart(2, '0')}`;
    const fechaHora = `${ahora.toLocaleDateString()} ${hora}`;

    const nuevaInyeccion: InyeccionCaja = {
      id: Date.now(),
      monto: inyeccionMonto,
      fecha,
      hora,
    };

    const nuevasInyecciones = [...inyecciones, nuevaInyeccion];
    setInyecciones(nuevasInyecciones);

    const nuevoMontoInicial = montoInicialGuardado + inyeccionMonto;

    try {
      await setDoc(doc(db, "caja", "inyecciones"), {
        inyecciones: nuevasInyecciones
      });
      await setDoc(doc(db, "caja", "config"), {
        montoInicial: nuevoMontoInicial,
        fecha,
        ultimaActualizacion: fechaHora
      });
      setInyeccionUltimaActualizacion(fechaHora);
      setMontoInicialGuardado(nuevoMontoInicial);
      setMontoInicial(nuevoMontoInicial);
      setUltimaActualizacion(fechaHora);
      setNotificacion("Inyección de caja realizada con éxito, tu caja en efectivo aumentó");
    } catch (error) {
      console.error("Error guardando inyeccion:", error);
    }

    setInyeccionMonto(0);
    
    setTimeout(() => setNotificacion(null), 4000);
  };

  const guardarEgreso = async () => {
    if (monto <= 0) return;

    const ahora = new Date();
    const hora = `${ahora.getHours().toString().padStart(2, '0')}:${ahora.getMinutes().toString().padStart(2, '0')}`;

    const nuevoEgreso: Egreso = {
      id: Date.now(),
      tipo: tipoEgreso,
      monto,
      descripcion,
      fecha,
      hora,
      usuario: nombreUsuario
    };

    const nuevosEgresos = [...egresos, nuevoEgreso];
    setEgresos(nuevosEgresos);

    try {
      await setDoc(doc(db, "caja", "egresos"), {
        egresos: nuevosEgresos
      });
    } catch (error) {
      console.error("Error guardando egreso:", error);
    }

    setModalAbierto(false);
    setMonto(0);
    setDescripcion("");
    setTipoEgreso("egreso");
  };

  const eliminarEgreso = async (id: number) => {
    if (!confirm("¿Estás seguro de eliminar este egreso?")) return;

    const nuevosEgresos = egresos.filter(e => e.id !== id);
    setEgresos(nuevosEgresos);

    try {
      await setDoc(doc(db, "caja", "egresos"), {
        egresos: nuevosEgresos
      });
    } catch (error) {
      console.error("Error eliminando egreso:", error);
    }
  };

  const hoy = new Date().toISOString().split("T")[0];
  const egresosHoy = egresos.filter(e => e.fecha === hoy);
  const totalEgresos = egresosHoy.reduce((acc, e) => acc + e.monto, 0);
  const montoFinalCalculado = montoInicialGuardado + inyeccionCompras - gastoCompras - totalEgresos;

  if (verificando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-lg">Cargando...</p>
      </div>
    );
  }

  const enviarCierreWhatsApp = () => {
    const hoy = new Date().toISOString().split("T")[0];
    const comprasHoy = compras.filter(c => c.fecha === hoy);
    const totalCompras = comprasHoy.reduce((acc, c) => acc + (c.total || 0), 0);
    const ventasHoy = ventasDelDia.filter((v: any) => v.fecha?.split(" ")[0] === hoy || v.fecha === hoy);
    const ventasEfectivo = ventasHoy.filter((v: any) => v.metodoPago === "efectivo").reduce((acc: number, v: any) => acc + (v.total || 0), 0);
    const ventasYape = ventasHoy.filter((v: any) => v.metodoPago === "yape" || v.metodoPago === "yape/quimby").reduce((acc: number, v: any) => acc + (v.total || 0), 0);
    const ventasPOS = ventasHoy.filter((v: any) => v.metodoPago === "pos" || v.metodoPago === "tarjeta").reduce((acc: number, v: any) => acc + (v.total || 0), 0);
    const totalVentas = ventasEfectivo + ventasYape + ventasPOS;
    const efectivoCaja = montoInicialGuardado + inyeccionCompras + ventasEfectivo - totalCompras - totalEgresos;
    
    const mensaje = `🔒 *CIERRE DEL DÍA*%0A%0A` +
      `📅 Fecha: ${hoy}%0A` +
      `👤 Usuario: ${nombreUsuario}%0A%0A` +
      `💵 *RESUMEN DE CAJA*%0A` +
      `• Monto Inicial: S/.${montoInicialGuardado.toFixed(2)}%0A` +
      `• Inyección: S/.${inyeccionCompras.toFixed(2)}%0A%0A` +
      `🛒 *COMPRAS*%0A` +
      `• Total Compras: S/.${totalCompras.toFixed(2)}%0A%0A` +
      `💰 *VENTAS*%0A` +
      `• Efectivo: S/.${ventasEfectivo.toFixed(2)}%0A` +
      `• Yape/Plin: S/.${ventasYape.toFixed(2)}%0A` +
      `• POS: S/.${ventasPOS.toFixed(2)}%0A` +
      `• Total Ventas: S/.${totalVentas.toFixed(2)}%0A%0A` +
      `📤 *EGRESOS*%0A` +
      `• Total Egresos: S/.${totalEgresos.toFixed(2)}%0A%0A` +
      `💵 *EFECTIVO EN CAJA*%0A` +
      `• S/.${efectivoCaja.toFixed(2)}%0A`;
    
    window.open(`https://wa.me/?text=${mensaje}`, "_blank");
  };

  const guardarCierreDia = async () => {
    const hoy = new Date().toISOString().split("T")[0];
    const ahora = new Date();
    const hora = `${ahora.getHours().toString().padStart(2, '0')}:${ahora.getMinutes().toString().padStart(2, '0')}`;
    
    const comprasHoy = compras.filter(c => c.fecha === hoy);
    const totalCompras = comprasHoy.reduce((acc, c) => acc + (c.total || 0), 0);
    const ventasHoy = ventasDelDia.filter((v: any) => v.fecha?.split(" ")[0] === hoy || v.fecha === hoy);
    const ventasEfectivo = ventasHoy.filter((v: any) => v.metodoPago === "efectivo").reduce((acc: number, v: any) => acc + (v.total || 0), 0);
    const ventasYape = ventasHoy.filter((v: any) => v.metodoPago === "yape" || v.metodoPago === "yape/quimby").reduce((acc: number, v: any) => acc + (v.total || 0), 0);
    const ventasPOS = ventasHoy.filter((v: any) => v.metodoPago === "pos" || v.metodoPago === "tarjeta").reduce((acc: number, v: any) => acc + (v.total || 0), 0);
    const totalVentas = ventasEfectivo + ventasYape + ventasPOS;
    const efectivoCaja = montoInicialGuardado + inyeccionCompras + ventasEfectivo - totalCompras - totalEgresos;
    
    const cierreData = {
      id: Date.now(),
      fecha: hoy,
      hora,
      usuario: nombreUsuario,
      montoInicial: montoInicialGuardado,
      inyeccion: inyeccionCompras,
      totalCompras,
      ventasEfectivo,
      ventasYape,
      ventasPOS,
      totalVentas,
      totalEgresos,
      efectivoCaja
    };
    
    try {
      const cierresRef = doc(db, "caja", "cierresDiarios");
      const cierresSnap = await getDoc(cierresRef);
      const cierresAnterioresData = cierresSnap.exists() ? cierresSnap.data().cierres || [] : [];
      
      await setDoc(cierresRef, {
        cierres: [cierreData, ...cierresAnterioresData]
      }, { merge: true });
      
      setNotificacion("Cierre del día guardado exitosamente");
      setTimeout(() => setNotificacion(null), 4000);
      setModalCierreDia(false);
    } catch (error) {
      console.error("Error guardando cierre:", error);
    }
  };

  const cargarCierresAnteriores = async () => {
    try {
      const cierresRef = doc(db, "caja", "cierresDiarios");
      const cierresSnap = await getDoc(cierresRef);
      if (cierresSnap.exists()) {
        setCierresAnteriores(cierresSnap.data().cierres || []);
      }
    } catch (error) {
      console.log("Error cargando cierres:", error);
    }
  };

  const cerrarSesion = async () => {
    await signOut(auth);
    router.push("/");
  };

  return (
    <main className="min-h-screen bg-gray-100">
      <header className="bg-green-600 text-white p-3 md:p-4">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-base md:text-xl font-bold">💰 Caja Chica</h1>
          <div className="flex gap-2">
            <button onClick={() => router.push("/menu")} className="bg-green-700 px-2 md:px-4 py-2 rounded text-sm hover:bg-green-800">
              ← Menú
            </button>
            <button onClick={cerrarSesion} className="bg-red-500 px-2 md:px-4 py-2 rounded text-sm hover:bg-red-600">
              Salir
            </button>
          </div>
        </div>
      </header>
      <div className="container mx-auto p-3 md:p-4">
        <div className="flex gap-2 mb-3 md:mb-4 overflow-x-auto pb-2">
          <button 
            onClick={() => setVista("efectivo")} 
            className={`px-3 py-2 rounded text-sm whitespace-nowrap ${vista === "efectivo" ? "bg-green-600 text-white" : "bg-white text-gray-700"}`}
          >
            💵 Efectivo
          </button>
          <button 
            onClick={() => setVista("compras")} 
            className={`px-3 py-2 rounded text-sm whitespace-nowrap ${vista === "compras" ? "bg-orange-600 text-white" : "bg-white text-gray-700"}`}
          >
            🛒 Compras
          </button>
        </div>
        
        {vista === "efectivo" && (
          <div className="bg-white rounded-lg shadow p-3 md:p-4">
            {notificacion && (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
                {notificacion}
              </div>
            )}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-gray-700 font-bold mb-1">Monto inicial de hoy:</label>
                <input 
                  type="number" 
                  step="0.01"
                  className="w-full border p-2 rounded"
                  value={montoInicial}
                  onChange={(e) => setMontoInicial(parseFloat(e.target.value) || 0)}
                />
                {ultimaActualizacion && (
                  <p className="text-xs text-gray-500 mt-2">
                    Última actualización: {ultimaActualizacion.split(" - ")[0]}
                    <span className={`ml-2 px-2 py-1 rounded text-white text-xs ${
                      ultimaActualizacion.split(" - ")[1]?.toLowerCase() === "admin" ? "bg-purple-600" : 
                      ultimaActualizacion.split(" - ")[1]?.toLowerCase() === "cubas" ? "bg-orange-500" : 
                      ultimaActualizacion.split(" - ")[1]?.toLowerCase() === "cocina1" ? "bg-blue-600" : 
                      "bg-gray-500"
                    }`}>
                      {ultimaActualizacion.split(" - ")[1]}
                    </span>
                  </p>
                )}
              </div>
              <div>
                <label className="block text-gray-700 font-bold mb-1">Inyección de compras de hoy:</label>
                <input 
                  type="number" 
                  step="0.01"
                  className="w-full border p-2 rounded"
                  value={inyeccionCompras}
                  onChange={(e) => setInyeccionCompras(parseFloat(e.target.value) || 0)}
                />
                <p className="text-xs text-gray-500 mt-2">Se suma al monto inicial</p>
                <div className="flex justify-end mt-2">
                  <button 
                    onClick={guardarMontoInicial}
                    className="bg-green-600 text-white px-8 py-2 rounded hover:bg-green-700"
                  >
                    Guardar
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-gray-700 font-bold mb-1">Gasto de compras de hoy:</label>
                <input 
                  type="number" 
                  step="0.01"
                  className="w-full border p-2 rounded bg-gray-100"
                  value={gastoCompras}
                  readOnly
                />
                <p className="text-xs text-gray-500 mt-2">Total de compras registradas</p>
              </div>
              <div>
                <label className="block text-gray-700 font-bold mb-1">Monto final de hoy:</label>
                <input 
                  type="number" 
                  step="0.01"
                  className="w-full border p-2 rounded bg-gray-100"
                  value={montoFinalCalculado}
                  readOnly
                />
                <p className="text-xs text-gray-500 mt-2">Calculado: Inicial + Inyección - Egresos</p>
              </div>
            </div>

            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">Egresos en Efectivo</h2>
              <button 
                onClick={() => setModalAbierto(true)}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
              >
                + Registrar Egreso
              </button>
            </div>

            <div className="bg-red-100 p-4 rounded mb-4">
              <p className="text-red-800 font-bold">Egresos de hoy: S/.{totalEgresos.toFixed(2)}</p>
              <p className="text-sm text-red-600">{egresosHoy.length} movimientos</p>
            </div>

            <div className="mb-4">
              <button 
                onClick={() => setMostrarRegistro(!mostrarRegistro)}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                {mostrarRegistro ? "▼ Ocultar Registro de Egresos" : "▶ Ver Registro de Egresos"}
              </button>
            </div>

            {mostrarRegistro && (
                  <div className="mt-4">
                    <div className="flex items-center gap-4 mb-4">
                      <label className="text-sm font-bold">Filtrar por fecha:</label>
                      <input 
                        type="date" 
                        className="border p-2 rounded"
                        value={fechaFiltro}
                        onChange={(e) => setFechaFiltro(e.target.value)}
                      />
                    </div>
                    
                    {(() => {
                      const egresosFiltrados = [...egresos.filter(e => e.fecha === fechaFiltro)]
                        .sort((a, b) => b.hora.localeCompare(a.hora));
                      const totalDia = egresosFiltrados.reduce((acc, e) => acc + e.monto, 0);
                      
                      return (
                        <>
                          <div className="bg-blue-100 p-4 rounded mb-4">
                            <p className="text-blue-800 font-bold">Total del día ({fechaFiltro}): S/.{totalDia.toFixed(2)}</p>
                            <p className="text-sm text-blue-600">{egresosFiltrados.length} egresos</p>
                          </div>
                          
                          {egresosFiltrados.length === 0 ? (
                            <p className="text-gray-500">No hay egresos en esta fecha.</p>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                  <thead>
                                  <tr className="bg-gray-200">
                                    <th className="p-2 text-left">Tipo</th>
                                    <th className="p-2 text-left">Descripción</th>
                                    <th className="p-2 text-right">Monto</th>
                                    <th className="p-2 text-left">Fecha</th>
                                    <th className="p-2 text-left">Hora</th>
                                    <th className="p-2 text-left">Usuario</th>
                                    <th className="p-2 text-left">Método</th>
                                    <th className="p-2 text-center">Acción</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {egresosFiltrados.map(e => (
                                    <tr key={e.id} className="border-b">
                                      <td className="p-2">
                                        <span className={`px-2 py-1 rounded text-white text-xs ${
                                          e.tipo === "egreso" ? "bg-orange-500" : "bg-purple-500"
                                        }`}>
                                          {e.tipo === "egreso" ? "Egreso" : "Propina"}
                                        </span>
                                      </td>
                                      <td className="p-2">{e.descripcion || "-"}</td>
                                      <td className="p-2 text-right font-bold text-red-600">S/.{e.monto.toFixed(2)}</td>
                                      <td className="p-2">{e.fecha}</td>
                                      <td className="p-2">{e.hora}</td>
                                      <td className="p-2">
                                        <span className={`px-2 py-1 rounded text-white text-xs ${
                                          e.usuario?.toLowerCase() === "admin" ? "bg-purple-600" : 
                                          e.usuario?.toLowerCase() === "cubas" ? "bg-orange-500" : 
                                          e.usuario?.toLowerCase() === "cocina1" ? "bg-blue-600" : 
                                          "bg-gray-500"
                                        }`}>
                                          {e.usuario || "Usuario"}
                                        </span>
                                      </td>
                                      <td className="p-2">
                                        <span className={`px-2 py-1 rounded text-white text-xs ${
                                          e.metodoPago === "efectivo" ? "bg-green-500" : 
                                          e.metodoPago === "yape" ? "bg-orange-500" : 
                                          e.metodoPago === "pos" ? "bg-blue-500" : 
                                          "bg-gray-500"
                                        }`}>
                                          {e.metodoPago ? e.metodoPago.charAt(0).toUpperCase() + e.metodoPago.slice(1) : "-"}
                                        </span>
                                      </td>
                                      <td className="p-2 text-center">
                                        <button 
                                          onClick={() => eliminarEgreso(e.id)}
                                          className="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600"
                                        >
                                          Eliminar
                                        </button>
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
                </div>
              )}
              
              <div className="mt-4 flex justify-start gap-2">
                <button 
                  onClick={() => {
                    cargarVentas();
                    setModalCierreDia(true);
                  }}
                  className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                >
                  🔒 Cierre del Día
                </button>
                <button 
                  onClick={() => {
                    cargarCierresAnteriores();
                    setModalRegistroCierres(true);
                  }}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  📋 Ver Registro de Cierres
                </button>
              </div>
            </div>
          )}

          {vista === "compras" && (
            <div className="bg-white rounded-lg shadow p-3 md:p-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3 md:mb-4">
                <h2 className="text-base md:text-lg font-bold">📋 Lista de Compras</h2>
                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                  <button 
                    onClick={enviarListaWhatsApp}
                    className="flex-1 sm:flex-none bg-green-600 text-white px-3 py-2 rounded text-sm hover:bg-green-700"
                  >
                    📤 Enviar
                  </button>
                  <button 
                    onClick={() => setMostrarRegistroCompras(!mostrarRegistroCompras)}
                    className="flex-1 sm:flex-none bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700"
                  >
                    {mostrarRegistroCompras ? "Ocultar" : "Registro"}
                  </button>
                  <button 
                    onClick={() => setModalRegistrarCompra(true)}
                    className="flex-1 sm:flex-none bg-orange-600 text-white px-3 py-2 rounded text-sm hover:bg-orange-700"
                  >
                    + Compra
                  </button>
                </div>
              </div>

              {mostrarRegistroCompras && (
                <div className="mt-4">
                  <div className="flex items-center gap-4 mb-4">
                    <label className="text-sm font-bold">Filtrar por fecha:</label>
                    <input 
                      type="date" 
                      className="border p-2 rounded"
                      value={fechaFiltroCompras}
                      onChange={(e) => setFechaFiltroCompras(e.target.value)}
                    />
                  </div>
                  
                  {(() => {
                    const comprasFiltradas = [...compras.filter(c => c.fecha === fechaFiltroCompras)]
                      .sort((a, b) => b.hora.localeCompare(a.hora));
                    const totalDia = comprasFiltradas.reduce((acc, c) => acc + (c.total || 0), 0);
                    
                    return (
                      <>
                        <div className="bg-blue-100 p-4 rounded mb-4">
                          <p className="text-blue-800 font-bold">Total del día ({fechaFiltroCompras}): S/.{totalDia.toFixed(2)}</p>
                          <p className="text-sm text-blue-600">{comprasFiltradas.length} compras</p>
                        </div>
                        
                        {comprasFiltradas.length === 0 ? (
                          <p className="text-gray-500">No hay compras en esta fecha.</p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs md:text-sm">
                              <thead>
                                <tr className="bg-gray-200">
                                  <th className="p-2 text-left">Producto</th>
                                  <th className="p-2 text-right">Cant.</th>
                                  <th className="p-2 text-right hidden sm:table-cell">Unit.</th>
                                  <th className="p-2 text-right">Total</th>
                                  <th className="p-2 text-left hidden md:table-cell">Hora</th>
                                </tr>
                              </thead>
                              <tbody>
                                {comprasFiltradas.map((c, idx) => (
                                  <tr key={idx} className="border-b">
                                    <td className="p-2">{c.producto || "-"}</td>
                                    <td className="p-2 text-right">{c.cantidad || 0}</td>
                                    <td className="p-2 text-right hidden sm:table-cell">S/.{(c.precioUnitario || 0).toFixed(2)}</td>
                                    <td className="p-2 text-right font-bold">S/.{(c.total || 0).toFixed(2)}</td>
                                    <td className="p-2 hidden md:table-cell">{c.hora || "-"}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}

              {ultimaActualizacionLista && (
                <p className="text-xs text-gray-500 mb-4">
                  Última actualización: {ultimaActualizacionLista.split(" - ")[0]}
                  <span className={`ml-2 px-2 py-1 rounded text-white text-xs ${
                    ultimaActualizacionLista.split(" - ")[1]?.toLowerCase() === "admin" ? "bg-purple-600" : 
                    ultimaActualizacionLista.split(" - ")[1]?.toLowerCase() === "cubas" ? "bg-orange-500" : 
                    ultimaActualizacionLista.split(" - ")[1]?.toLowerCase() === "cocina1" ? "bg-blue-600" : 
                    "bg-gray-500"
                  }`}>
                    {ultimaActualizacionLista.split(" - ")[1]}
                  </span>
                </p>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-200">
                      <th className="p-2 text-left">Producto</th>
                      <th className="p-2 text-left">Proveedor</th>
                      <th className="p-2 text-right">Número</th>
                      <th className="p-2 text-right">Stock Actual</th>
                      <th className="p-2 text-right">Stock Mínimo</th>
                      <th className="p-2 text-right">Por Pedir</th>
                      <th className="p-2 text-right">Costo Unit.</th>
                      <th className="p-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...productosPorPedir]
                      .filter(p => {
                        const porPedir = p.porPedir !== undefined ? p.porPedir : 0;
                        return porPedir >= 0;
                      })
                      .sort((a, b) => {
                        const porPedirA = a.porPedir !== undefined ? a.porPedir : 0;
                        const porPedirB = b.porPedir !== undefined ? b.porPedir : 0;
                        if (porPedirA === 0 && porPedirB > 0) return 1;
                        if (porPedirA > 0 && porPedirB === 0) return -1;
                        return 0;
                      })
                      .map(p => {
                        const porPedir = p.porPedir !== undefined ? p.porPedir : 0;
                        return (
                          <tr key={p.id} className={`border-b ${porPedir > 0 ? "bg-orange-50" : "bg-gray-50"}`}>
                            <td className="p-2">{p.nombre}</td>
                            <td className="p-2">{p.proveedor || "-"}</td>
                            <td className="p-2 text-right">{p.numero || "-"}</td>
                            <td className="p-2 text-right font-bold text-red-600">{(p.stockActual || 0).toFixed(2)}</td>
                            <td className="p-2 text-right">{(p.stockMinimo || 0).toFixed(2)}</td>
                            <td className="p-2 text-right">
                              <input 
                                type="tel"
                                className="w-20 md:w-24 border-2 border-orange-300 rounded-lg py-2 px-2 text-right text-sm md:text-base font-medium focus:border-orange-500 focus:outline-none bg-white"
                                value={String(porPedir).replace(".", ",")}
                                onChange={async (e) => {
                                  let input = e.target.value;
                                  input = input.replace(/[^0-9.,]/g, '');
                                  const lastChar = input.slice(-1);
                                  if (lastChar === ".") {
                                    input = input.slice(0, -1) + ",";
                                  }
                                  const nuevaCantidad = parseFloat(input.replace(",", ".")) || 0;
                                  const productosActualizados = productosPorPedir.map(item => 
                                    item.id === p.id ? { ...item, porPedir: nuevaCantidad } : item
                                  );
                                  setProductosPorPedir(productosActualizados);
                                  
                                  const porPedirObj: Record<string, number> = {};
                                  productosActualizados.forEach(item => {
                                    porPedirObj[item.id] = item.porPedir !== undefined ? item.porPedir : 0;
                                  });
                                  
                                  try {
                                    await setDoc(doc(db, "caja", "productosPorPedir"), {
                                      productos: porPedirObj
                                    }, { merge: true });
                                  } catch (error) {
                                    console.error("Error guardando por pedir:", error);
                                  }
                                }}
                                onFocus={(e) => e.target.select()}
                              />
                            </td>
                            <td className="p-2 text-right">S/.{(p.precioCompra || 0).toFixed(2)}</td>
                            <td className="p-2 text-right font-bold">S/.{(porPedir * (p.precioCompra || 0)).toFixed(2)}</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
                {productosPorPedir.length === 0 && (
                  <p className="text-center text-gray-500 py-4">No hay productos en la lista de compras. Envíe la lista desde Stock.</p>
                )}
              </div>

              <div className="mt-4 flex justify-end">
                <div className="bg-green-100 px-4 py-2 rounded">
                  {(() => {
                    const itemsConPedido = productosPorPedir.filter(p => (p.porPedir !== undefined ? p.porPedir : 0) > 0);
                    const total = itemsConPedido.reduce((acc, p) => {
                      const porPedir = p.porPedir !== undefined ? p.porPedir : 0;
                      return acc + (porPedir * (p.precioCompra || 0));
                    }, 0);
                    return (
                      <p className="font-bold text-green-800">
                        Total lista de compras: S/.{total.toFixed(2)} ({itemsConPedido.length} items)
                      </p>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

          {modalRegistrarCompra && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Registrar Compra</h2>
            
            <div className="overflow-x-auto mb-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-200">
                    <th className="p-2 text-left">Producto</th>
                    <th className="p-2 text-right">Por Pedir</th>
                    <th className="p-2 text-right">Stock Actual</th>
                    <th className="p-2 text-right">Cant. Comprada</th>
                    <th className="p-2 text-right">Costo Unit.</th>
                    <th className="p-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {productosPorPedir
                    .filter(p => {
                      const falta = (p.stockMinimo || 0) - (p.stockActual || 0);
                      const porPedir = p.porPedir !== undefined ? p.porPedir : falta;
                      return porPedir > 0;
                    })
                    .map(p => {
                      const falta = (p.stockMinimo || 0) - (p.stockActual || 0);
                      const porPedir = p.porPedir !== undefined ? p.porPedir : falta;
                      const cantidad = comprasARegistrar[p.id] || 0;
                      const total = cantidad * (p.precioCompra || 0);
                      return (
                        <tr key={p.id} className="border-b bg-orange-50">
                          <td className="p-2 font-medium">{p.nombre}</td>
                          <td className="p-2 text-right">{porPedir.toFixed(2)}</td>
                          <td className="p-2 text-right">{(p.stockActual || 0).toFixed(2)}</td>
                          <td className="p-2 text-right">
                            <input 
                              type="number" 
                              min="0"
                              step="0.01"
                              max={porPedir}
                              className="border p-1 rounded w-20 text-right"
                              value={cantidad.toFixed(2)}
                              onChange={(e) => setComprasARegistrar({
                                ...comprasARegistrar,
                                [p.id]: parseFloat(e.target.value) || 0
                              })}
                            />
                          </td>
                          <td className="p-2 text-right">S/.{(p.precioCompra || 0).toFixed(2)}</td>
                          <td className="p-2 text-right font-bold">S/.{total.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>

            {(() => {
              const totalRegistro = productosPorPedir
                .filter(p => {
                  const falta = (p.stockMinimo || 0) - (p.stockActual || 0);
                  const porPedir = p.porPedir !== undefined ? p.porPedir : falta;
                  return porPedir > 0;
                })
                .reduce((acc, p) => {
                  const cantidad = comprasARegistrar[p.id] || 0;
                  return acc + (cantidad * (p.precioCompra || 0));
                }, 0);
              return (
                <div className="bg-green-100 p-3 rounded mb-4 text-right">
                  <span className="text-green-800 font-bold">Total: S/.{totalRegistro.toFixed(2)}</span>
                </div>
              );
            })()}

            <div className="flex gap-2">
              <button 
                onClick={registrarCompras}
                className="flex-1 bg-orange-600 text-white py-2 rounded hover:bg-orange-700"
              >
                Registrar Compra
              </button>
              <button 
                onClick={() => setModalRegistrarCompra(false)}
                className="flex-1 bg-gray-300 text-gray-700 py-2 rounded hover:bg-gray-400"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {modalCierreDia && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6 text-center">🔒 Cierre del Día</h2>
            
            <div className="space-y-4">
              <div className="bg-gray-100 p-4 rounded-lg">
                <h3 className="font-bold text-lg mb-2">📊 Resumen de Caja</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex justify-between">
                    <span>Monto Inicial:</span>
                    <span className="font-bold">S/.{montoInicialGuardado.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Inyección de Compras:</span>
                    <span className="font-bold">S/.{inyeccionCompras.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-blue-100 p-4 rounded-lg">
                <h3 className="font-bold text-lg mb-2">🛒 Registro de Compras</h3>
                {(() => {
                  const hoy = new Date().toISOString().split("T")[0];
                  const comprasHoy = compras.filter(c => c.fecha === hoy);
                  const totalCompras = comprasHoy.reduce((acc, c) => acc + (c.total || 0), 0);
                  return (
                    <>
                      <p className="text-2xl font-bold text-blue-800">S/.{totalCompras.toFixed(2)}</p>
                      <p className="text-sm text-blue-600">{comprasHoy.length} compras registradas</p>
                    </>
                  );
                })()}
              </div>

              <div className="bg-green-100 p-4 rounded-lg">
                <h3 className="font-bold text-lg mb-2">💰 Ventas del Día</h3>
                {(() => {
                  const hoy = new Date().toISOString().split("T")[0];
                  const ventasHoy = ventasDelDia.filter((v: any) => v.fecha?.split(" ")[0] === hoy || v.fecha === hoy);
                  const ventasEfectivo = ventasHoy.filter((v: any) => v.metodoPago === "efectivo").reduce((acc: number, v: any) => acc + (v.total || 0), 0);
                  const ventasYape = ventasHoy.filter((v: any) => v.metodoPago === "yape" || v.metodoPago === "yape/quimby").reduce((acc: number, v: any) => acc + (v.total || 0), 0);
                  const ventasPOS = ventasHoy.filter((v: any) => v.metodoPago === "pos" || v.metodoPago === "tarjeta").reduce((acc: number, v: any) => acc + (v.total || 0), 0);
                  const totalVentas = ventasEfectivo + ventasYape + ventasPOS;
                  
                  return (
                    <>
                      <div className="grid grid-cols-3 gap-2 mb-2">
                        <div className="bg-white p-2 rounded text-center">
                          <p className="text-xs text-gray-500">Efectivo</p>
                          <p className="font-bold text-green-600">S/.{ventasEfectivo.toFixed(2)}</p>
                        </div>
                        <div className="bg-white p-2 rounded text-center">
                          <p className="text-xs text-gray-500">Yape/Plin</p>
                          <p className="font-bold text-blue-600">S/.{ventasYape.toFixed(2)}</p>
                        </div>
                        <div className="bg-white p-2 rounded text-center">
                          <p className="text-xs text-gray-500">POS</p>
                          <p className="font-bold text-purple-600">S/.{ventasPOS.toFixed(2)}</p>
                        </div>
                      </div>
                      <p className="text-xl font-bold text-green-800 text-center">Total: S/.{totalVentas.toFixed(2)}</p>
                      <p className="text-sm text-green-600 text-center">{ventasHoy.length} ventas</p>
                    </>
                  );
                })()}
              </div>

              <div className="bg-red-100 p-4 rounded-lg">
                <h3 className="font-bold text-lg mb-2">📤 Egresos del Día</h3>
                <p className="text-2xl font-bold text-red-800">S/.{totalEgresos.toFixed(2)}</p>
                <p className="text-sm text-red-600">{egresosHoy.length} egresos (incluye propinas)</p>
              </div>

              <div className="bg-green-600 text-white p-4 rounded-lg">
                <h3 className="font-bold text-lg mb-2">💵 Efectivo en Caja</h3>
                {(() => {
                  const hoy = new Date().toISOString().split("T")[0];
                  const comprasHoy = compras.filter(c => c.fecha === hoy);
                  const totalCompras = comprasHoy.reduce((acc, c) => acc + (c.total || 0), 0);
                  const ventasHoy = ventasDelDia.filter((v: any) => v.fecha?.split(" ")[0] === hoy || v.fecha === hoy);
                  const ventasEfectivo = ventasHoy.filter((v: any) => v.metodoPago === "efectivo").reduce((acc: number, v: any) => acc + (v.total || 0), 0);
                  const efectivoCaja = montoInicialGuardado + inyeccionCompras + ventasEfectivo - totalCompras - totalEgresos;
                  return (
                    <>
                      <p className="text-3xl font-bold text-center">S/.{efectivoCaja.toFixed(2)}</p>
                      <p className="text-sm text-center opacity-80">Inicial + Inyección + Ventas Efectivo - Compras - Egresos</p>
                    </>
                  );
                })()}
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button 
                onClick={guardarCierreDia}
                className="flex-1 bg-blue-600 text-white py-3 rounded hover:bg-blue-700 font-bold"
              >
                💾 Guardar
              </button>
              <button 
                onClick={enviarCierreWhatsApp}
                className="flex-1 bg-green-600 text-white py-3 rounded hover:bg-green-700 font-bold"
              >
                📤 Enviar por WhatsApp
              </button>
              <button 
                onClick={() => setModalCierreDia(false)}
                className="flex-1 bg-gray-300 text-gray-700 py-3 rounded hover:bg-gray-400 font-bold"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {modalRegistroCierres && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6 text-center">📋 Registro de Cierres Diarios</h2>
            
            {cierresAnteriores.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No hay cierres registrados.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-200">
                      <th className="p-2 text-left">Fecha</th>
                      <th className="p-2 text-left">Hora</th>
                      <th className="p-2 text-left">Usuario</th>
                      <th className="p-2 text-right">Inicial</th>
                      <th className="p-2 text-right">Inyección</th>
                      <th className="p-2 text-right">Compras</th>
                      <th className="p-2 text-right">Ventas Efvo</th>
                      <th className="p-2 text-right">Ventas Yape</th>
                      <th className="p-2 text-right">Ventas POS</th>
                      <th className="p-2 text-right">Egresos</th>
                      <th className="p-2 text-right">Efectivo Caja</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cierresAnteriores.map((c) => (
                      <tr key={c.id} className="border-b hover:bg-gray-50">
                        <td className="p-2">{c.fecha}</td>
                        <td className="p-2">{c.hora}</td>
                        <td className="p-2">
                          <span className={`px-2 py-1 rounded text-white text-xs ${
                            c.usuario?.toLowerCase() === "admin" ? "bg-purple-600" : 
                            c.usuario?.toLowerCase() === "cubas" ? "bg-orange-500" : 
                            "bg-gray-500"
                          }`}>
                            {c.usuario || "Usuario"}
                          </span>
                        </td>
                        <td className="p-2 text-right">S/.{c.montoInicial?.toFixed(2) || "0.00"}</td>
                        <td className="p-2 text-right">S/.{c.inyeccion?.toFixed(2) || "0.00"}</td>
                        <td className="p-2 text-right">S/.{c.totalCompras?.toFixed(2) || "0.00"}</td>
                        <td className="p-2 text-right text-green-600">S/.{c.ventasEfectivo?.toFixed(2) || "0.00"}</td>
                        <td className="p-2 text-right text-blue-600">S/.{c.ventasYape?.toFixed(2) || "0.00"}</td>
                        <td className="p-2 text-right text-purple-600">S/.{c.ventasPOS?.toFixed(2) || "0.00"}</td>
                        <td className="p-2 text-right text-red-600">S/.{c.totalEgresos?.toFixed(2) || "0.00"}</td>
                        <td className="p-2 text-right font-bold text-green-700">S/.{c.efectivoCaja?.toFixed(2) || "0.00"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            <div className="flex gap-2 mt-6">
              <button 
                onClick={() => setModalRegistroCierres(false)}
                className="flex-1 bg-gray-300 text-gray-700 py-3 rounded hover:bg-gray-400 font-bold"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {modalAbierto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Registrar Egreso</h2>

            <div className="mb-4">
              <label className="block text-gray-700 font-bold mb-1">Tipo:</label>
              <div className="flex gap-2">
                <button 
                  onClick={() => setTipoEgreso("egreso")}
                  className={`flex-1 py-2 rounded ${tipoEgreso === "egreso" ? "bg-orange-500 text-white" : "bg-gray-200"}`}
                >
                  💸 Egreso
                </button>
                <button 
                  onClick={() => setTipoEgreso("propina")}
                  className={`flex-1 py-2 rounded ${tipoEgreso === "propina" ? "bg-purple-500 text-white" : "bg-gray-200"}`}
                >
                  💵 Propina
                </button>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 font-bold mb-1">Monto (S/.):</label>
              <input 
                type="number" 
                step="0.01"
                className="w-full border p-2 rounded"
                value={monto}
                onChange={(e) => setMonto(parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 font-bold mb-1">Descripción:</label>
              <input 
                type="text" 
                className="w-full border p-2 rounded"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Ej: Mototaxi delivery"
              />
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 font-bold mb-1">Fecha:</label>
              <input 
                type="date" 
                className="w-full border p-2 rounded"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
              />
            </div>

            <div className="flex gap-2">
              <button 
                onClick={guardarEgreso}
                className="flex-1 bg-green-600 text-white py-2 rounded hover:bg-green-700"
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
      </div>
    </main>
  );
}
