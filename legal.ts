export type LegalMode =
  | 'consultation'
  | 'dissertation'
  | 'cas_pratique'
  | 'commentaire_arret'
  | 'expose';

export type Jurisdiction = 'rdc' | 'ohada' | 'comparatif' | 'francais';

export type UserRoleType = 'etudiant' | 'juriste' | 'avocat' | 'entrepreneur' | 'citoyen';

export type VerificationStatus = 'verifie' | 'partiel' | 'non_verifie' | 'utilisateur';

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  roleType: UserRoleType;
  preferredDomain: Jurisdiction;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface LegalMessage {
  id: string;
  userId?: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  jurisdiction: Jurisdiction;
  mode: LegalMode;
  sources: GroundingSource[];
  verifiedStatus: VerificationStatus;
  createdAtMs: number;
}

export interface ConversationSummary {
  id: string;
  userId?: string;
  title: string;
  mode: LegalMode;
  jurisdiction: Jurisdiction;
  messageCount: number;
  lastPreview: string;
  createdAtMs: number;
  updatedAtMs: number;
}

export const JURISDICTION_LABELS: Record<Jurisdiction, { label: string; short: string; description: string }> = {
  rdc: {
    label: 'Droit Congolais (RDC)',
    short: 'Priorité RDC',
    description: 'Constitution, codes congolais (Travail, Famille, Pénal, Foncier, Minier) et textes OHADA applicables en RDC.',
  },
  ohada: {
    label: 'Droit OHADA',
    short: 'OHADA',
    description: 'Actes uniformes (AUDCG, AUSCGIE, AUPSRVE, AUPCAP, AUS) et jurisprudence de la CCJA.',
  },
  comparatif: {
    label: 'Droit Comparé',
    short: 'Comparé',
    description: 'Analyse croisée entre le droit de la RDC, le droit OHADA et le droit français ou étranger.',
  },
  francais: {
    label: 'Droit Français (avec repères RDC)',
    short: 'Droit Français',
    description: 'Règles du droit français clairement distinguées du droit congolais et du droit OHADA.',
  },
};

export const MODE_LABELS: Record<LegalMode, { label: string; badge: string; placeholder: string }> = {
  consultation: {
    label: 'Consultation juridique',
    badge: 'Discussion',
    placeholder: 'Posez votre question juridique en droit de la RDC, OHADA ou droit comparé...',
  },
  dissertation: {
    label: 'Dissertation juridique',
    badge: 'Étudiants',
    placeholder: 'Ex : « La liberté contractuelle à l’épreuve de l’ordre public en droit congolais »...',
  },
  cas_pratique: {
    label: 'Cas pratique',
    badge: 'Étudiants',
    placeholder: 'Décrivez les faits détaillés du cas pratique à résoudre par syllogisme juridique...',
  },
  commentaire_arret: {
    label: "Commentaire d'arrêt",
    badge: 'Étudiants',
    placeholder: "Collez l'arrêt (CCJA, Cour de cassation RDC, Conseil d'État...) ou sa référence exacte...",
  },
  expose: {
    label: 'Exposé juridique',
    badge: 'Étudiants',
    placeholder: "Indiquez le thème de votre exposé (ex. : La saisie-attribution des créances en droit OHADA)...",
  },
};

export const ROLE_LABELS: Record<UserRoleType, string> = {
  etudiant: 'Étudiant en droit',
  juriste: "Juriste d'entreprise",
  avocat: 'Avocat / Magistat',
  entrepreneur: 'Entrepreneur / Dirigeant',
  citoyen: 'Citoyen / Justiciable',
};
