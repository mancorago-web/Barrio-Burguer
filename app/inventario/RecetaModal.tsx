"use client";

import { useState, useEffect } from "react";
import type { ProductoVenta, Receta, Producto } from "./datos";

interface RecetaModalProps {
  producto: ProductoVenta | null;
  productos: Producto[];
  recetas: Receta[];
  onClose: () => void;
  onSave: (producto: ProductoVenta, recetas: Receta[]) => void;
}

export default function RecetaModal({ producto, productos, recetas, onClose, onSave }: RecetaModalProps) {
  const [nombre, setNombre] = useState(producto?.nombre || "");
  const [precio, setPrecio] = useState(producto?.precio || 0);
  const [categoria, setCategoria] = useState(producto?.categoria || "hamburguesa");
  const [ingredientes, setIngredientes] = useState<{ insumoId: number; cantidad: number }[]>([]);

  useEffect(() => {
    if (producto) {
      const recetasProducto = recetas.filter(r => r.productoVentaId === producto.id);
      setIngredientes(recetasProducto.map(r => ({ insumoId: r.insumoId, cantidad: r.cantidad })));
    } else {
      setIngredientes([]);
    }
  }, [producto, recetas]);

  const agregarIngrediente = () => {
    setIngredientes([...ingredientes, { insumoId: 0, cantidad: 0 }]);
  };

  const eliminarIngrediente = (index: number) => {
    setIngredientes(ingredientes.filter((_, i) => i !== index));
  };

  const actualizarIngrediente = (index: number, campo: "insumoId" | "cantidad", valor: number) => {
    const nuevos = [...ingredientes];
    nuevos[index] = { ...nuevos[index], [campo]: valor };
    setIngredientes(nuevos);
  };

  const handleGuardar = () => {
    if (!nombre || precio <= 0) return;

    const nuevoProducto: ProductoVenta = {
      id: producto?.id || Date.now(),
      nombre,
      precio,
      categoria
    };

    const nuevasRecetas: Receta[] = ingredientes
      .filter(i => i.insumoId > 0 && i.cantidad > 0)
      .map((i, index) => ({
        id: Date.now() + index,
        productoVentaId: nuevoProducto.id,
        insumoId: i.insumoId,
        cantidad: i.cantidad
      }));

    onSave(nuevoProducto, nuevasRecetas);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">
          {producto ? "Modificar Receta" : "Agregar Receta"}
        </h2>

        <div className="mb-4">
          <label className="block text-gray-700 font-bold mb-1">Nombre:</label>
          <input 
            type="text" 
            className="w-full border p-2 rounded"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Hamburguesa doble"
          />
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-gray-700 font-bold mb-1">Precio (S/.):</label>
            <input 
              type="number" 
              step="0.01"
              className="w-full border p-2 rounded"
              value={precio}
              onChange={(e) => setPrecio(parseFloat(e.target.value) || 0)}
            />
          </div>
          <div>
            <label className="block text-gray-700 font-bold mb-1">Categoría:</label>
            <select 
              className="w-full border p-2 rounded"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
            >
              <option value="hamburguesa">Hamburguesa</option>
              <option value="combos">Combos</option>
              <option value="acompanamiento">Acompañamiento</option>
              <option value="bebida">Bebida</option>
            </select>
          </div>
        </div>

        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <label className="text-gray-700 font-bold">Ingredientes:</label>
            <button 
              onClick={agregarIngrediente}
              className="text-blue-600 hover:underline text-sm"
            >
              + Agregar ingrediente
            </button>
          </div>

          {ingredientes.map((ing, index) => (
            <div key={index} className="flex gap-2 mb-2 items-center">
              <select 
                className="flex-1 border p-2 rounded"
                value={ing.insumoId}
                onChange={(e) => actualizarIngrediente(index, "insumoId", parseInt(e.target.value))}
              >
                <option value={0}>Seleccionar insumo...</option>
                {productos.map(p => (
                  <option key={p.id} value={p.id}>{p.nombre} ({p.unidad})</option>
                ))}
              </select>
              <input 
                type="number" 
                step="0.01"
                className="w-24 border p-2 rounded"
                value={ing.cantidad}
                onChange={(e) => actualizarIngrediente(index, "cantidad", parseFloat(e.target.value) || 0)}
                placeholder="Cant."
              />
              <button 
                onClick={() => eliminarIngrediente(index)}
                className="text-red-600 hover:text-red-800 text-xl"
              >
                ×
              </button>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <button 
            onClick={handleGuardar}
            className="flex-1 bg-green-600 text-white py-2 rounded hover:bg-green-700"
          >
            Guardar
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
