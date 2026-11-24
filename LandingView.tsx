import React, { useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  GraduationCap,
  Scale,
  ShieldCheck,
  Menu,
  X,
  FileText,
  Gavel,
  Landmark,
} from 'lucide-react';
import type { User } from 'firebase/auth';
import type { Jurisdiction, LegalMode } from '../types/legal';

interface LandingViewProps {
  user: User | null;
  onEnterWorkspace: (mode?: LegalMode, jurisdiction?: Jurisdiction) => void;
  onOpenAuth: () => void;
}

export const LandingView: React.FC<LandingViewProps> = ({
  user,
  onEnterWorkspace,
  onOpenAuth,
}) => {
  const [heroImgFailed, setHeroImgFailed] = useState(false);
  const [bibImgFailed, setBibImgFailed] = useState(false);
  const [studentImgFailed, setStudentImgFailed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F8F9FB] text-[#0B162C] flex flex-col">
      {/* Top Bar strictement en 3 zones : Marque — 4 liens — 1 CTA principal */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-200">
        <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between gap-8">
          <a
            href="#accueil"
            className="font-serif text-2xl font-bold tracking-tight text-[#0B162C] whitespace-nowrap shrink-0"
          >
            Assistant Shilo
          </a>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
            <a
              href="#domaines"
              className="hover:text-[#0B162C] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Domaines
            </a>
            <a
              href="#methodologie"
              className="hover:text-[#0B162C] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Méthodologie
            </a>
            <a
              href="#etudiants"
              className="hover:text-[#0B162C] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Espace Étudiants
            </a>
            <a
              href="#deontologie"
              className="hover:text-[#0B162C] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Déontologie
            </a>
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => onEnterWorkspace('consultation', 'rdc')}
              className="hidden sm:inline-flex items-center gap-2 px-5 py-2.5 bg-[#0B162C] text-white text-xs font-semibold rounded-lg hover:bg-[#132544] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Ouvrir l&apos;assistant
              <ArrowRight className="w-3.5 h-3.5 text-[#D9B55B]" />
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label="Menu de navigation"
              className="md:hidden p-2.5 rounded-lg border border-slate-200 text-[#0B162C] hover:bg-slate-50 cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-slate-200 px-6 py-4 space-y-3">
            <a
              href="#domaines"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm font-medium text-slate-700"
            >
              Domaines juridiques
            </a>
            <a
              href="#methodologie"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm font-medium text-slate-700"
            >
              Méthodologie & Sources
            </a>
            <a
              href="#etudiants"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm font-medium text-slate-700"
            >
              Espace Étudiants en droit
            </a>
            <a
              href="#deontologie"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm font-medium text-slate-700"
            >
              Déontologie
            </a>
            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onEnterWorkspace('consultation', 'rdc');
                }}
                className="w-full py-3 bg-[#0B162C] text-white text-sm font-semibold rounded-lg cursor-pointer"
              >
                Ouvrir l&apos;assistant
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenAuth();
                }}
                className="w-full py-2.5 border border-slate-300 text-[#0B162C] text-sm font-medium rounded-lg cursor-pointer"
              >
                {user ? 'Mon compte personnel' : 'Se connecter / Créer un compte'}
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Section Hero — Split équilibré */}
      <section id="accueil" className="bg-[#0B162C] text-white border-b border-[#1E3356]">
        <div className="max-w-[1200px] mx-auto px-6 py-14 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
            <div className="lg:col-span-6 flex flex-col justify-between space-y-8">
              <div className="space-y-6">
                <p className="text-xs font-medium tracking-wider uppercase text-[#D9B55B]">
                  République démocratique du Congo · OHADA · Droit comparé
                </p>

                <h1 className="font-serif text-[clamp(2.25rem,4vw,3.6rem)] font-bold leading-[1.08] tracking-tight text-white [text-wrap:balance]">
                  La rigueur juridique au service du droit congolais et communautaire.
                </h1>

                <p className="text-base text-slate-300 leading-relaxed max-w-xl">
                  Assistant Shilo accompagne les étudiants en droit, juristes, avocats,
                  entrepreneurs et citoyens avec des analyses structurées, pédagogiques et fondées
                  sur les textes légaux et jurisprudences vérifiables.
                </p>
              </div>

              <div className="space-y-5">
                <div className="flex flex-wrap items-center gap-4">
                  <button
                    type="button"
                    onClick={() => onEnterWorkspace('consultation', 'rdc')}
                    className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 bg-[#C59B38] text-[#060D1A] text-sm font-semibold rounded-lg hover:bg-[#D9B55B] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Poser une question juridique
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onEnterWorkspace('cas_pratique', 'rdc')}
                    className="inline-flex items-center justify-center gap-2 px-5 py-3.5 border border-white/20 text-white text-sm font-medium rounded-lg hover:bg-white/10 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Espace Étudiants
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                  <span>100 % gratuit sans abonnement</span>
                  <span aria-hidden="true">·</span>
                  <span>Distinction RDC / OHADA / France</span>
                  <span aria-hidden="true">·</span>
                  <button
                    type="button"
                    onClick={onOpenAuth}
                    className="text-[#D9B55B] hover:underline underline-offset-4 cursor-pointer"
                  >
                    {user ? `Connecté (${user.email})` : 'Créer un compte personnel'}
                  </button>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="relative h-full min-h-[280px] lg:min-h-[420px] rounded-xl overflow-hidden border border-[#C59B38]/30 bg-[#112240]">
                {!heroImgFailed ? (
                  <img
                    src="/src/assets/images/hero_cabinet_juridique_1795537668288.jpg"
                    alt="Bibliothèque juridique moderne d'Assistant Shilo"
                    referrerPolicy="no-referrer"
                    onError={() => setHeroImgFailed(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-gradient-to-br from-[#0B162C] to-[#162B4D]">
                    <Scale className="w-12 h-12 text-[#D9B55B] mb-3" />
                    <p className="font-serif text-2xl text-white">Cabinet & Recherche Juridique</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bandeau 4 piliers juridiques (sous le Hero) */}
      <section id="domaines" className="bg-white border-b border-slate-200">
        <div className="max-w-[1200px] mx-auto px-6 py-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <button
              type="button"
              onClick={() => onEnterWorkspace('consultation', 'rdc')}
              className="text-left group cursor-pointer"
            >
              <p className="text-xs font-mono text-[#9F7922] mb-1.5">01. Priorité nationale</p>
              <h2 className="font-serif text-xl font-bold text-[#0B162C] group-hover:underline underline-offset-4">
                Droit Congolais (RDC)
              </h2>
              <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
                Constitution, Code du travail, Code de la famille, Loi foncière, Code minier et
                procédures nationales.
              </p>
            </button>

            <button
              type="button"
              onClick={() => onEnterWorkspace('consultation', 'ohada')}
              className="text-left group cursor-pointer"
            >
              <p className="text-xs font-mono text-[#9F7922] mb-1.5">02. Droit des affaires</p>
              <h2 className="font-serif text-xl font-bold text-[#0B162C] group-hover:underline underline-offset-4">
                Droit OHADA
              </h2>
              <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
                Actes uniformes (AUDCG, AUSCGIE, AUPSRVE, AUS, AUPCAP) et arrêts de la CCJA.
              </p>
            </button>

            <button
              type="button"
              onClick={() => onEnterWorkspace('consultation', 'comparatif')}
              className="text-left group cursor-pointer"
            >
              <p className="text-xs font-mono text-[#9F7922] mb-1.5">03. Mise en perspective</p>
              <h2 className="font-serif text-xl font-bold text-[#0B162C] group-hover:underline underline-offset-4">
                Droit Comparé
              </h2>
              <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
                Distinction rigoureuse entre droit congolais, droit communautaire OHADA et droit
                français.
              </p>
            </button>

            <button
              type="button"
              onClick={() => onEnterWorkspace('dissertation', 'rdc')}
              className="text-left group cursor-pointer"
            >
              <p className="text-xs font-mono text-[#9F7922] mb-1.5">04. Facultés de droit</p>
              <h2 className="font-serif text-xl font-bold text-[#0B162C] group-hover:underline underline-offset-4">
                Atelier Étudiants
              </h2>
              <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
                Dissertations, cas pratiques par syllogisme, commentaires d&apos;arrêts et exposés
                structurés.
              </p>
            </button>
          </div>
        </div>
      </section>

      {/* Section Méthodologie & Sources Vérifiables */}
      <section id="methodologie" className="py-16 lg:py-20">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="max-w-2xl mb-12">
            <p className="text-xs font-medium uppercase tracking-wider text-[#9F7922] mb-2">
              Méthodologie & Fiabilité
            </p>
            <h2 className="font-serif text-3xl lg:text-4xl font-bold text-[#0B162C] leading-tight [text-wrap:balance]">
              Une méthode inspirée des cabinets d&apos;avocats, sans références inventées.
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between">
                <div>
                  <BookOpen className="w-5 h-5 text-[#9F7922] mb-4" />
                  <h3 className="font-serif text-xl font-bold text-[#0B162C] mb-2">
                    Références et sources citées
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Chaque réponse identifie les lois, articles, Actes uniformes et décisions de
                    justice pertinents avec les liens web vérifiables issus de la recherche.
                  </p>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between">
                <div>
                  <ShieldCheck className="w-5 h-5 text-[#9F7922] mb-4" />
                  <h3 className="font-serif text-xl font-bold text-[#0B162C] mb-2">
                    Signalement transparent
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Lorsqu&apos;un article précis ou une jurisprudence ne peut être vérifié avec
                    certitude, Assistant Shilo le signale explicitement sans jamais l&apos;inventer.
                  </p>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between">
                <div>
                  <Landmark className="w-5 h-5 text-[#9F7922] mb-4" />
                  <h3 className="font-serif text-xl font-bold text-[#0B162C] mb-2">
                    Cloisonnement des systèmes
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Les règles de la RDC, de l&apos;espace OHADA et du droit français sont
                    systématiquement séparées pour éviter toute transposition erronée.
                  </p>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between">
                <div>
                  <Gavel className="w-5 h-5 text-[#9F7922] mb-4" />
                  <h3 className="font-serif text-xl font-bold text-[#0B162C] mb-2">
                    Historique personnel synchronisé
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Retrouvez vos consultations et vos brouillons universitaires à tout moment en
                    vous connectant gratuitement avec votre compte personnel.
                  </p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="h-full min-h-[300px] rounded-xl overflow-hidden border border-slate-200 bg-[#0B162C] relative">
                {!bibImgFailed ? (
                  <img
                    src="/src/assets/images/bibliotheque_ohada_rdc_1795537668335.jpg"
                    alt="Recueils de codes juridiques reliés en bleu nuit et doré"
                    referrerPolicy="no-referrer"
                    onError={() => setBibImgFailed(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center p-8 text-white">
                    <BookOpen className="w-10 h-10 text-[#D9B55B]" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section Espace Étudiants en droit */}
      <section id="etudiants" className="bg-white border-y border-slate-200 py-16 lg:py-20">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
            <div className="lg:col-span-5 order-2 lg:order-1">
              <div className="h-full min-h-[280px] rounded-xl overflow-hidden border border-slate-200 bg-[#0B162C]">
                {!studentImgFailed ? (
                  <img
                    src="/src/assets/images/espace_etudiant_droit_1795537667951.jpg"
                    alt="Table de travail d'un étudiant en droit avec code civil et balance de justice"
                    referrerPolicy="no-referrer"
                    onError={() => setStudentImgFailed(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center p-8 text-white">
                    <GraduationCap className="w-10 h-10 text-[#D9B55B]" />
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-7 order-1 lg:order-2 flex flex-col justify-center space-y-6">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-[#9F7922] mb-2">
                  Espace Étudiants en Droit
                </p>
                <h2 className="font-serif text-3xl lg:text-4xl font-bold text-[#0B162C] leading-tight [text-wrap:balance]">
                  Quatre ateliers méthodologiques pour réussir vos travaux dirigés et examens.
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => onEnterWorkspace('dissertation', 'rdc')}
                  className="text-left p-5 rounded-xl border border-slate-200 hover:border-[#0B162C] bg-[#F8F9FB] hover:bg-white transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-serif text-lg font-bold text-[#0B162C]">
                      Dissertation juridique
                    </span>
                    <FileText className="w-4 h-4 text-[#9F7922]" />
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Accroche, problématique et plan binaire (I. A/B — II. A/B) ancré en droit RDC et
                    OHADA.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => onEnterWorkspace('cas_pratique', 'rdc')}
                  className="text-left p-5 rounded-xl border border-slate-200 hover:border-[#0B162C] bg-[#F8F9FB] hover:bg-white transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-serif text-lg font-bold text-[#0B162C]">Cas pratique</span>
                    <Scale className="w-4 h-4 text-[#9F7922]" />
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Qualification des faits, problème de droit et syllogisme rigoureux (Majeure,
                    Mineure, Solution).
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => onEnterWorkspace('commentaire_arret', 'ohada')}
                  className="text-left p-5 rounded-xl border border-slate-200 hover:border-[#0B162C] bg-[#F8F9FB] hover:bg-white transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-serif text-lg font-bold text-[#0B162C]">
                      Commentaire d&apos;arrêt
                    </span>
                    <Gavel className="w-4 h-4 text-[#9F7922]" />
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Fiche d&apos;arrêt complète, sens, valeur et portée critique des décisions CCJA
                    ou nationales.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => onEnterWorkspace('expose', 'rdc')}
                  className="text-left p-5 rounded-xl border border-slate-200 hover:border-[#0B162C] bg-[#F8F9FB] hover:bg-white transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-serif text-lg font-bold text-[#0B162C]">
                      Exposé académique
                    </span>
                    <GraduationCap className="w-4 h-4 text-[#9F7922]" />
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Plan de présentation, arguments clés, repères doctrinaux et questions probables
                    du jury.
                  </p>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section Déontologie & Accès Gratuit */}
      <section id="deontologie" className="py-16">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="bg-[#0B162C] text-white rounded-2xl p-8 lg:p-12 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
            <div className="max-w-2xl space-y-3">
              <p className="text-xs font-medium uppercase tracking-wider text-[#D9B55B]">
                Charte déontologique & Accès libre
              </p>
              <h2 className="font-serif text-2xl lg:text-3xl font-bold text-white">
                Un outil pédagogique gratuit, conçu dans le respect du rôle de l&apos;avocat.
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                Assistant Shilo est accessible gratuitement à tous sans abonnement obligatoire. Les
                analyses délivrées ont une finalité d&apos;information, de recherche et de formation
                juridique : elles ne constituent ni une consultation juridique personnalisée ni un
                remplacement d&apos;un avocat inscrit au barreau.
              </p>
            </div>

            <button
              type="button"
              onClick={() => onEnterWorkspace('consultation', 'rdc')}
              className="px-6 py-3.5 bg-[#C59B38] text-[#060D1A] text-sm font-semibold rounded-lg hover:bg-[#D9B55B] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Commencer gratuitement
            </button>
          </div>
        </div>
      </section>

      {/* Footer sobre */}
      <footer className="mt-auto bg-white border-t border-slate-200 py-8">
        <div className="max-w-[1200px] mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <span className="font-serif text-base font-bold text-[#0B162C]">Assistant Shilo</span>
            <span aria-hidden="true">·</span>
            <span>Droit RDC, OHADA & Droit comparé</span>
          </div>
          <p className="text-center sm:text-right">
            Outil d&apos;information et de pédagogie juridique gratuit · Ne remplace pas un avocat.
          </p>
        </div>
      </footer>
    </div>
  );
};
