export interface Producto {
  id: number;
  nombre: string;
  categoria: string;
  unidad: string;
  stockActual: number;
  stockMinimo: number;
  precioCompra: number;
  proveedor: string;
  numero: string;
}

export interface Receta {
  id: number;
  productoVentaId: number;
  insumoId: number;
  cantidad: number;
}

export interface Movimiento {
  id: number;
  tipo: 'entrada' | 'salida';
  productoId: number;
  cantidad: number;
  motivo: string;
  fecha: string;
}

export interface ProductoVenta {
  id: number;
  nombre: string;
  precio: number;
  categoria: string;
}

export const productosIniciales: Producto[] = [
  // Hamburguesas (insumos)
  { id: 1, nombre: 'Carne', categoria: 'hamburguesas', unidad: 'kg', stockActual: 15, stockMinimo: 10, precioCompra: 25, proveedor: 'Carnicería', numero: '987654321' },
  { id: 2, nombre: 'Pan', categoria: 'hamburguesas', unidad: 'unidades', stockActual: 150, stockMinimo: 50, precioCompra: 0.50, proveedor: 'Panadería', numero: '123456789' },
  { id: 3, nombre: 'Tocino', categoria: 'hamburguesas', unidad: 'kg', stockActual: 5, stockMinimo: 3, precioCompra: 20, proveedor: 'Carnicería', numero: '987654321' },
  { id: 4, nombre: 'Tomate', categoria: 'hamburguesas', unidad: 'kg', stockActual: 6, stockMinimo: 4, precioCompra: 3, proveedor: 'Mercado', numero: '456789123' },
  { id: 5, nombre: 'Lechuga', categoria: 'hamburguesas', unidad: 'kg', stockActual: 5, stockMinimo: 3, precioCompra: 4, proveedor: 'Mercado', numero: '456789123' },
  { id: 6, nombre: 'Queso', categoria: 'hamburguesas', unidad: 'kg', stockActual: 4, stockMinimo: 2, precioCompra: 18, proveedor: 'Lácteos', numero: '789123456' },
  { id: 7, nombre: 'Papas para freir', categoria: 'hamburguesas', unidad: 'kg', stockActual: 20, stockMinimo: 10, precioCompra: 3, proveedor: 'Mercado', numero: '456789123' },
  { id: 8, nombre: 'Cebolla', categoria: 'hamburguesas', unidad: 'kg', stockActual: 4, stockMinimo: 2, precioCompra: 2.5, proveedor: 'Mercado', numero: '456789123' },
  { id: 9, nombre: 'Aceite', categoria: 'hamburguesas', unidad: 'litros', stockActual: 10, stockMinimo: 5, precioCompra: 8, proveedor: 'Distribuidora', numero: '321654987' },
  { id: 10, nombre: 'Mayonesa', categoria: 'hamburguesas', unidad: 'kg', stockActual: 3, stockMinimo: 2, precioCompra: 12, proveedor: 'Distribuidora', numero: '321654987' },
  { id: 11, nombre: 'Mostaza', categoria: 'hamburguesas', unidad: 'kg', stockActual: 2, stockMinimo: 1, precioCompra: 10, proveedor: 'Distribuidora', numero: '321654987' },
  { id: 12, nombre: 'Ketchup', categoria: 'hamburguesas', unidad: 'kg', stockActual: 3, stockMinimo: 2, precioCompra: 10, proveedor: 'Distribuidora', numero: '321654987' },
  { id: 13, nombre: 'Servilletas', categoria: 'hamburguesas', unidad: 'unidades', stockActual: 500, stockMinimo: 200, precioCompra: 0.05, proveedor: 'Distribuidora', numero: '321654987' },
  { id: 14, nombre: 'Panko', categoria: 'hamburguesas', unidad: 'kg', stockActual: 3, stockMinimo: 2, precioCompra: 15, proveedor: 'Distribuidora', numero: '321654987' },
  { id: 15, nombre: 'Maizena', categoria: 'hamburguesas', unidad: 'kg', stockActual: 2, stockMinimo: 1, precioCompra: 5, proveedor: 'Mercado', numero: '456789123' },
  { id: 16, nombre: 'Huevo', categoria: 'hamburguesas', unidad: 'unidades', stockActual: 50, stockMinimo: 20, precioCompra: 0.50, proveedor: 'Mercado', numero: '456789123' },
  { id: 17, nombre: 'Azúcar', categoria: 'hamburguesas', unidad: 'kg', stockActual: 5, stockMinimo: 3, precioCompra: 4, proveedor: 'Mercado', numero: '456789123' },
  { id: 18, nombre: 'Sal gruesa', categoria: 'hamburguesas', unidad: 'kg', stockActual: 3, stockMinimo: 2, precioCompra: 2, proveedor: 'Mercado', numero: '456789123' },
  { id: 19, nombre: 'Bolsas delivery', categoria: 'hamburguesas', unidad: 'unidades', stockActual: 200, stockMinimo: 100, precioCompra: 0.20, proveedor: 'Empaques', numero: '654987321' },
  { id: 20, nombre: 'Cremero delivery', categoria: 'hamburguesas', unidad: 'unidades', stockActual: 100, stockMinimo: 50, precioCompra: 0.10, proveedor: 'Empaques', numero: '654987321' },
  { id: 21, nombre: 'Pickles', categoria: 'hamburguesas', unidad: 'kg', stockActual: 2, stockMinimo: 1, precioCompra: 12, proveedor: 'Distribuidora', numero: '321654987' },
  { id: 22, nombre: 'Trapos de cocina', categoria: 'hamburguesas', unidad: 'unidades', stockActual: 20, stockMinimo: 10, precioCompra: 2, proveedor: 'Aseo', numero: '789654123' },
  { id: 23, nombre: 'Papel aluminio', categoria: 'hamburguesas', unidad: 'rollos', stockActual: 5, stockMinimo: 3, precioCompra: 8, proveedor: 'Distribuidora', numero: '321654987' },
  { id: 24, nombre: 'Papel toalla', categoria: 'hamburguesas', unidad: 'rollos', stockActual: 10, stockMinimo: 5, precioCompra: 5, proveedor: 'Distribuidora', numero: '321654987' },
  { id: 25, nombre: 'Mantequilla', categoria: 'hamburguesas', unidad: 'kg', stockActual: 3, stockMinimo: 2, precioCompra: 15, proveedor: 'Lácteos', numero: '789123456' },
  { id: 26, nombre: 'Harina', categoria: 'hamburguesas', unidad: 'kg', stockActual: 5, stockMinimo: 3, precioCompra: 4, proveedor: 'Mercado', numero: '456789123' },

  // Bebidas
  { id: 27, nombre: 'Agua sin gas', categoria: 'bebidas', unidad: 'unidades', stockActual: 24, stockMinimo: 12, precioCompra: 1, proveedor: 'Distribuidora', numero: '321654987' },
  { id: 28, nombre: 'Agua con gas', categoria: 'bebidas', unidad: 'unidades', stockActual: 24, stockMinimo: 12, precioCompra: 1.50, proveedor: 'Distribuidora', numero: '321654987' },
  { id: 29, nombre: 'Inca Kola', categoria: 'bebidas', unidad: 'unidades', stockActual: 24, stockMinimo: 12, precioCompra: 3, proveedor: 'Ambev', numero: '951753486' },
  { id: 30, nombre: 'Sprite', categoria: 'bebidas', unidad: 'unidades', stockActual: 24, stockMinimo: 12, precioCompra: 3, proveedor: 'Ambev', numero: '951753486' },
  { id: 31, nombre: 'Coca Cola', categoria: 'bebidas', unidad: 'unidades', stockActual: 24, stockMinimo: 12, precioCompra: 3, proveedor: 'Ambev', numero: '951753486' },
  { id: 32, nombre: 'Cusqueña', categoria: 'bebidas', unidad: 'unidades', stockActual: 24, stockMinimo: 12, precioCompra: 4, proveedor: 'Ambev', numero: '951753486' },
  { id: 33, nombre: 'Pilsen', categoria: 'bebidas', unidad: 'unidades', stockActual: 24, stockMinimo: 12, precioCompra: 4, proveedor: 'Ambev', numero: '951753486' },

  // Aseo
  { id: 34, nombre: 'Pastilla azul inodoro', categoria: 'aseo', unidad: 'unidades', stockActual: 10, stockMinimo: 5, precioCompra: 5, proveedor: 'Aseo', numero: '789654123' },
  { id: 35, nombre: 'Ambientador', categoria: 'aseo', unidad: 'unidades', stockActual: 5, stockMinimo: 3, precioCompra: 10, proveedor: 'Aseo', numero: '789654123' },
  { id: 36, nombre: 'Papel higiénico', categoria: 'aseo', unidad: 'unidades', stockActual: 24, stockMinimo: 12, precioCompra: 2, proveedor: 'Aseo', numero: '789654123' },
  { id: 37, nombre: 'Papel toalla (aseo)', categoria: 'aseo', unidad: 'rollos', stockActual: 10, stockMinimo: 5, precioCompra: 5, proveedor: 'Aseo', numero: '789654123' },
  { id: 38, nombre: 'Limpia pisos', categoria: 'aseo', unidad: 'litros', stockActual: 5, stockMinimo: 3, precioCompra: 8, proveedor: 'Aseo', numero: '789654123' },
  { id: 39, nombre: 'Limpia vidrios', categoria: 'aseo', unidad: 'litros', stockActual: 3, stockMinimo: 2, precioCompra: 6, proveedor: 'Aseo', numero: '789654123' },
  { id: 40, nombre: 'Detergente ACE', categoria: 'aseo', unidad: 'litros', stockActual: 5, stockMinimo: 3, precioCompra: 7, proveedor: 'Aseo', numero: '789654123' },
];

export const productosVentaIniciales: ProductoVenta[] = [
  { id: 1, nombre: 'Hamburguesa clásica', precio: 15, categoria: 'hamburguesa' },
  { id: 2, nombre: 'Hamburguesa con queso', precio: 18, categoria: 'hamburguesa' },
  { id: 3, nombre: 'Hamburguesa completa', precio: 22, categoria: 'hamburguesa' },
  { id: 4, nombre: 'Papas fritas', precio: 8, categoria: 'acompanamiento' },
  { id: 5, nombre: 'Inca Kola', precio: 5, categoria: 'bebida' },
  { id: 6, nombre: 'Coca Cola', precio: 5, categoria: 'bebida' },
  { id: 7, nombre: 'Sprite', precio: 5, categoria: 'bebida' },
  { id: 8, nombre: 'Agua', precio: 3, categoria: 'bebida' },
  { id: 9, nombre: 'Cusqueña', precio: 8, categoria: 'bebida' },
  { id: 10, nombre: 'Pilsen', precio: 8, categoria: 'bebida' },
];

export const recetasIniciales: Receta[] = [
  { id: 1, productoVentaId: 1, insumoId: 1, cantidad: 0.15 },
  { id: 2, productoVentaId: 1, insumoId: 2, cantidad: 1 },
  { id: 3, productoVentaId: 2, insumoId: 1, cantidad: 0.15 },
  { id: 4, productoVentaId: 2, insumoId: 2, cantidad: 1 },
  { id: 5, productoVentaId: 2, insumoId: 6, cantidad: 0.05 },
  { id: 6, productoVentaId: 3, insumoId: 1, cantidad: 0.20 },
  { id: 7, productoVentaId: 3, insumoId: 2, cantidad: 1 },
  { id: 8, productoVentaId: 3, insumoId: 6, cantidad: 0.05 },
  { id: 9, productoVentaId: 3, insumoId: 5, cantidad: 0.03 },
  { id: 10, productoVentaId: 3, insumoId: 4, cantidad: 0.05 },
  { id: 11, productoVentaId: 3, insumoId: 8, cantidad: 0.03 },
  { id: 12, productoVentaId: 3, insumoId: 3, cantidad: 0.03 },
  { id: 13, productoVentaId: 4, insumoId: 7, cantidad: 0.20 },
  { id: 14, productoVentaId: 4, insumoId: 9, cantidad: 0.05 },
  { id: 15, productoVentaId: 5, insumoId: 29, cantidad: 1 },
  { id: 16, productoVentaId: 6, insumoId: 31, cantidad: 1 },
  { id: 17, productoVentaId: 7, insumoId: 30, cantidad: 1 },
  { id: 18, productoVentaId: 8, insumoId: 27, cantidad: 1 },
  { id: 19, productoVentaId: 9, insumoId: 32, cantidad: 1 },
  { id: 20, productoVentaId: 10, insumoId: 33, cantidad: 1 },
];
