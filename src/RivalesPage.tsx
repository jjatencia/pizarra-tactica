import React, { useEffect, useMemo, useState } from "react";
import { Squad, OpponentScouting } from "@/types/squad";
import { listSquads, ensureCurrentSquad, setCurrentSquadId } from "@/lib/squads";
import { listOpponents, createOpponent, updateOpponent, deleteOpponent } from "@/lib/opponents";

export default function RivalesPage() {
  const [squads, setSquads] = useState<Squad[]>([]);
  const [currentSquad, setCurrentSquad] = useState<string>("");
  const [items, setItems] = useState<OpponentScouting[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [creatingName, setCreatingName] = useState("");

  const [editing, setEditing] = useState<OpponentScouting | null>(null);
  const [form, setForm] = useState<OpponentScouting | null>(null);
  const isOpen = useMemo(() => !!editing && !!form, [editing, form]);

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
      const list = await listOpponents(currentSquad);
      setItems(list);
    })();
  }, [currentSquad]);

  function onChangeSquad(id: string) {
    setCurrentSquad(id);
    setCurrentSquadId(id);
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      const o = await createOpponent(currentSquad, creatingName);
      setItems((prev) => [o, ...prev]);
      setCreatingName("");
    } catch (e: any) {
      setErr(e.message ?? "Error al crear rival");
    }
  }

  function openEdit(item: OpponentScouting) {
    setEditing(item);
    setForm({ ...item });
  }

  function closeModal() {
    setEditing(null);
    setForm(null);
  }

  function addChip(key: keyof OpponentScouting, value: string) {
    if (!form) return;
    const v = value.trim();
    if (!v) return;
    const arr = Array.isArray((form as any)[key])
      ? ([...(form as any)[key]] as string[])
      : [];
    if (!arr.includes(v)) arr.push(v);
    setForm({ ...form, [key]: arr } as OpponentScouting);
  }

  function removeChip(key: keyof OpponentScouting, idx: number) {
    if (!form) return;
    const arr = Array.isArray((form as any)[key])
      ? ([...(form as any)[key]] as string[])
      : [];
    arr.splice(idx, 1);
    setForm({ ...form, [key]: arr } as OpponentScouting);
  }

  async function onSave() {
    if (!editing || !form) return;
    if (!form.rival?.trim()) {
      alert("El nombre del rival es obligatorio");
      return;
    }
    await updateOpponent(editing.id, {
      rival: form.rival.trim(),
      sistemaHabitual: form.sistemaHabitual?.trim() ?? "",
      fortalezas: form.fortalezas ?? [],
      debilidades: form.debilidades ?? [],
      jugadoresClave: form.jugadoresClave ?? [],
      patrones: form.patrones ?? [],
      notas: form.notas ?? "",
    });
    setItems((prev) => prev.map((it) => (it.id === editing.id ? { ...it, ...form } : it)));
    closeModal();
  }

  async function onDelete(id: string) {
    if (!confirm("¿Eliminar ficha de rival?")) return;
    await deleteOpponent(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  return (
    <div className="mx-auto max-w-4xl p-4">
      <button onClick={() => window.history.back()} className="mb-4 text-sm underline">
        ← Volver
      </button>
      <h1 className="text-2xl font-semibold mb-4">Rivales</h1>

      {/* Selector de equipo */}
      <div className="mb-4">
        <label className="block text-sm">Equipo</label>
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
      </div>

      {/* Alta rápida de rival */}
      <form onSubmit={onCreate} className="flex gap-2 mb-4">
        <input
          className="border rounded p-2 flex-1 bg-white text-black"
          placeholder="Nombre del rival"
          value={creatingName}
          onChange={(e) => setCreatingName(e.target.value)}
        />
        <button className="px-4 py-2 bg-black text-white rounded">Añadir rival</button>
      </form>
      {err && <div className="text-red-600 text-sm mb-3">{err}</div>}

      {/* Listado */}
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="border rounded p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-medium">{item.rival}</div>
                <div className="text-sm text-gray-600">
                  Sistema habitual: {item.sistemaHabitual || "—"}
                </div>
              </div>
              <div className="flex gap-3 text-sm">
                <button className="underline" onClick={() => openEdit(item)}>
                  Editar
                </button>
                <button
                  className="text-red-600 underline"
                  onClick={() => onDelete(item.id)}
                >
                  Eliminar
                </button>
              </div>
            </div>

            {/* Chips resumen */}
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <ChipGroup title="Fortalezas" items={item.fortalezas} />
              <ChipGroup title="Debilidades" items={item.debilidades} />
              <ChipGroup title="Jugadores clave" items={item.jugadoresClave} />
              <ChipGroup title="Patrones" items={item.patrones} />
            </div>

            {item.notas && (
              <div className="mt-3 text-sm text-gray-700">
                <span className="font-medium">Notas:</span> {item.notas}
              </div>
            )}
          </div>
        ))}
        {items.length === 0 && (
          <div className="text-sm text-gray-600">Aún no hay rivales para este equipo.</div>
        )}
      </div>

      {/* Modal de edición */}
      {isOpen && form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={closeModal} />
          <div className="relative z-10 bg-white text-black rounded-xl shadow-xl w-full max-w-2xl p-4 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Editar rival</h2>
              <button onClick={closeModal} className="text-gray-500">
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm">Nombre del rival *</label>
                <input
                  className="border rounded p-2 w-full bg-white text-black"
                  value={form.rival}
                  onChange={(e) => setForm({ ...form!, rival: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm">Sistema habitual</label>
                <input
                  className="border rounded p-2 w-full bg-white text-black"
                  placeholder="4-4-2, 4-3-3, 3-5-2…"
                  value={form.sistemaHabitual || ""}
                  onChange={(e) =>
                    setForm({ ...form!, sistemaHabitual: e.target.value })
                  }
                />
              </div>

              <ChipsEditor
                label="Fortalezas"
                value={form.fortalezas}
                onAdd={(v) => addChip("fortalezas", v)}
                onRemove={(i) => removeChip("fortalezas", i)}
              />
              <ChipsEditor
                label="Debilidades"
                value={form.debilidades}
                onAdd={(v) => addChip("debilidades", v)}
                onRemove={(i) => removeChip("debilidades", i)}
              />
              <ChipsEditor
                label="Jugadores clave"
                value={form.jugadoresClave}
                onAdd={(v) => addChip("jugadoresClave", v)}
                onRemove={(i) => removeChip("jugadoresClave", i)}
              />
              <ChipsEditor
                label="Patrones"
                value={form.patrones}
                onAdd={(v) => addChip("patrones", v)}
                onRemove={(i) => removeChip("patrones", i)}
              />
              <div className="md:col-span-2">
                <label className="block text-sm">Notas</label>
                <textarea
                  className="border rounded p-2 w-full min-h-[90px] bg-white text-black"
                  value={form.notas || ""}
                  onChange={(e) => setForm({ ...form!, notas: e.target.value })}
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button onClick={closeModal} className="px-4 py-2 border rounded text-black">
                Cancelar
              </button>
              <button
                onClick={onSave}
                className="px-4 py-2 bg-black text-white rounded"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Subcomponentes UI
function Chip({ label, onRemove }: { label: string; onRemove?: () => void }) {
  return (
    <span className="inline-flex items-center bg-gray-200 text-gray-700 rounded-full px-2 py-1 mr-2 mb-2">
      {label}
      {onRemove && (
        <button className="ml-1 text-gray-500" onClick={onRemove}>
          ×
        </button>
      )}
    </span>
  );
}

function ChipGroup({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <div className="font-medium mb-1">{title}</div>
      <div className="flex flex-wrap">
        {items?.length
          ? items.map((t, i) => <Chip key={i} label={t} />)
          : <span className="text-gray-500">—</span>}
      </div>
    </div>
  );
}

function ChipsEditor({
  label,
  value,
  onAdd,
  onRemove,
}: {
  label: string;
  value: string[];
  onAdd: (v: string) => void;
  onRemove: (i: number) => void;
}) {
  const [input, setInput] = useState("");

  function add() {
    const v = input.trim();
    if (!v) return;
    onAdd(v);
    setInput("");
  }

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      add();
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm">{label}</label>
      <div className="flex gap-2">
        <input
          className="border rounded p-2 flex-1 min-w-0 bg-white text-black"
          placeholder={`Añadir a ${label.toLowerCase()}`}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKey}
        />
        <button
          type="button"
          onClick={add}
          className="px-3 py-2 bg-black text-white rounded shrink-0"
        >
          Añadir
        </button>
      </div>
      <div className="flex flex-wrap">
        {value?.map((v, i) => (
          <Chip key={i} label={v} onRemove={() => onRemove(i)} />
        ))}
        {!value?.length && (
          <span className="text-gray-500">Sin elementos</span>
        )}
      </div>
    </div>
  );
}
