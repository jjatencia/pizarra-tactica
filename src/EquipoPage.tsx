import { useEffect, useState } from "react";
import { createPlayer, listPlayers, deletePlayer } from "@/lib/players";
import { Foot, Position, Player } from "@/types/squad";

const ALL_POS: Position[] = ["POR","LD","LI","DFC","MCD","MC","MCO","ED","EI","DC","SD"];
const FEET: Foot[] = ["diestro","zurdo","ambidiestro"];

export default function EquipoPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [nombre, setNombre] = useState("");
  const [dorsal, setDorsal] = useState<number | "">("");
  const [pie, setPie] = useState<Foot>("diestro");
  const [posiciones, setPosiciones] = useState<Position[]>([]);
  const [altura, setAltura] = useState<number | "">("");

  useEffect(() => {
    (async () => {
      const data = await listPlayers();
      data.sort((a,b) => a.dorsal - b.dorsal);
      setPlayers(data);
      setLoading(false);
    })();
  }, []);

  function togglePos(pos: Position) {
    setPosiciones(prev =>
      prev.includes(pos) ? prev.filter(p => p !== pos) : [...prev, pos]
    );
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      const nuevo = await createPlayer({
        nombre: nombre.trim(),
        dorsal: typeof dorsal === "number" ? dorsal : parseInt(String(dorsal),10),
        pie,
        posiciones,
        altura_cm: typeof altura === "number" ? altura : (altura ? parseInt(String(altura),10) : undefined),
      });
      const data = [...players, nuevo].sort((a,b) => a.dorsal - b.dorsal);
      setPlayers(data);
      setNombre(""); setDorsal(""); setPie("diestro"); setPosiciones([]); setAltura("");
    } catch (e: any) {
      setErr(e.message ?? "Error al crear jugador");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar jugador?")) return;
    await deletePlayer(id);
    setPlayers(prev => prev.filter(p => p.id !== id));
  }

  return (
    <div className="mx-auto max-w-3xl p-4">
      <h1 className="text-2xl font-semibold mb-4">Equipo</h1>

      <form onSubmit={handleAdd} className="space-y-3 border rounded p-4 mb-6">
        <div>
          <label className="block text-sm">Nombre *</label>
          <input value={nombre} onChange={e=>setNombre(e.target.value)} className="w-full border rounded p-2 bg-white text-black" required />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm">Dorsal *</label>
            <input type="number" min={1} value={dorsal} onChange={e=>setDorsal(e.target.value===""?"":Number(e.target.value))} className="w-full border rounded p-2 bg-white text-black" required />
          </div>
          <div>
            <label className="block text-sm">Pie *</label>
            <select value={pie} onChange={e=>setPie(e.target.value as Foot)} className="w-full border rounded p-2 bg-white text-black">
              {FEET.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm">Altura (cm)</label>
            <input type="number" min={100} max={230} value={altura} onChange={e=>setAltura(e.target.value===""?"":Number(e.target.value))} className="w-full border rounded p-2 bg-white text-black" />
          </div>
        </div>

        <div>
          <span className="block text-sm mb-1">Posiciones *</span>
          <div className="grid grid-cols-6 gap-2">
            {ALL_POS.map(p => (
              <label key={p} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={posiciones.includes(p)} onChange={()=>togglePos(p)} />
                {p}
              </label>
            ))}
          </div>
        </div>

        {err && <div className="text-red-600 text-sm">{err}</div>}

        <button type="submit" className="px-4 py-2 rounded bg-black text-white">Añadir jugador</button>
      </form>

      <h2 className="text-xl font-medium mb-2">Jugadores ({players.length})</h2>
      {loading ? <p>Cargando…</p> : (
        <ul className="divide-y border rounded">
          {players.map(p => (
            <li key={p.id} className="p-3 flex items-center justify-between">
              <div>
                <div className="font-medium">#{p.dorsal} {p.nombre}</div>
                <div className="text-sm text-gray-600">
                  Pie: {p.pie} · Pos: {p.posiciones.join(", ")} {p.altura_cm ? `· ${p.altura_cm} cm` : ""}
                </div>
              </div>
              <button onClick={()=>handleDelete(p.id)} className="text-red-600 text-sm">Eliminar</button>
            </li>
          ))}
          {players.length===0 && <li className="p-3 text-sm text-gray-600">Aún no hay jugadores.</li>}
        </ul>
      )}
    </div>
  );
}
