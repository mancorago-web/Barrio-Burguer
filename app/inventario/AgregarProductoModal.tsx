"use client";

import { useState } from "react";
import type { Producto } from "./datos";

interface AgregarProductoModalProps {
  onClose: () => void;
  onSave: (producto: Producto) => void;
}

export default function AgregarProductoModal({ onClose, onSave }: AgregarProductoModalProps) {
  const [nombre, setNombre] = useState("");
  const [categoria, setCategoria] = useState<"hamburguesas" | "bebidas" | "aseo">("hamburguesas");
  const [unidad, setUnidad] = useState("");
  const [stockMinimo, setStockMinimo] = useState(0);
  const [precioCompra, setPrecioCompra] = useState(0);
  const [proveedor, setProveedor] = useState("");
  const [numero, setNumero] = useState("");

  const handleGuardar = () => {
    if (!nombre || !unidad) return;

    const nuevoProducto: Producto = {
      id: Date.now(),
      nombre,
      categoria,
      unidad,
      stockActual: 0,
      stockMinimo,
      precioCompra,
      proveedor,
      numero,
    };

    onSave(nuevoProducto);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Agregar Producto</h2>

        <div className="mb-3">
          <label className="block text-gray-700 font-bold mb-1">Nombre:</label>
          <input 
            type="text" 
            className="w-full border p-2 rounded"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Carne molida"
          />
        </div>

        <div className="mb-3">
          <label className="block text-gray-700 font-bold mb-1">Categoría:</label>
          <select 
            className="w-full border p-2 rounded"
            value={categoria}
            onChange={(e) => setCategoria(e.target.value as "hamburguesas" | "bebidas" | "aseo")}
          >
            <option value="hamburguesas">Hamburguesas</option>
            <option value="bebidas">Bebidas</option>
            <option value="aseo">Aseo</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-gray-700 font-bold mb-1">Unidad:</label>
            <input 
              type="text" 
              className="w-full border p-2 rounded"
              value={unidad}
              onChange={(e) => setUnidad(e.target.value)}
              placeholder="kg, unidades, etc."
            />
          </div>
          <div>
            <label className="block text-gray-700 font-bold mb-1">Cant. Mínima:</label>
            <input 
              type="number" 
              className="w-full border p-2 rounded"
              value={stockMinimo}
              onChange={(e) => setStockMinimo(parseInt(e.target.value) || 0)}
            />
          </div>
        </div>

        <div className="mb-3">
          <label className="block text-gray-700 font-bold mb-1">Costo Unitario (S/.):</label>
          <input 
            type="number" 
            step="0.01"
            className="w-full border p-2 rounded"
            value={precioCompra}
            onChange={(e) => setPrecioCompra(parseFloat(e.target.value) || 0)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-gray-700 font-bold mb-1">Proveedor:</label>
            <input 
              type="text" 
              className="w-full border p-2 rounded"
              value={proveedor}
              onChange={(e) => setProveedor(e.target.value)}
              placeholder="Nombre del proveedor"
            />
          </div>
          <div>
            <label className="block text-gray-700 font-bold mb-1">Número:</label>
            <input 
              type="text" 
              className="w-full border p-2 rounded"
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              placeholder="Teléfono"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <button 
            onClick={handleGuardar}
            className="flex-1 bg-green-600 text-white py-2 rounded hover:bg-green-700"
          >
            Agregar
          </button>
          <button 
            onClick={onClose}
            className="flex-1 bg-gray-300 text-gray-700 py-2 rounded hover:bg-gray-400"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
