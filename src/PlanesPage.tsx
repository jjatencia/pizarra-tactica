"use client";
import { useEffect, useMemo, useState } from "react";
import { Squad, OpponentScouting, MatchPlan } from "@/types/squad";
import { CanvasTacticPack } from "@/types/canvas";
import { listSquads, ensureCurrentSquad, setCurrentSquadId, getCurrentSquadId } from "@/lib/squads";
import { listOpponents } from "@/lib/opponents";
import { listPlans, createPlan, updatePlan, deletePlan } from "@/lib/matchPlans";
import { listPlayers } from "@/lib/players";
import { fetchAIResponse } from "@/lib/ai/client";
import { mapAIToCanvas } from "@/lib/ai/mapper";
import { simpleHash } from "@/lib/ai/hash";
import { putTacticsCache, getTacticsCache } from "@/lib/ai/cache";
import type { AIPayloadContext } from "@/lib/ai/payload";

export default function PlanesPage() {
  const [squads, setSquads] = useState<Squad[]>([]);
  const [currentSquad, setCurrentSquad] = useState<string>("");
  const [opponents, setOpponents] = useState<OpponentScouting[]>([]);
  const [opponentId, setOpponentId] = useState<string>("");
  const [plans, setPlans] = useState<MatchPlan[]>([]);
  const [fecha, setFecha] = useState<string>(new Date().toISOString().slice(0,10));
  const [err, setErr] = useState<string | null>(null);
  const [loadingIA, setLoadingIA] = useState<string | null>(null);

  const [editing, setEditing] = useState<MatchPlan | null>(null);
  const [form, setForm] = useState<MatchPlan | null>(null);
  const isOpen = useMemo(() => !!editing && !!form, [editing, form]);
  
  // Selector de jugada IA para pintar
  const [selectorPlays, setSelectorPlays] = useState<CanvasTacticPack[] | null>(null);
  const [selectedPlayIdx, setSelectedPlayIdx] = useState<number>(0);
  const [selectorKey, setSelectorKey] = useState<string | null>(null);

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
      const ops = await listOpponents(currentSquad);
      setOpponents(ops);
      if (!opponentId && ops[0]) setOpponentId(ops[0].id);
    })();
  }, [currentSquad]);

  useEffect(() => {
    if (!currentSquad || !opponentId) { setPlans([]); return; }
    (async () => {
      const ps = await listPlans(currentSquad, opponentId);
      setPlans(ps.sort((a,b)=>a.fecha.localeCompare(b.fecha)));
    })();
  }, [currentSquad, opponentId]);

  function onChangeSquad(id: string) {
    setCurrentSquad(id);
    setCurrentSquadId(id);
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      if (!opponentId) throw new Error("Selecciona un rival");
      const p = await createPlan(currentSquad, opponentId, fecha);
      setPlans(prev => [...prev, p].sort((a,b)=>a.fecha.localeCompare(b.fecha)));
    } catch (e:any) {
      setErr(e.message ?? "Error al crear plan");
    }
  }

  function openEdit(p: MatchPlan) { setEditing(p); setForm({ ...p }); }
  function closeModal() { setEditing(null); setForm(null); }

  function addChip(key: "objetivos" | "recursos", value: string) {
    if (!form) return;
    const v = value.trim();
    if (!v) return;
    const arr = [...(form as any)[key] as string[]];
    if (!arr.includes(v)) arr.push(v);
    setForm({ ...form, [key]: arr });
  }

  function removeChip(key: "objetivos" | "recursos", idx: number) {
    if (!form) return;
    const arr = [...(form as any)[key] as string[]];
    arr.splice(idx,1);
    setForm({ ...form, [key]: arr });
  }

  async function onSave() {
    if (!editing || !form) return;
    await updatePlan(editing.id, {
      fecha: form.fecha,
      objetivos: form.objetivos,
      recursos: form.recursos,
      notas: form.notas ?? ""
    });
    setPlans(prev => prev.map(x => x.id === editing.id ? ({ ...x, ...form }) : x));
    closeModal();
  }

  async function onDelete(id: string) {
    if (!confirm("¿Eliminar plan?")) return;
    await deletePlan(id);
    setPlans(prev => prev.filter(p => p.id !== id));
  }

  async function verInformeIA(plan: MatchPlan) {
    if (!plan.aiReportId) return;
    
    try {
      const cacheItem = await getTacticsCache(plan.aiReportId);
      if (cacheItem) {
        sessionStorage.setItem("tactics_to_paint", JSON.stringify({ id: plan.aiReportId }));
        window.location.href = "/tablero";
      } else {
        setErr("Informe no encontrado. Genera uno nuevo.");
      }
    } catch (error) {
      console.error("Error al cargar informe:", error);
      setErr("Error al cargar el informe.");
    }
  }

  async function generarIA(plan: MatchPlan) {
    setLoadingIA(plan.id);
    setErr(null);
    
    try {
      const squadId = getCurrentSquadId()!;
      const players = await listPlayers(squadId);
      const rivals = await listOpponents(squadId);
      const opponent = rivals.find(r => r.id === plan.opponentId);
      if (!opponent) { 
        setErr("No encuentro el rival seleccionado"); 
        return; 
      }

      const formacionesPermitidas: AIPayloadContext["formacionesPermitidas"] = [
        "4-2-3-1",
        "4-3-3",
        "3-5-2",
      ];

      const payload = {
        squadId,
        players,
        opponent,
        plan,
        context: {
          objetivos: plan.objetivos,
          recursos: plan.recursos,
          formacionesPermitidas,
        }
      };

      const key = simpleHash(JSON.stringify(payload));
      console.log("🤖 Generando táctica con IA...", { squadId, players: players.length, opponent: opponent.rival });
      
      const ai = await fetchAIResponse(payload);
      console.log("✅ IA respondió correctamente");
      
      const mapped = mapAIToCanvas(ai);
      await putTacticsCache({ id: key, createdAt: Date.now(), aiRaw: ai, mapped });
      
      // Asociar el informe IA con el plan de partido
      await updatePlan(plan.id, {
        aiReportId: key,
        aiGeneratedAt: Date.now()
      });
      
      // Actualizar el estado local para mostrar el botón "Ver Informe"
      setPlans(prev => prev.map(p => 
        p.id === plan.id 
          ? { ...p, aiReportId: key, aiGeneratedAt: Date.now() }
          : p
      ));
      
      // Abrir selector para elegir qué jugada pintar
      if (mapped && mapped.length > 0) {
        setSelectorPlays(mapped);
        setSelectedPlayIdx(0);
        setSelectorKey(key);
      } else {
        // Si no hay jugadas, solo preparar informe
        sessionStorage.setItem("tactics_to_paint", JSON.stringify({ id: key }));
        alert("La IA no generó jugadas. Se guardó el informe para revisar.");
      }
      
    } catch (e: any) {
      console.error("❌ Error al generar con IA:", e);
      setErr(`Error al generar con IA: ${e.message ?? "Error desconocido"}`);
    } finally {
      setLoadingIA(null);
    }
  }

  return (
    <div className="mx-auto max-w-4xl p-4 text-white">
      <button onClick={() => window.history.back()} className="mb-4 underline">← Volver</button>
      <h1 className="text-2xl font-semibold mb-4">Planes de partido</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <div>
          <label className="block text-sm">Equipo</label>
          <select value={currentSquad} onChange={e=>onChangeSquad(e.target.value)} className="border rounded p-2 w-full bg-white text-black">
            {squads.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm">Rival</label>
          <select value={opponentId} onChange={e=>setOpponentId(e.target.value)} className="border rounded p-2 w-full bg-white text-black">
            {opponents.map(o => <option key={o.id} value={o.id}>{o.rival}</option>)}
            {opponents.length===0 && <option value="">(Crea un rival en /rivales)</option>}
          </select>
        </div>
        <div>
          <label className="block text-sm">Fecha</label>
          <input type="date" value={fecha} onChange={e=>setFecha(e.target.value)} className="border rounded p-2 w-full bg-white text-black" />
        </div>
      </div>

      <form onSubmit={onCreate} className="flex gap-2 mb-4">
        <button className="px-4 py-2 bg-black text-white rounded" disabled={!opponentId}>Crear plan</button>
      </form>
      {err && <div className="text-red-600 text-sm mb-3">{err}</div>}

      <div className="space-y-3">
        {plans.map(p => (
          <div key={p.id} className="border rounded p-4">
            <div className="flex items-center justify-between">
              <div className="font-medium">{p.fecha}</div>
              <div className="flex gap-3 text-sm flex-wrap">
                <button className="underline" onClick={()=>openEdit(p)}>Editar</button>
                <button className="text-red-600 underline" onClick={()=>onDelete(p.id)}>Eliminar</button>
                
                {p.aiReportId && (
                  <button 
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded transition-all"
                    onClick={()=>verInformeIA(p)}
                  >
                    📋 Ver Informe IA
                  </button>
                )}
                
                <button 
                  className={`px-3 py-1 rounded transition-all ${
                    loadingIA === p.id 
                      ? 'bg-blue-600 text-white cursor-not-allowed' 
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                  onClick={()=>generarIA(p)}
                  disabled={loadingIA === p.id}
                >
                  {loadingIA === p.id ? '🤖 Generando...' : p.aiReportId ? 'Regenerar con IA' : 'Generar con IA y pintar'}
                </button>
              </div>
            </div>
            <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <ChipGroup title="Objetivos" items={p.objetivos} />
              <ChipGroup title="Recursos" items={p.recursos} />
            </div>
            
            {p.aiGeneratedAt && (
              <div className="mt-2 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                🤖 Informe IA generado: {new Date(p.aiGeneratedAt).toLocaleString('es-ES')}
              </div>
            )}
            
            {p.notas && <div className="mt-2 text-sm text-gray-700"><span className="font-medium">Notas:</span> {p.notas}</div>}
          </div>
        ))}
        {plans.length===0 && <div className="text-sm text-gray-600">Aún no hay planes para este rival.</div>}
      </div>

      {isOpen && form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={closeModal} />
          <div className="relative z-10 bg-white text-black rounded-xl shadow-xl w-full max-w-3xl p-4 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Editar plan ({form.fecha})</h2>
              <button onClick={closeModal} className="text-gray-500">✕</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1">Objetivos</label>
                <ChipsEditor label="Objetivos" value={form.objetivos} onAdd={(v)=>addChip("objetivos", v)} onRemove={(i)=>removeChip("objetivos", i)} />
              </div>
              <div>
                <label className="block text-sm mb-1">Recursos</label>
                <ChipsEditor label="Recursos" value={form.recursos} onAdd={(v)=>addChip("recursos", v)} onRemove={(i)=>removeChip("recursos", i)} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm mb-1">Notas</label>
                <textarea className="border rounded p-2 w-full min-h-[100px] bg-white text-black" value={form.notas || ""} onChange={e=>setForm({ ...form!, notas: e.target.value })} />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button onClick={closeModal} className="px-4 py-2 border rounded">Cancelar</button>
              <button onClick={onSave} className="px-4 py-2 bg-black text-white rounded">Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* Selector de jugada IA para pintar en pizarra */}
      {selectorPlays && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSelectorPlays(null)} />
          <div className="relative z-10 bg-white text-black rounded-xl shadow-xl w-full max-w-xl p-4 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Elegir jugada a pintar</h2>
              <button onClick={() => setSelectorPlays(null)} className="text-gray-500">✕</button>
            </div>
            <div className="space-y-2 max-h-[60vh] overflow-auto">
              {selectorPlays.map((p, idx) => (
                <label key={idx} className="flex items-start gap-3 p-3 rounded border hover:bg-gray-50">
                  <input
                    type="radio"
                    name="ia-pack"
                    className="mt-1"
                    checked={selectedPlayIdx === idx}
                    onChange={() => setSelectedPlayIdx(idx)}
                  />
                  <div>
                    <div className="font-medium">{p.titulo}</div>
                    <div className="text-sm text-gray-600">{p.instrucciones?.join(' • ')}</div>
                    <div className="text-xs text-gray-500">{p.primitivas.length} movimientos</div>
                  </div>
                </label>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 justify-end mt-4">
              <button
                className="px-4 py-2 bg-gray-200 rounded"
                onClick={() => setSelectorPlays(null)}
              >
                Cancelar
              </button>
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded"
                onClick={() => {
                  if (!selectorPlays) return;
                  const pack = selectorPlays[selectedPlayIdx];
                  if (pack) {
                    sessionStorage.setItem("tactical_pack_to_load", JSON.stringify(pack));
                  }
                  if (selectorKey) {
                    sessionStorage.setItem("tactics_to_paint", JSON.stringify({ id: selectorKey }));
                  }
                  window.location.href = "/";
                }}
              >
                Pintar en pizarra
              </button>
              <button
                className="px-4 py-2 bg-green-600 text-white rounded"
                onClick={() => {
                  if (selectorKey) {
                    sessionStorage.setItem("tactics_to_paint", JSON.stringify({ id: selectorKey }));
                  }
                  window.location.href = "/tablero";
                }}
              >
                Ver informe IA
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Chip({ label, onRemove }: { label: string; onRemove?: () => void }) {
  return (
    <span className="inline-flex items-center gap-2 bg-gray-200 px-2 py-1 rounded text-sm mr-1 mb-1">
      {label}
      {onRemove && (
        <button onClick={onRemove} className="text-gray-600 hover:text-black">×</button>
      )}
    </span>
  );
}

function ChipGroup({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <div className="font-medium mb-1">{title}</div>
      <div className="flex flex-wrap">
        {items?.length ? items.map((t, i) => <Chip key={i} label={t} />) : (
          <span className="text-gray-500 text-sm">—</span>
        )}
      </div>
    </div>
  );
}

function ChipsEditor({ label, value, onAdd, onRemove }: { label: string; value: string[]; onAdd: (v:string)=>void; onRemove: (i:number)=>void; }) {
  const [input, setInput] = useState("");
  function add() {
    const v = input.trim(); if (!v) return; onAdd(v); setInput("");
  }
  function onKey(e: React.KeyboardEvent<HTMLInputElement>) { if (e.key === "Enter") { e.preventDefault(); add(); } }
  return (
    <div>
      <div className="flex gap-2 mb-2">
        <input className="border rounded p-2 flex-1 bg-white text-black" placeholder={`Añadir a ${label.toLowerCase()}`} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={onKey} />
        <button type="button" onClick={add} className="px-3 py-2 bg-black text-white rounded">Añadir</button>
      </div>
      <div className="flex flex-wrap">
        {value?.map((v, i) => (
          <Chip key={i} label={v} onRemove={() => onRemove(i)} />
        ))}
        {!value?.length && <span className="text-gray-500 text-sm">Sin elementos</span>}
      </div>
    </div>
  );
}
