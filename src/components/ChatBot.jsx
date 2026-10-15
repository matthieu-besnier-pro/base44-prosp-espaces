import { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { MessageCircle, X, Send, Sparkles, Loader2 } from "lucide-react";

export default function ChatBot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [contexte, setContexte] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (open && !contexte) chargerContexte();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  const chargerContexte = async () => {
    try {
      const todayStr = new Date().toISOString().split("T")[0];
      const [total, clientsCount, jamaisContactes, tachesRetard] = await Promise.all([
        base44.entities.Compte.count({}),
        base44.entities.Compte.count({ statut: "Client" }),
        base44.entities.Compte.count({ date_dernier_contact: { $exists: false } }),
        base44.entities.Tache.count({ statut: "À faire", echeance: { $lt: todayStr } }),
      ]);
      setContexte({ total, clientsCount, jamaisContactes, tachesRetard });
    } catch (e) {
      console.error(e);
      setContexte({});
    }
  };

  const envoyer = async () => {
    const question = input.trim();
    if (!question || sending) return;
    setInput("");
    const historique = [...messages, { role: "user", content: question }];
    setMessages(historique);
    setSending(true);
    try {
      const contexteTxt = contexte
        ? `Aperçu du portefeuille (chiffres globaux, peuvent ne pas couvrir la question précisément) : ${contexte.total ?? "?"} clients au total, ${contexte.clientsCount ?? "?"} déjà convertis, ${contexte.jamaisContactes ?? "?"} jamais contactés, ${contexte.tachesRetard ?? "?"} tâches en retard.`
        : "";
      const fil = historique.map((m) => `${m.role === "user" ? "Commercial" : "Assistant"} : ${m.content}`).join("\n");
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Tu es l'assistant intégré au CRM de prospection de Gonnin-Duris, concessionnaire New Holland (vente de matériel agricole et d'espaces verts, zone Charente/Deux-Sèvres/Vienne). Tu aides un commercial terrain. Réponds en français, de façon concise (quelques phrases, pas un roman), concrète et utile.

${contexteTxt}
Tu n'as pas accès au détail de chaque client ni à une recherche en direct dans la base : si la question demande une liste précise ou un chiffre que tu ne connais pas, dis-le et oriente vers la bonne page de l'outil (Clients, Tableau de bord, Calendrier, Organiser une journée) plutôt que d'inventer une réponse.

Conversation :
${fil}

Réponds uniquement au dernier message du commercial.`,
      });
      const reponse = typeof res === "string" ? res : res?.response || res?.text || JSON.stringify(res);
      setMessages((prev) => [...prev, { role: "assistant", content: reponse }]);
    } catch (e) {
      console.error(e);
      setMessages((prev) => [...prev, { role: "assistant", content: "Désolé, une erreur est survenue. Réessayez dans un instant." }]);
    }
    setSending(false);
  };

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gd-blue text-white shadow-lg shadow-gd-blue/30 transition active:scale-95 lg:bottom-8 lg:right-8"
        aria-label="Assistant"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>

      {open && (
        <div className="fixed inset-x-4 bottom-36 z-40 flex h-[60vh] max-h-[500px] flex-col overflow-hidden rounded-2xl border border-gd-mist/50 bg-white shadow-2xl lg:inset-x-auto lg:bottom-24 lg:right-8 lg:w-96">
          <header className="flex items-center gap-2 bg-gd-blue px-4 py-3 text-white">
            <Sparkles className="h-4 w-4 text-gd-yellow" />
            <h3 className="gd-title text-sm">Assistant</h3>
            <button onClick={() => setOpen(false)} className="ml-auto text-white/70 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </header>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-3">
            {messages.length === 0 && (
              <p className="rounded-lg bg-gd-ice p-3 text-xs text-muted-foreground">
                Posez une question sur votre portefeuille ou demandez un conseil de prospection (angle d'approche, relance, qualification…).
              </p>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] whitespace-pre-wrap rounded-xl px-3 py-2 text-sm ${
                  m.role === "user" ? "bg-gd-blue text-white" : "bg-gd-ice text-foreground"
                }`}>
                  {m.content}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-xl bg-gd-ice px-3 py-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> L'assistant réfléchit…
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 border-t border-gd-mist/40 p-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") envoyer(); }}
              placeholder="Posez une question…"
              className="h-10 flex-1 rounded-lg border border-gd-mist/60 px-3 text-sm outline-none focus:border-gd-blue"
            />
            <button onClick={envoyer} disabled={sending || !input.trim()} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gd-blue text-white disabled:opacity-40">
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
