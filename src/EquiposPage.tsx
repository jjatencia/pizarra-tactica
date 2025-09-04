import { useEffect, useState } from "react";
import {
  listSquads,
  createSquad,
  deleteSquad,
  renameSquad,
  setCurrentSquadId,
  ensureCurrentSquad,
} from "@/lib/squads";
import { Squad } from "@/types/squad";

export default function EquiposPage() {
  const [items, setItems] = useState<Squad[]>([]);
  const [nombre, setNombre] = useState("");
  const [err, setErr] = useState<string | null>(null);

  async function refresh() {
    const s = await listSquads();
    setItems(s);
    await ensureCurrentSquad();
  }

  useEffect(() => {
    refresh();
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      await createSquad(nombre);
      setNombre("");
      await refresh();
    } catch (e: any) {
      setErr(e.message ?? "Error");
    }
  }

  async function setActual(id: string) {
    setCurrentSquadId(id);
    alert("Equipo seleccionado como actual");
  }

  async function ren(id: string) {
    const nuevo = prompt("Nuevo nombre:");
    if (!nuevo) return;
    await renameSquad(id, nuevo);
    await refresh();
  }

  async function del(id: string) {
    if (!confirm("¿Eliminar equipo? Solo si no tiene jugadores.")) return;
    try {
      await deleteSquad(id);
      await refresh();
    } catch (e: any) {
      alert(e.message ?? "No se pudo eliminar");
    }
  }

  return (
    <div className="mx-auto max-w-2xl p-4">
      <h1 className="text-2xl font-semibold mb-4">Equipos</h1>
      <form onSubmit={add} className="flex gap-2 mb-4">
        <input
          className="border rounded p-2 flex-1 bg-white text-black"
          placeholder="Nombre del equipo"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
        />
        <button className="px-4 py-2 bg-black text-white rounded">Crear</button>
      </form>
      {err && <div className="text-red-600 text-sm mb-2">{err}</div>}
      <ul className="divide-y border rounded">
        {items.map((s) => (
          <li key={s.id} className="p-3 flex items-center justify-between">
            <div className="font-medium">{s.nombre}</div>
            <div className="flex gap-3 text-sm">
              <button onClick={() => setActual(s.id)} className="underline">
                Seleccionar
              </button>
              <button onClick={() => ren(s.id)} className="underline">
                Renombrar
              </button>
              <button
                onClick={() => del(s.id)}
                className="text-red-600 underline"
              >
                Eliminar
              </button>
            </div>
          </li>
        ))}
        {items.length === 0 && (
          <li className="p-3 text-sm text-gray-600">Aún no hay equipos.</li>
        )}
      </ul>
    </div>
  );
}

