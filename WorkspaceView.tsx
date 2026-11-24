import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { User } from 'firebase/auth';
import {
  ArrowLeft,
  BookOpen,
  Check,
  Copy,
  ExternalLink,
  FileDown,
  FileText,
  Gavel,
  GraduationCap,
  History,
  Menu,
  MessageSquarePlus,
  Pencil,
  Scale,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  User as UserIcon,
  X,
} from 'lucide-react';
import { exportConversationToPdf } from '../utils/pdfExport';
import {
  JURISDICTION_LABELS,
  MODE_LABELS,
  ROLE_LABELS,
  type ConversationSummary,
  type Jurisdiction,
  type LegalMessage,
  type LegalMode,
  type UserProfile,
} from '../types/legal';

interface WorkspaceViewProps {
  user: User | null;
  profile: UserProfile | null;
  conversations: ConversationSummary[];
  activeConversationId: string | null;
  messages: LegalMessage[];
  activeMode: LegalMode;
  activeJurisdiction: Jurisdiction;
  isSending: boolean;
  errorBanner: string | null;
  onDismissError: () => void;
  onSelectMode: (mode: LegalMode) => void;
  onSelectJurisdiction: (jurisdiction: Jurisdiction) => void;
  onSelectConversation: (conversationId: string) => void;
  onNewConversation: (mode?: LegalMode, jurisdiction?: Jurisdiction) => void;
  onSendMessage: (question: string) => Promise<void>;
  onRenameConversation: (conversationId: string, newTitle: string) => Promise<void>;
  onDeleteConversation: (conversationId: string) => Promise<void>;
  onBackHome: () => void;
  onOpenAuth: () => void;
}

const STARTER_PROMPTS: Record<LegalMode, Array<{ title: string; prompt: string; jurisdiction: Jurisdiction }>> = {
  consultation: [
    {
      title: 'Création de SARL en RDC (Droit OHADA)',
      prompt:
        'Quelles sont les étapes et conditions légales pour constituer une SARL en République démocratique du Congo au regard de l’Acte uniforme OHADA (AUSCGIE) et du guichet unique de création d’entreprise ?',
      jurisdiction: 'rdc',
    },
    {
      title: 'Licenciement et préavis (Code du travail RDC)',
      prompt:
        'Quelles sont les conditions de validité d’un licenciement et les règles de calcul du préavis selon le Code du travail de la RDC ?',
      jurisdiction: 'rdc',
    },
    {
      title: 'Saisie-attribution des créances (AUPSRVE)',
      prompt:
        'Comment fonctionne la procédure de saisie-attribution des créances en droit OHADA et quels sont les délais de contestation devant le juge compétent ?',
      jurisdiction: 'ohada',
    },
    {
      title: 'Régime foncier congolais vs propriété civile française',
      prompt:
        'Expliquez la différence fondamentale entre la propriété du sol en droit congolais (Loi foncière n° 73-021, principe de la propriété de l’État et concessions) et la propriété privée du sol en droit français.',
      jurisdiction: 'comparatif',
    },
  ],
  dissertation: [
    {
      title: 'Primauté du droit OHADA en RDC',
      prompt:
        'Propose un plan détaillé et une introduction rédigée pour la dissertation suivante : « L’articulation entre le droit communautaire OHADA et le droit interne de la République démocratique du Congo ».',
      jurisdiction: 'rdc',
    },
    {
      title: 'Force obligatoire du contrat',
      prompt:
        'Sujet de dissertation : « La force obligatoire du contrat face à l’imprévision : regard croisé entre le droit congolais des obligations et la réforme française du droit des contrats ».',
      jurisdiction: 'comparatif',
    },
  ],
  cas_pratique: [
    {
      title: 'Cas pratique — Rupture de contrat commercial',
      prompt:
        'Cas pratique à résoudre par syllogisme : La société Kivu Négoce SARL, immatriculée au RCCM de Goma, a conclu un contrat de fourniture de matériel avec un commerçant individuel qui refuse de payer 18 000 USD à l’échéance convenue malgré une mise en demeure. Quelles voies d’exécution et procédures simplifiées de recouvrement (injonction de payer) s’offrent à Kivu Négoce en droit OHADA applicable en RDC ?',
      jurisdiction: 'ohada',
    },
    {
      title: 'Cas pratique — Conflit successoral en droit congolais',
      prompt:
        'Cas pratique : Un père de famille décède à Kinshasa sans laisser de testament, laissant son épouse survivante et trois enfants mineurs, ainsi qu’une concession résidentielle acquise pendant le mariage sous le régime de la communauté réduite aux acquêts. Analysez la dévolution successorale et la protection du conjoint survivant selon le Code de la famille de la RDC.',
      jurisdiction: 'rdc',
    },
  ],
  commentaire_arret: [
    {
      title: 'Méthodologie d’un arrêt de la CCJA',
      prompt:
        'Expliquez la méthodologie complète du commentaire d’arrêt appliquée à une décision de la Cour Commune de Justice et d’Arbitrage (CCJA) de l’OHADA, en précisant la structure de la fiche d’arrêt et du plan.',
      jurisdiction: 'ohada',
    },
    {
      title: 'Analyser un arrêt fourni',
      prompt:
        'Voici les références/extraits d’une décision de justice à commenter (indiquez la juridiction, la date et les attendus afin d’établir la fiche d’arrêt et le plan) :',
      jurisdiction: 'rdc',
    },
  ],
  expose: [
    {
      title: 'Exposé — Le statut de l’entreprenant OHADA',
      prompt:
        'Prépare un plan d’exposé universitaire détaillé sur le thème : « Le statut de l’entreprenant en droit OHADA : atouts et limites pour le secteur informel en RDC », incluant problématique, plan en deux parties et questions probables du jury.',
      jurisdiction: 'rdc',
    },
    {
      title: 'Exposé — L’indépendance du pouvoir judiciaire',
      prompt:
        'Prépare un exposé structuré sur « L’indépendance du pouvoir judiciaire dans la Constitution de la République démocratique du Congo du 18 février 2006 ».',
      jurisdiction: 'rdc',
    },
  ],
};

function formatTime(ms: number): string {
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(ms));
  } catch {
    return '';
  }
}

export const WorkspaceView: React.FC<WorkspaceViewProps> = ({
  user,
  profile,
  conversations,
  activeConversationId,
  messages,
  activeMode,
  activeJurisdiction,
  isSending,
  errorBanner,
  onDismissError,
  onSelectMode,
  onSelectJurisdiction,
  onSelectConversation,
  onNewConversation,
  onSendMessage,
  onRenameConversation,
  onDeleteConversation,
  onBackHome,
  onOpenAuth,
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [draft, setDraft] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [editingConvId, setEditingConvId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, isSending]);

  const filteredConversations = conversations.filter((conv) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      conv.title.toLowerCase().includes(q) ||
      conv.lastPreview.toLowerCase().includes(q) ||
      MODE_LABELS[conv.mode].label.toLowerCase().includes(q)
    );
  });

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed || isSending) return;
    setDraft('');
    await onSendMessage(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Clipboard inaccessible
    }
  };

  const handleExportPdf = () => {
    if (messages.length === 0) return;
    const activeConv = conversations.find((c) => c.id === activeConversationId);
    const fallbackTitle =
      messages.find((m) => m.role === 'user')?.content.slice(0, 80) ||
      MODE_LABELS[activeMode].label;
    exportConversationToPdf({
      title: activeConv?.title || fallbackTitle,
      mode: activeMode,
      jurisdiction: activeJurisdiction,
      messages,
      profile,
      userEmail: user?.email,
    });
    setExportSuccess(true);
    setTimeout(() => setExportSuccess(false), 2500);
  };

  const handleStarterClick = (promptText: string, jur: Jurisdiction) => {
    onSelectJurisdiction(jur);
    setDraft(promptText);
  };

  const startRename = (conv: ConversationSummary, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingConvId(conv.id);
    setEditingTitle(conv.title);
  };

  const commitRename = async (convId: string) => {
    if (editingTitle.trim()) {
      await onRenameConversation(convId, editingTitle.trim());
    }
    setEditingConvId(null);
  };

  const studentModes: LegalMode[] = ['dissertation', 'cas_pratique', 'commentaire_arret', 'expose'];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#0B162C] text-white">
      {/* Entête de la barre latérale */}
      <div className="px-5 py-4 border-b border-[#1E3356] flex items-center justify-between">
        <button
          type="button"
          onClick={onBackHome}
          className="flex items-center gap-2.5 text-left group cursor-pointer"
        >
          <Scale className="w-5 h-5 text-[#D9B55B] shrink-0" />
          <span className="font-serif text-xl font-bold tracking-tight text-white whitespace-nowrap">
            Assistant Shilo
          </span>
        </button>

        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          aria-label="Fermer le panneau latéral"
          className="lg:hidden p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Bouton nouvelle conversation + retour accueil */}
      <div className="p-4 space-y-2 border-b border-[#1E3356]">
        <button
          type="button"
          onClick={() => {
            onNewConversation(activeMode, activeJurisdiction);
            setSidebarOpen(false);
          }}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#C59B38] text-[#060D1A] text-xs font-semibold rounded-lg hover:bg-[#D9B55B] transition-colors cursor-pointer whitespace-nowrap"
        >
          <MessageSquarePlus className="w-4 h-4" />
          Nouvelle consultation
        </button>

        <button
          type="button"
          onClick={onBackHome}
          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Retour à l&apos;accueil
        </button>
      </div>

      {/* Modes : Consultation & Espace Étudiants */}
      <div className="px-4 py-3 border-b border-[#1E3356] space-y-2">
        <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400 px-1">
          Mode d&apos;assistance
        </p>

        <button
          type="button"
          onClick={() => {
            onSelectMode('consultation');
            setSidebarOpen(false);
          }}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
            activeMode === 'consultation'
              ? 'bg-[#162B4D] text-[#D9B55B] border border-[#C59B38]/40'
              : 'text-slate-300 hover:bg-white/5 hover:text-white'
          }`}
        >
          <BookOpen className="w-4 h-4 shrink-0" />
          <span className="truncate">Consultation juridique</span>
        </button>

        <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400 px-1 pt-2">
          Espace Étudiants en droit
        </p>

        <div className="space-y-1">
          {studentModes.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                onSelectMode(m);
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                activeMode === m
                  ? 'bg-[#162B4D] text-[#D9B55B] border border-[#C59B38]/40'
                  : 'text-slate-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              {m === 'dissertation' && <FileText className="w-3.5 h-3.5 shrink-0" />}
              {m === 'cas_pratique' && <Scale className="w-3.5 h-3.5 shrink-0" />}
              {m === 'commentaire_arret' && <Gavel className="w-3.5 h-3.5 shrink-0" />}
              {m === 'expose' && <GraduationCap className="w-3.5 h-3.5 shrink-0" />}
              <span className="truncate">{MODE_LABELS[m].label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Historique des conversations */}
      <div className="flex-1 min-h-0 flex flex-col px-4 py-3">
        <div className="flex items-center justify-between px-1 mb-2">
          <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <History className="w-3.5 h-3.5" />
            Historique
          </span>
          <span className="text-[11px] font-mono tabular-nums text-slate-400">
            {conversations.length}
          </span>
        </div>

        <div className="relative mb-2.5">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher..."
            className="w-full pl-8 pr-3 py-1.5 bg-[#132544] border border-[#1E3356] rounded-lg text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-[#C59B38]"
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-1 pr-1">
          {filteredConversations.length === 0 ? (
            <div className="px-2 py-4 text-xs text-slate-400 leading-relaxed">
              {conversations.length === 0
                ? 'Aucune conversation enregistrée pour le moment. Posez votre première question ci-contre.'
                : 'Aucun résultat pour cette recherche.'}
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isActive = conv.id === activeConversationId;
              return (
                <div
                  key={conv.id}
                  onClick={() => {
                    onSelectConversation(conv.id);
                    setSidebarOpen(false);
                  }}
                  className={`group rounded-lg px-3 py-2.5 cursor-pointer transition-colors ${
                    isActive
                      ? 'bg-[#162B4D] border border-[#C59B38]/40'
                      : 'hover:bg-white/5 border border-transparent'
                  }`}
                >
                  {editingConvId === conv.id ? (
                    <input
                      type="text"
                      autoFocus
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onBlur={() => commitRename(conv.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitRename(conv.id);
                        if (e.key === 'Escape') setEditingConvId(null);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full px-2 py-1 bg-[#0B162C] border border-[#C59B38] rounded text-xs text-white focus:outline-none"
                    />
                  ) : (
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-medium text-white truncate">{conv.title}</p>
                      <div className="hidden group-hover:flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => startRename(conv, e)}
                          aria-label="Renommer"
                          className="p-1 text-slate-400 hover:text-white cursor-pointer"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteConversation(conv.id);
                          }}
                          aria-label="Supprimer"
                          className="p-1 text-slate-400 hover:text-red-300 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-400 truncate">
                    <span>{JURISDICTION_LABELS[conv.jurisdiction].short}</span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">{formatTime(conv.updatedAtMs)}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Compte personnel en pied de barre latérale */}
      <div className="p-4 border-t border-[#1E3356] bg-[#081122]">
        <button
          type="button"
          onClick={onOpenAuth}
          className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/5 transition-colors text-left cursor-pointer"
        >
          <div className="w-9 h-9 rounded-full bg-[#162B4D] border border-[#C59B38]/40 text-[#D9B55B] flex items-center justify-center shrink-0">
            <UserIcon className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            {user ? (
              <>
                <p className="text-xs font-semibold text-white truncate">
                  {profile?.displayName || user.displayName || 'Mon compte'}
                </p>
                <p className="text-[11px] text-[#D9B55B] truncate">
                  {profile ? ROLE_LABELS[profile.roleType] : user.email}
                </p>
              </>
            ) : (
              <>
                <p className="text-xs font-semibold text-white truncate">Compte personnel</p>
                <p className="text-[11px] text-slate-400 truncate">
                  Se connecter · Sauvegarde cloud
                </p>
              </>
            )}
          </div>
        </button>
      </div>
    </div>
  );

  return (
    <div className="h-screen flex bg-[#F8F9FB] text-[#0B162C] overflow-hidden">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:block w-[280px] shrink-0 border-r border-[#1E3356] h-full">
        {sidebarContent}
      </aside>

      {/* Drawer Mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          <div
            className="fixed inset-0 bg-[#060D1A]/60"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="relative z-50 w-[290px] max-w-[85vw] h-full shadow-2xl">
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Zone Principale */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        {/* Barre supérieure de l'espace de travail */}
        <header className="bg-white border-b border-slate-200 px-4 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Ouvrir le menu et l'historique"
              className="lg:hidden p-2.5 rounded-lg border border-slate-200 text-[#0B162C] hover:bg-slate-50 cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="font-medium text-[#9F7922]">{MODE_LABELS[activeMode].badge}</span>
                <span aria-hidden="true">/</span>
                <span className="truncate font-semibold text-[#0B162C]">
                  {MODE_LABELS[activeMode].label}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 max-w-full">
            {/* Sélecteur d'ordre juridique (Boutons interactifs) */}
            <div
              className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto max-w-full"
              role="group"
              aria-label="Ordre juridique prioritaire"
            >
              {(Object.keys(JURISDICTION_LABELS) as Jurisdiction[]).map((jur) => {
                const selected = activeJurisdiction === jur;
                return (
                  <button
                    key={jur}
                    type="button"
                    onClick={() => onSelectJurisdiction(jur)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      selected
                        ? 'bg-[#0B162C] text-white shadow-xs'
                        : 'text-slate-600 hover:text-[#0B162C]'
                    }`}
                  >
                    {JURISDICTION_LABELS[jur].short}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handleExportPdf}
              disabled={messages.length === 0}
              title={
                messages.length === 0
                  ? 'Démarrez une conversation pour exporter le dossier en PDF'
                  : 'Exporter les échanges et notes juridiques en PDF (Droit congolais)'
              }
              className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-slate-300 bg-white text-[#0B162C] text-xs font-semibold rounded-lg hover:border-[#0B162C] hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {exportSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-700" />
                  <span>PDF exporté</span>
                </>
              ) : (
                <>
                  <FileDown className="w-3.5 h-3.5 text-[#9F7922]" />
                  <span>Exporter PDF</span>
                </>
              )}
            </button>
          </div>
        </header>

        {/* Bannière d'erreur éventuelle */}
        {errorBanner && (
          <div className="bg-red-50 border-b border-red-200 px-6 py-3 flex items-center justify-between gap-4 text-xs text-red-800 shrink-0">
            <span>{errorBanner}</span>
            <button
              type="button"
              onClick={onDismissError}
              aria-label="Fermer l'alerte"
              className="p-1 hover:bg-red-100 rounded cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Bannière de vérification e-mail en attente */}
        {user && !user.emailVerified && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-900 shrink-0">
            <span>
              Vérifiez votre adresse e-mail ({user.email}) pour activer la sauvegarde sécurisée de
              votre historique dans votre compte.
            </span>
            <button
              type="button"
              onClick={onOpenAuth}
              className="px-3 py-1 bg-[#0B162C] text-white text-xs font-medium rounded-md hover:bg-[#132544] cursor-pointer whitespace-nowrap"
            >
              Finaliser la vérification
            </button>
          </div>
        )}

        {/* Flux de messages ou état initial */}
        <main className="flex-1 overflow-y-auto px-4 lg:px-8 py-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {messages.length === 0 ? (
              <div className="py-6 lg:py-10 space-y-8">
                <div className="space-y-3">
                  <p className="text-xs font-medium uppercase tracking-wider text-[#9F7922]">
                    {JURISDICTION_LABELS[activeJurisdiction].label}
                  </p>
                  <h1 className="font-serif text-3xl lg:text-4xl font-bold text-[#0B162C] leading-tight">
                    {MODE_LABELS[activeMode].label}
                  </h1>
                  <p className="text-sm text-slate-600 max-w-2xl leading-relaxed">
                    {JURISDICTION_LABELS[activeJurisdiction].description} Les références légales,
                    articles et décisions de justice sont vérifiés avant citation ; toute référence
                    non confirmée est explicitement signalée.
                  </p>
                </div>

                {!user && (
                  <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="text-xs text-slate-600 leading-relaxed">
                      <strong className="text-[#0B162C]">Mode invité actif :</strong> vous pouvez
                      poser vos questions gratuitement dès maintenant. Connectez-vous pour
                      sauvegarder durablement votre historique dans votre compte personnel.
                    </div>
                    <button
                      type="button"
                      onClick={onOpenAuth}
                      className="px-4 py-2 bg-[#0B162C] text-white text-xs font-medium rounded-lg hover:bg-[#132544] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Se connecter / S&apos;inscrire
                    </button>
                  </div>
                )}

                <div className="space-y-3">
                  <p className="text-xs font-medium text-slate-500">
                    Exemples de requêtes pour démarrer :
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {STARTER_PROMPTS[activeMode].map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleStarterClick(item.prompt, item.jurisdiction)}
                        className="text-left p-4 bg-white border border-slate-200 hover:border-[#0B162C] rounded-xl transition-colors cursor-pointer group"
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="text-xs font-semibold text-[#0B162C] group-hover:underline underline-offset-4">
                            {item.title}
                          </span>
                          <span className="text-[11px] font-mono text-[#9F7922] shrink-0">
                            {JURISDICTION_LABELS[item.jurisdiction].short}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                          {item.prompt}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              messages.map((msg) => {
                if (msg.role === 'user') {
                  return (
                    <div key={msg.id} className="flex justify-end">
                      <div className="max-w-2xl bg-[#0B162C] text-white rounded-2xl px-5 py-4 shadow-xs">
                        <div className="flex items-center gap-2 text-[11px] text-slate-300 mb-1.5">
                          <span>Vous</span>
                          <span aria-hidden="true">·</span>
                          <span>{MODE_LABELS[msg.mode].label}</span>
                          <span aria-hidden="true">·</span>
                          <span>{JURISDICTION_LABELS[msg.jurisdiction].short}</span>
                        </div>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  );
                }

                return (
                  <article
                    key={msg.id}
                    className="bg-white border border-slate-200 rounded-2xl p-6 lg:p-8 shadow-xs space-y-5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span className="font-serif text-base font-bold text-[#0B162C]">
                          Assistant Shilo
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{JURISDICTION_LABELS[msg.jurisdiction].label}</span>
                        <span aria-hidden="true">·</span>
                        {msg.verifiedStatus === 'verifie' ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Sources vérifiées par recherche
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[#9F7922] font-medium">
                            <ShieldAlert className="w-3.5 h-3.5" />
                            Vérification complémentaire recommandée
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCopy(msg.id, msg.content)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        {copiedId === msg.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-700" />
                            Copié
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            Copier
                          </>
                        )}
                      </button>
                    </div>

                    <div className="legal-prose">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                    </div>

                    {msg.sources && msg.sources.length > 0 && (
                      <div className="pt-4 border-t border-slate-100 space-y-2.5">
                        <p className="text-xs font-semibold text-[#0B162C]">
                          Sources et textes consultés ({msg.sources.length})
                        </p>
                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {msg.sources.map((src, i) => (
                            <li key={i}>
                              <a
                                href={src.uri}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[#F8F9FB] border border-slate-200 hover:border-[#0B162C] text-xs text-slate-700 hover:text-[#0B162C] transition-colors"
                              >
                                <span className="truncate">{src.title}</span>
                                <ExternalLink className="w-3.5 h-3.5 shrink-0 text-[#9F7922]" />
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </article>
                );
              })
            )}

            {isSending && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3 animate-pulse">
                <div className="flex items-center gap-2 text-xs font-medium text-[#0B162C]">
                  <Scale className="w-4 h-4 text-[#9F7922]" />
                  <span>Analyse juridique et vérification des textes en cours...</span>
                </div>
                <div className="h-3 bg-slate-200 rounded w-3/4" />
                <div className="h-3 bg-slate-200 rounded w-5/6" />
                <div className="h-3 bg-slate-200 rounded w-2/3" />
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </main>

        {/* Zone de saisie */}
        <footer className="bg-white border-t border-slate-200 px-4 lg:px-8 py-4 shrink-0">
          <div className="max-w-4xl mx-auto space-y-2">
            <form
              onSubmit={handleSubmit}
              className="flex items-end gap-3 bg-[#F8F9FB] border border-slate-300 focus-within:border-[#0B162C] focus-within:ring-2 focus-within:ring-[#C59B38]/30 rounded-xl p-2.5 transition-all"
            >
              <textarea
                rows={2}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={handleKeyDown}
                maxLength={12000}
                placeholder={MODE_LABELS[activeMode].placeholder}
                className="flex-1 bg-transparent text-sm text-[#0B162C] placeholder:text-slate-400 resize-none focus:outline-none px-2 py-1 max-h-40"
              />
              <button
                type="submit"
                disabled={!draft.trim() || isSending}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0B162C] text-white text-xs font-semibold rounded-lg hover:bg-[#132544] disabled:opacity-40 transition-colors shrink-0 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5 text-[#D9B55B]" />
                <span className="hidden sm:inline">Analyser</span>
              </button>
            </form>

            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 px-1">
              <span>
                Outil d&apos;information et de pédagogie juridique gratuit (RDC, OHADA, Droit
                comparé). Ne remplace pas les conseils d&apos;un avocat.
              </span>
              <span className="font-mono tabular-nums">{draft.length}/12000</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};
