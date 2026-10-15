import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import PageTitle from "@/components/PageTitle";
import { ETAPES_OPPORTUNITE, PROBABILITE_ETAPE, formatMontant } from "@/lib/crm-constants";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { useNavigate } from "react-router-dom";

export default function Pipeline() {
  const navigate = useNavigate();
  const [opps, setOpps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [colSums, setColSums] = useState({});

  const load = async () => {
    setLoading(true);
    try {
      const res = await base44.entities.Opportunite.filter(
        { etape: { $ne: "Perdu" } },
        { sort: "-date_cloture_prevue", limit: 500, fields: ["compte_id", "nom", "gamme", "etape", "montant_ht", "probabilite", "date_cloture_prevue"] }
      );
      const items = res.items || res;
      setOpps(items);
      const sums = {};
      ETAPES_OPPORTUNITE.forEach((e) => {
        const col = items.filter((o) => o.etape === e);
        sums[e] = {
          brut: col.reduce((s, o) => s + (o.montant_ht || 0), 0),
          pondere: col.reduce((s, o) => s + ((o.montant_ht || 0) * (PROBABILITE_ETAPE[e] || 0)) / 100, 0),
          count: col.length,
        };
      });
      setColSums(sums);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const onDragEnd = async (result) => {
    if (!result.destination) return;
    const oppId = result.draggableId;
    const newEtape = result.destination.droppableId;
    const opp = opps.find((o) => o.id === oppId);
    if (!opp || opp.etape === newEtape) return;

    setOpps(opps.map((o) => (o.id === oppId ? { ...o, etape: newEtape, probabilite: PROBABILITE_ETAPE[newEtape] } : o)));

    try {
      const updateData = { etape: newEtape, probabilite: PROBABILITE_ETAPE[newEtape] };
      if (newEtape === "Gagné") {
        updateData.motif_perte = null;
        await base44.entities.Compte.update(opp.compte_id, { statut: "Client" });
      }
      if (newEtape === "Perdu" && !opp.motif_perte) {
        updateData.motif_perte = "Autre";
      }
      await base44.entities.Opportunite.update(oppId, updateData);
    } catch (e) {
      console.error(e);
      load();
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gd-mist border-t-gd-blue" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <PageTitle subtitle="Pipeline des opportunités">Pipeline</PageTitle>
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-3 overflow-x-auto p-4 gd-scrollbar-thin lg:p-8">
          {ETAPES_OPPORTUNITE.filter((e) => e !== "Perdu").map((etape) => {
            const colOpps = opps.filter((o) => o.etape === etape);
            const sums = colSums[etape] || { brut: 0, pondere: 0, count: 0 };
            return (
              <Droppable key={etape} droppableId={etape}>
                {(provided) => (
                  <div ref={provided.innerRef} {...provided.droppableProps} className="flex w-72 shrink-0 flex-col rounded-xl bg-gd-ice">
                    <div className="border-b border-gd-mist/40 p-3">
                      <div className="flex items-center justify-between">
                        <h3 className="gd-title text-xs text-gd-blue">{etape}</h3>
                        <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-slate-500">{sums.count}</span>
                      </div>
                      <div className="mt-1.5 space-y-0.5">
                        <div className="gd-tabular text-xs font-semibold text-foreground">{formatMontant(sums.brut)}</div>
                        <div className="gd-tabular text-[10px] text-muted-foreground">Pondéré : {formatMontant(sums.pondere)}</div>
                      </div>
                    </div>
                    <div className="flex-1 space-y-2 p-2">
                      {colOpps.map((o, idx) => (
                        <Draggable key={o.id} draggableId={o.id} index={idx}>
                          {(p) => (
                            <div ref={p.innerRef} {...p.draggableProps} {...p.dragHandleProps} onClick={() => navigate(`/comptes/${o.compte_id}`)} className="cursor-pointer rounded-lg border border-gd-mist/40 bg-white p-3 shadow-sm hover:shadow-md">
                              <div className="text-sm font-semibold leading-tight">{o.nom}</div>
                              <div className="mt-1 text-[11px] text-muted-foreground">{o.gamme}</div>
                              <div className="mt-2 flex items-center justify-between">
                                <span className="gd-tabular text-sm font-bold text-gd-blue">{formatMontant(o.montant_ht)}</span>
                                <span className="rounded bg-gd-yellow/15 px-1.5 py-0.5 text-[10px] font-bold text-gd-navy">{PROBABILITE_ETAPE[etape]}%</span>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {colOpps.length === 0 && (
                        <div className="rounded-lg border border-dashed border-gd-mist/40 p-4 text-center text-[11px] text-muted-foreground">Glissez ici</div>
                      )}
                      {provided.placeholder}
                    </div>
                  </div>
                )}
              </Droppable>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
}