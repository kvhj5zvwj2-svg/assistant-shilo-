import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';

type LegalMode = 'consultation' | 'dissertation' | 'cas_pratique' | 'commentaire_arret' | 'expose';
type Jurisdiction = 'rdc' | 'ohada' | 'comparatif' | 'francais';

interface HistoryTurn {
  role: 'user' | 'assistant';
  content: string;
}

interface AskLegalRequest {
  question: string;
  mode?: LegalMode;
  jurisdiction?: Jurisdiction;
  roleType?: string;
  history?: HistoryTurn[];
}

interface GroundingSource {
  title: string;
  uri: string;
}

function getGenAIClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY_MISSING');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function buildSystemInstruction(mode: LegalMode, jurisdiction: Jurisdiction, roleType?: string): string {
  const jurisdictionDirective: Record<Jurisdiction, string> = {
    rdc: `PRIORITÉ JURIDIQUE : Droit positif de la République démocratique du Congo (RDC). Examine d'abord la Constitution du 18 février 2006 (telle que révisée), les lois organiques et ordinaires congolaises (Code de la famille, Code civil congolais Livres I-III, Code du travail, Code pénal, Code minier, Loi foncière n° 73-021, Code de procédure civile/pénale), ainsi que les Actes uniformes OHADA applicables en RDC depuis le 12 septembre 2012.`,
    ohada: `PRIORITÉ JURIDIQUE : Droit communautaire OHADA (Traité de Port-Louis révisé, Actes uniformes : AUDCG, AUSCGIE, AUS, AUPSRVE, AUPCAP, AUDCIF, AUA, AUM, AUCTMR) et jurisprudence de la Cour Commune de Justice et d'Arbitrage (CCJA). Précise le cas échéant l'articulation avec le droit interne congolais (RDC) pour les matières non unifiées.`,
    comparatif: `PRIORITÉ JURIDIQUE : Droit comparé. Mets en parallèle de manière rigoureuse et distincte : (1) le droit congolais (RDC), (2) le droit OHADA (s'il s'applique à la matière), et (3) le droit français ou d'autres systèmes de tradition civiliste / common law selon la question.`,
    francais: `PRIORITÉ JURIDIQUE : Droit français, tout en précisant clairement les différences majeures ou points de convergence avec le droit congolais (RDC) et le droit OHADA afin d'éviter toute confusion entre les ordres juridiques.`,
  };

  const modeDirective: Record<LegalMode, string> = {
    consultation: `FORMAT ATTENDU (Consultation juridique pédagogique) :
1. **Qualification juridique & Contexte** : Reformulation précise de la problématique et identification du ou des ordres juridiques applicables (RDC / OHADA / Comparé).
2. **Textes légaux & Références applicables** : Liste des articles, lois, Actes uniformes et décisions de jurisprudence pertinents et vérifiables.
3. **Analyse juridique structurée** : Explication claire, pédagogique et nuancée étape par étape.
4. **Orientations pratiques & Limites** : Démarches concrètes ou points de vigilance.
5. **Mention déontologique** : Rappel sobre que cette analyse ne remplace pas un avocat.`,

    dissertation: `FORMAT ATTENDU (Méthodologie de Dissertation Juridique — Espace Étudiants) :
1. **Analyse du sujet** : Définition des termes juridiques clés, délimitation matérielle/géographique (RDC, OHADA, comparé) et enjeux contemporains.
2. **Problématique juridique** : Formulation claire d'une question de droit centrale.
3. **Proposition de plan détaillé (en 2 parties et 2 sous-parties)** :
   - **Introduction rédigée** (Accroche, définitions, délimitation, intérêt du sujet, problématique, annonce du plan).
   - **I. [Titre qualifiant sans verbe conjugué]** (A. / B. avec idées directrices, textes légaux RDC/OHADA et références doctrinales ou jurisprudentielles vérifiables).
   - **II. [Titre qualifiant sans verbe conjugué]** (A. / B. avec critique, nuances ou perspectives comparées).
   - **Conclusion / Ouverture** succincte.`,

    cas_pratique: `FORMAT ATTENDU (Résolution de Cas Pratique — Syllogisme Juridique) :
Traite chaque problème soulevé par les faits en suivant strictement :
1. **Résumé des faits qualifiés juridiquement** (en éliminant les détails superflus).
2. **Problème(s) de droit** formulé(s) de manière générale et abstraite.
3. **Majeure (Règle de droit applicable)** : Rappel exact des textes (Code congolais, Acte uniforme OHADA, jurisprudence CCJA/Cours de RDC) sans jamais inventer d'article.
4. **Mineure (Application aux faits)** : Confrontation rigoureuse des faits aux conditions légales.
5. **Conclusion pratique** : Solution juridique claire pour chaque protagoniste, avec mention des voies de recours ou délais si vérifiés.`,

    commentaire_arret: `FORMAT ATTENDU (Commentaire d'Arrêt — Méthodologie Universitaire) :
Si l'utilisateur fournit un arrêt ou des éléments d'une décision :
1. **Fiche d'arrêt** : Juridiction & date, Faits, Procédure, Prétentions / Moyens, Problème de droit, Solution de la juridiction.
2. **Problématique doctrinale** et **Annonce du plan**.
3. **Plan détaillé en deux parties (I. Sens et valeur / II. Portée et appréciation critique)** intégrant les textes applicables (RDC, OHADA/CCJA ou droit comparé).
Si l'utilisateur ne fournit qu'une référence incomplète sans le texte de l'arrêt, utilise la recherche pour vérifier l'existence de la décision ; si le contenu exact reste inaccessible, indique-le honnêtement et propose un canevas méthodologique rigoureux sans inventer les attendus de l'arrêt.`,

    expose: `FORMAT ATTENDU (Préparation d'Exposé Juridique — Oral ou Écrit) :
1. **Accroche & Problématique** adaptée à une présentation académique.
2. **Plan structuré et dynamique** (Introduction, 2 ou 3 axes majeurs avec transitions claires, Conclusion).
3. **Arguments clés & Références vérifiables** (textes RDC, OHADA, jurisprudence, doctrine reconnue).
4. **Questions probables du jury / de l'auditoire** avec pistes de réponses concises.`,
  };

  const roleContext = roleType
    ? `Profil déclaré de l'utilisateur : ${roleType}. Adapte la précision technique et la pédagogie en conséquence.`
    : '';

  return `Tu es **Assistant Shilo**, un assistant juridique intelligent francophone de haut niveau, conçu sur le modèle de rigueur d'un cabinet d'avocats et d'une faculté de droit, avec une priorité affirmée pour le droit de la République démocratique du Congo (RDC), le droit OHADA et le droit comparé.

${jurisdictionDirective[jurisdiction]}

${modeDirective[mode]}

${roleContext}

RÈGLES DÉONTOLOGIQUES ET DE RIGUEUR ABSOLUES (IMPÉRATIF) :
1. **ZÉRO HALLUCINATION** : Tu ne dois JAMAIS inventer un numéro d'article de loi, un décret, une ordonnance-loi, un arrêt de jurisprudence (CCJA, Cour de cassation, Cour constitutionnelle, Conseil d'État), une date ou un nom d'auteur doctrinal.
2. **VÉRIFICATION EXPLICITE** : Utilise tes connaissances vérifiées et l'outil de recherche Google Search lorsque nécessaire pour vérifier les textes légaux et décisions. Si une référence précise (numéro d'article exact, date de promulgation, référence d'arrêt ou opinion doctrinale) ne peut pas être confirmée avec certitude, écris explicitement entre parenthèses ou dans une section dédiée : *« [Référence non vérifiée — à confirmer au Journal Officiel de la RDC ou au Recueil OHADA] »*.
3. **DISTINCTION DES ORDRES JURIDIQUES** : Ne confonds jamais le droit congolais interne (RDC), le droit uniforme OHADA et le droit français. Indique toujours à quel système juridique appartient chaque règle citée (ex. : « En droit congolais (Loi n° ...) », « En droit OHADA (AUDCG, art. ...) », « En droit français comparé (C. civ., art. ...) »).
4. **STRUCTURE ET CLARTÉ** : Rédige toujours en français impeccable, clair, structuré (titres Markdown ## et ###, listes à puces, mise en gras des concepts juridiques clés) et pédagogique.
5. **NON-REMPLACEMENT D'UN AVOCAT** : Termine toujours les consultations pratiques par un rappel sobre précisant qu'Assistant Shilo est un outil d'information et de pédagogie juridique et ne se substitue pas à l'accompagnement d'un avocat inscrit au barreau ou d'un juriste qualifié.
6. **GRATUITÉ ET ACCESSIBILITÉ** : Ne mentionne jamais de paiement, d'abonnement ou de restriction payante.`;
}

function extractGroundingSources(response: unknown): GroundingSource[] {
  const res = response as {
    candidates?: Array<{
      groundingMetadata?: {
        groundingChunks?: Array<{
          web?: { uri?: string; title?: string };
        }>;
      };
    }>;
  };
  const chunks = res?.candidates?.[0]?.groundingMetadata?.groundingChunks;
  if (!Array.isArray(chunks)) return [];

  const seen = new Set<string>();
  const sources: GroundingSource[] = [];

  for (const chunk of chunks) {
    const uri = chunk?.web?.uri?.trim();
    const title = chunk?.web?.title?.trim();
    if (uri && !seen.has(uri)) {
      seen.add(uri);
      sources.push({
        title: (title || uri).slice(0, 280),
        uri: uri.slice(0, 950),
      });
    }
    if (sources.length >= 15) break;
  }

  return sources;
}

function determineVerificationStatus(answer: string, sources: GroundingSource[]): 'verifie' | 'partiel' | 'non_verifie' {
  const lower = answer.toLowerCase();
  const hasUnverifiedFlag =
    lower.includes('non vérifiée') ||
    lower.includes('non vérifié') ||
    lower.includes('à confirmer') ||
    lower.includes('sous réserve de vérification');

  if (sources.length > 0 && !hasUnverifiedFlag) {
    return 'verifie';
  }
  if (sources.length > 0 || !hasUnverifiedFlag) {
    return 'partiel';
  }
  return 'non_verifie';
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'Assistant Shilo' });
  });

  app.post('/api/legal/ask', async (req, res) => {
    try {
      const body = req.body as AskLegalRequest;
      const question = typeof body?.question === 'string' ? body.question.trim() : '';
      if (!question || question.length > 12000) {
        res.status(400).json({
          error: 'Veuillez saisir une question juridique valide (entre 1 et 12 000 caractères).',
        });
        return;
      }

      const validModes: LegalMode[] = ['consultation', 'dissertation', 'cas_pratique', 'commentaire_arret', 'expose'];
      const validJurisdictions: Jurisdiction[] = ['rdc', 'ohada', 'comparatif', 'francais'];

      const mode: LegalMode = body.mode && validModes.includes(body.mode) ? body.mode : 'consultation';
      const jurisdiction: Jurisdiction =
        body.jurisdiction && validJurisdictions.includes(body.jurisdiction) ? body.jurisdiction : 'rdc';

      const history = Array.isArray(body.history)
        ? body.history
            .filter(
              (turn) =>
                turn &&
                (turn.role === 'user' || turn.role === 'assistant') &&
                typeof turn.content === 'string' &&
                turn.content.trim().length > 0
            )
            .slice(-12)
            .map((turn) => ({
              role: turn.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: turn.content.slice(0, 12000) }],
            }))
        : [];

      const contents = [
        ...history,
        {
          role: 'user',
          parts: [{ text: question }],
        },
      ];

      const ai = getGenAIClient();
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents,
        config: {
          systemInstruction: buildSystemInstruction(mode, jurisdiction, body.roleType),
          tools: [{ googleSearch: {} }],
          thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
        },
      });

      const answer = (response.text || '').trim();
      if (!answer) {
        res.status(502).json({
          error: "Aucune réponse juridique n'a pu être générée. Veuillez reformuler votre question.",
        });
        return;
      }

      const sources = extractGroundingSources(response);
      const verifiedStatus = determineVerificationStatus(answer, sources);

      res.json({
        answer,
        sources,
        verifiedStatus,
        mode,
        jurisdiction,
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('[Assistant Shilo API Error]', msg);

      if (msg === 'GEMINI_API_KEY_MISSING') {
        res.status(500).json({
          error: 'La clé API Gemini côté serveur est manquante dans la configuration.',
        });
        return;
      }
      if (msg.includes('403') || msg.includes('PERMISSION_DENIED') || msg.includes('API_KEY_INVALID')) {
        res.status(403).json({
          error: 'Clé API invalide ou accès refusé. Vérifiez la clé dans Settings > Secrets.',
        });
        return;
      }
      if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
        res.status(429).json({
          error: 'Le service est temporairement sollicité. Veuillez patienter quelques instants avant de réessayer.',
        });
        return;
      }
      res.status(500).json({
        error: 'Une erreur technique est survenue lors de l’analyse juridique. Veuillez réessayer.',
      });
    }
  });

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      const indexFile = path.join(distPath, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build introuvable.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Assistant Shilo serveur actif sur http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Échec du démarrage du serveur Assistant Shilo:', err);
  process.exit(1);
});
