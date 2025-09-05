"use client";

import { useEffect, useState } from "react";
import {
  createPlayer,
  listPlayers,
  deletePlayer,
  updatePlayer,
} from "@/lib/players";
import { ensureCurrentSquad, listSquads, setCurrentSquadId } from "@/lib/squads";
import { Foot, Position, Player, Squad } from "@/types/squad";

const ALL_POS: Position[] = ["POR","LD","LI","DFC","MCD","MC","MCO","ED","EI","DC","SD"];
const FEET: Foot[] = ["diestro","zurdo","ambidiestro"];

export default function EquipoPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [squads, setSquads] = useState<Squad[]>([]);
  const [currentSquad, setCurrentSquad] = useState<string>("");

  const [nombre, setNombre] = useState("");
  const [dorsal, setDorsal] = useState<number | "">("");
  const [pie, setPie] = useState<Foot>("diestro");
  const [posiciones, setPosiciones] = useState<Position[]>([]);
  const [altura, setAltura] = useState<number | "">("");
  const [editing, setEditing] = useState<Player | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [editDorsal, setEditDorsal] = useState<number | "">("");
  const [editPie, setEditPie] = useState<Foot>("diestro");
  const [editPosiciones, setEditPosiciones] = useState<Position[]>([]);
  const [editAltura, setEditAltura] = useState<number | "">("");
  const [velocidad, setVelocidad] = useState(0);
  const [resistencia, setResistencia] = useState(0);
  const [pase, setPase] = useState(0);
  const [regate, setRegate] = useState(0);
  const [tiro, setTiro] = useState(0);
  const [defensa, setDefensa] = useState(0);
  const [estadoFisico, setEstadoFisico] = useState(0);
  const [notas, setNotas] = useState("");
  const [editErr, setEditErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const id = await ensureCurrentSquad();
      const s = await listSquads();
      setSquads(s);
      setCurrentSquad(id);
    })();
  }, []);

  useEffect(() => {
    if (!currentSquad) return;
    (async () => {
      setLoading(true);
      const data = await listPlayers(currentSquad);
      data.sort((a, b) => a.dorsal - b.dorsal);
      setPlayers(data);
      setLoading(false);
    })();
  }, [currentSquad]);

  function togglePos(pos: Position) {
    setPosiciones(prev =>
      prev.includes(pos) ? prev.filter(p => p !== pos) : [...prev, pos]
    );
  }

  function toggleEditPos(pos: Position) {
    setEditPosiciones(prev =>
      prev.includes(pos) ? prev.filter(p => p !== pos) : [...prev, pos]
    );
  }

  function onChangeSquad(id: string) {
    setCurrentSquad(id);
    setCurrentSquadId(id);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      const nuevo = await createPlayer(currentSquad, {
        nombre: nombre.trim(),
        dorsal:
          typeof dorsal === "number" ? dorsal : parseInt(String(dorsal), 10),
        pie,
        posiciones,
        altura_cm:
          typeof altura === "number"
            ? altura
            : altura
            ? parseInt(String(altura), 10)
            : undefined,
      });
      const data = [...players, nuevo].sort((a, b) => a.dorsal - b.dorsal);
      setPlayers(data);
      setNombre("");
      setDorsal("");
      setPie("diestro");
      setPosiciones([]);
      setAltura("");
    } catch (e: any) {
      setErr(e.message ?? "Error al crear jugador");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar jugador?")) return;
    await deletePlayer(id);
    setPlayers(prev => prev.filter(p => p.id !== id));
  }

  function startEdit(p: Player) {
    setEditing(p);
    setEditNombre(p.nombre);
    setEditDorsal(p.dorsal);
    setEditPie(p.pie);
    setEditPosiciones(p.posiciones);
    setEditAltura(p.altura_cm ?? "");
    setVelocidad(p.velocidad ?? 0);
    setResistencia(p.resistencia ?? 0);
    setPase(p.pase ?? 0);
    setRegate(p.regate ?? 0);
    setTiro(p.tiro ?? 0);
    setDefensa(p.defensa ?? 0);
    setEstadoFisico(p.estadoFisico ?? 0);
    setNotas(p.notas ?? "");
    setEditErr(null);
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setEditErr(null);
    if (!editNombre.trim()) {
      setEditErr("El nombre es obligatorio");
      return;
    }
    const dorsalNum =
      typeof editDorsal === "number"
        ? editDorsal
        : parseInt(String(editDorsal), 10);
    if (!Number.isInteger(dorsalNum) || dorsalNum <= 0) {
      setEditErr("Dorsal inválido");
      return;
    }
    if (!editPosiciones.length) {
      setEditErr("Debe incluir al menos una posición");
      return;
    }
    if (
      players.some(
        pl => pl.id !== editing.id && pl.dorsal === dorsalNum
      )
    ) {
      setEditErr(`El dorsal ${dorsalNum} ya está en uso en este equipo`);
      return;
    }

    const numAttrs = [
      velocidad,
      resistencia,
      pase,
      regate,
      tiro,
      defensa,
      estadoFisico,
    ];
    if (numAttrs.some(n => n < 0 || n > 100)) {
      setEditErr("Atributos entre 0 y 100");
      return;
    }

    await updatePlayer(editing.id, {
      nombre: editNombre.trim(),
      dorsal: dorsalNum,
      pie: editPie,
      posiciones: editPosiciones,
      altura_cm:
        typeof editAltura === "number"
          ? editAltura
          : editAltura
          ? parseInt(String(editAltura), 10)
          : undefined,
      velocidad,
      resistencia,
      pase,
      regate,
      tiro,
      defensa,
      estadoFisico,
      notas: notas.trim() ? notas : undefined,
    });

    const data = await listPlayers(currentSquad);
    data.sort((a, b) => a.dorsal - b.dorsal);
    setPlayers(data);
    setEditing(null);
  }

  return (
      <div className="mx-auto max-w-3xl p-4 h-full overflow-y-auto touch-pan-y">
        <button onClick={() => window.history.back()} className="mb-4 text-sm underline">
          ← Volver
        </button>
        <h1 className="text-2xl font-semibold mb-4">Equipo</h1>

        <div className="mb-4">
          <label className="block text-sm">Equipo</label>
          <div className="flex items-center gap-2">
            <select
              value={currentSquad}
              onChange={(e) => onChangeSquad(e.target.value)}
              className="border rounded p-2 bg-white text-black"
            >
              {squads.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </select>
            <a href="/equipos" className="text-sm underline">Gestionar equipos</a>
          </div>
        </div>

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
      {loading ? (
        <p>Cargando…</p>
      ) : (
        <ul className="divide-y border rounded">
          {players.map((p) => (
            <li key={p.id} className="p-3 flex items-center justify-between">
              <div>
                <div className="font-medium">#{p.dorsal} {p.nombre}</div>
                <div className="text-sm text-gray-600">
                  Pie: {p.pie} · Pos: {p.posiciones.join(", ")} {p.altura_cm ? `· ${p.altura_cm} cm` : ""}
                </div>
                {(p.velocidad != null || p.resistencia != null || p.pase != null || p.regate != null || p.tiro != null || p.defensa != null || p.estadoFisico != null) && (
                  <div className="text-xs text-gray-500">
                    {`Vel ${p.velocidad ?? 0} · Res ${p.resistencia ?? 0} · Pase ${p.pase ?? 0} · Reg ${p.regate ?? 0} · Tiro ${p.tiro ?? 0} · Def ${p.defensa ?? 0} · EF ${p.estadoFisico ?? 0}`}
                  </div>
                )}
                {p.notas && <div className="text-xs text-gray-500">Notas: {p.notas}</div>}
              </div>
              <div className="flex gap-2 text-sm">
                <button onClick={() => startEdit(p)} className="text-blue-600">
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(p.id)}
                  className="text-red-600"
                >
                  Eliminar
                </button>
              </div>
            </li>
          ))}
          {players.length === 0 && (
            <li className="p-3 text-sm text-gray-600">Aún no hay jugadores.</li>
          )}
        </ul>
      )}

      {editing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <form
            onSubmit={saveEdit}
            className="bg-white text-black p-4 rounded space-y-3 max-w-lg w-full mx-2"
          >
            <h3 className="text-lg font-medium">Editar jugador</h3>
            <div>
              <label className="block text-sm">Nombre *</label>
              <input
                value={editNombre}
                onChange={(e) => setEditNombre(e.target.value)}
                className="w-full border rounded p-2 bg-white text-black"
                required
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm">Dorsal *</label>
                <input
                  type="number"
                  min={1}
                  value={editDorsal}
                  onChange={(e) =>
                    setEditDorsal(
                      e.target.value === "" ? "" : Number(e.target.value)
                    )
                  }
                  className="w-full border rounded p-2 bg-white text-black"
                  required
                />
              </div>
              <div>
                <label className="block text-sm">Pie *</label>
                <select
                  value={editPie}
                  onChange={(e) => setEditPie(e.target.value as Foot)}
                  className="w-full border rounded p-2 bg-white text-black"
                >
                  {FEET.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm">Altura (cm)</label>
                <input
                  type="number"
                  min={100}
                  max={230}
                  value={editAltura}
                  onChange={(e) =>
                    setEditAltura(
                      e.target.value === "" ? "" : Number(e.target.value)
                    )
                  }
                  className="w-full border rounded p-2 bg-white text-black"
                />
              </div>
            </div>

            <div>
              <span className="block text-sm mb-1">Posiciones *</span>
              <div className="grid grid-cols-6 gap-2">
                {ALL_POS.map((p) => (
                  <label key={p} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={editPosiciones.includes(p)}
                      onChange={() => toggleEditPos(p)}
                    />
                    {p}
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm">Velocidad</label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={velocidad}
                  onChange={(e) => setVelocidad(Number(e.target.value))}
                  className="w-full"
                />
                <span>{velocidad}</span>
              </div>
              <div>
                <label className="block text-sm">Resistencia</label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={resistencia}
                  onChange={(e) => setResistencia(Number(e.target.value))}
                  className="w-full"
                />
                <span>{resistencia}</span>
              </div>
              <div>
                <label className="block text-sm">Pase</label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={pase}
                  onChange={(e) => setPase(Number(e.target.value))}
                  className="w-full"
                />
                <span>{pase}</span>
              </div>
              <div>
                <label className="block text-sm">Regate</label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={regate}
                  onChange={(e) => setRegate(Number(e.target.value))}
                  className="w-full"
                />
                <span>{regate}</span>
              </div>
              <div>
                <label className="block text-sm">Tiro</label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={tiro}
                  onChange={(e) => setTiro(Number(e.target.value))}
                  className="w-full"
                />
                <span>{tiro}</span>
              </div>
              <div>
                <label className="block text-sm">Defensa</label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={defensa}
                  onChange={(e) => setDefensa(Number(e.target.value))}
                  className="w-full"
                />
                <span>{defensa}</span>
              </div>
              <div>
                <label className="block text-sm">Estado físico</label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={estadoFisico}
                  onChange={(e) => setEstadoFisico(Number(e.target.value))}
                  className="w-full"
                />
                <span>{estadoFisico}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm">Notas</label>
              <textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                className="w-full border rounded p-2 bg-white text-black"
                rows={3}
              />
            </div>

            {editErr && (
              <div className="text-red-600 text-sm">{editErr}</div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="px-4 py-2 rounded border"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded bg-black text-white"
              >
                Guardar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
