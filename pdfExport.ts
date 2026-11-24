import { jsPDF } from 'jspdf';
import {
  JURISDICTION_LABELS,
  MODE_LABELS,
  ROLE_LABELS,
  type Jurisdiction,
  type LegalMessage,
  type LegalMode,
  type UserProfile,
} from '../types/legal';

interface ExportConversationPdfParams {
  title: string;
  mode: LegalMode;
  jurisdiction: Jurisdiction;
  messages: LegalMessage[];
  profile: UserProfile | null;
  userEmail?: string | null;
}

/**
 * Normalise les caractères typographiques hors Latin-1 (apostrophes courbes, œ, tirets cadratins, etc.)
 * pour garantir un rendu impeccable avec les polices standard de jsPDF.
 */
function normalizePdfText(input: string): string {
  return input
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/\u0153/g, 'oe')
    .replace(/\u0152/g, 'OE')
    .replace(/\u00A0/g, ' ')
    .replace(/\u20AC/g, 'EUR')
    .replace(/\u2022/g, '-')
    .replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, '');
}

function stripInlineMarkdown(line: string): string {
  return line
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)');
}

function sanitizeFileSlug(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 42);
}

function formatFrenchDate(ms: number): string {
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(ms));
  } catch {
    return '';
  }
}

export function exportConversationToPdf(params: ExportConversationPdfParams): void {
  const { title, mode, jurisdiction, messages, profile, userEmail } = params;
  if (!messages || messages.length === 0) return;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 18;
  const contentWidth = pageWidth - marginX * 2;
  const bottomLimit = pageHeight - 22;

  let cursorY = 18;

  const ensureSpace = (neededMm: number) => {
    if (cursorY + neededMm > bottomLimit) {
      doc.addPage();
      cursorY = 18;
    }
  };

  // --- Bandeau d'en-tête Cabinet Assistant Shilo (Bleu nuit & Doré) ---
  doc.setFillColor(11, 22, 44); // #0B162C
  doc.rect(0, 0, pageWidth, 30, 'F');

  doc.setFillColor(197, 155, 56); // #C59B38
  doc.rect(0, 30, pageWidth, 1.2, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('times', 'bold');
  doc.setFontSize(18);
  doc.text('ASSISTANT SHILO', marginX, 14);

  doc.setTextColor(217, 181, 91); // #D9B55B
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(
    normalizePdfText(
      'Dossier d\'archives et notes juridiques - Base : Droit de la République démocratique du Congo (RDC)'
    ),
    marginX,
    22
  );

  cursorY = 40;

  // --- Cartouche des métadonnées du dossier ---
  doc.setFillColor(248, 249, 251);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(marginX, cursorY, contentWidth, 30, 2, 2, 'FD');

  doc.setTextColor(11, 22, 44);
  doc.setFont('times', 'bold');
  doc.setFontSize(12);
  const safeTitle = normalizePdfText(title || 'Consultation juridique');
  const titleLines = doc.splitTextToSize(safeTitle, contentWidth - 10) as string[];
  doc.text(titleLines.slice(0, 2), marginX + 5, cursorY + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);

  const metaLine1 = normalizePdfText(
    `Mode : ${MODE_LABELS[mode].label}   |   Ordre juridique : ${JURISDICTION_LABELS[jurisdiction].label}`
  );
  const authorLabel = profile
    ? `${profile.displayName} (${ROLE_LABELS[profile.roleType]})`
    : userEmail || 'Session invité';
  const metaLine2 = normalizePdfText(
    `Exporté le : ${formatFrenchDate(Date.now())}   |   Titulaire : ${authorLabel}`
  );

  doc.text(metaLine1, marginX + 5, cursorY + 19);
  doc.text(metaLine2, marginX + 5, cursorY + 25);

  cursorY += 38;

  // --- Parcours chronologique des échanges et notes juridiques ---
  messages.forEach((msg, index) => {
    const timeStr = formatFrenchDate(msg.createdAtMs);

    if (msg.role === 'user') {
      ensureSpace(22);

      // Libellé Question
      doc.setFillColor(241, 245, 249);
      doc.setDrawColor(203, 213, 225);

      const cleanQ = normalizePdfText(msg.content.trim());
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      const qLines = doc.splitTextToSize(cleanQ, contentWidth - 10) as string[];

      const headerLabel = normalizePdfText(
        `DEMANDE / QUESTION #${Math.ceil((index + 1) / 2)}  -  ${JURISDICTION_LABELS[msg.jurisdiction].short}  (${timeStr})`
      );

      // Si la question est longue, pagination fluide sans boîte tronquée
      if (qLines.length <= 12) {
        const boxHeight = 11 + qLines.length * 4.6;
        ensureSpace(boxHeight + 4);
        doc.roundedRect(marginX, cursorY, contentWidth, boxHeight, 1.5, 1.5, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(159, 121, 34); // #9F7922
        doc.text(headerLabel, marginX + 5, cursorY + 6);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.5);
        doc.setTextColor(15, 23, 42);
        doc.text(qLines, marginX + 5, cursorY + 12);
        cursorY += boxHeight + 6;
      } else {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(159, 121, 34);
        doc.text(headerLabel, marginX, cursorY);
        cursorY += 5;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.5);
        doc.setTextColor(15, 23, 42);
        for (const line of qLines) {
          ensureSpace(5);
          doc.text(line, marginX, cursorY);
          cursorY += 4.6;
        }
        cursorY += 5;
      }
      return;
    }

    // --- Réponse / Note juridique Assistant Shilo ---
    ensureSpace(18);
    doc.setFont('times', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(11, 22, 44);
    doc.text(
      normalizePdfText(`NOTE JURIDIQUE — ASSISTANT SHILO (${JURISDICTION_LABELS[msg.jurisdiction].label})`),
      marginX,
      cursorY
    );
    cursorY += 4.5;

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    const verificationNote =
      msg.verifiedStatus === 'verifie'
        ? 'Statut : Références appuyées par recherche documentaire'
        : 'Statut : Vérification complémentaire recommandée au Journal Officiel de la RDC / Recueil OHADA';
    doc.text(normalizePdfText(`${verificationNote}  -  ${timeStr}`), marginX, cursorY);
    cursorY += 3;

    doc.setDrawColor(197, 155, 56);
    doc.line(marginX, cursorY, marginX + 40, cursorY);
    cursorY += 5;

    // Rendu structuré du contenu Markdown
    const rawLines = msg.content.split(/\r?\n/);

    for (const rawLine of rawLines) {
      const trimmed = rawLine.trim();

      if (!trimmed) {
        cursorY += 2.2;
        continue;
      }

      // Titres Markdown
      const headingMatch = trimmed.match(/^(#{1,4})\s+(.*)$/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        const headingText = normalizePdfText(stripInlineMarkdown(headingMatch[2]));
        ensureSpace(9);
        cursorY += 2;
        doc.setFont('times', 'bold');
        doc.setFontSize(level <= 2 ? 12 : 10.5);
        doc.setTextColor(11, 22, 44);
        const wrappedHeading = doc.splitTextToSize(headingText, contentWidth) as string[];
        for (const hLine of wrappedHeading) {
          ensureSpace(5.5);
          doc.text(hLine, marginX, cursorY);
          cursorY += 5.2;
        }
        cursorY += 1;
        continue;
      }

      // Séparateurs horizontaux ---
      if (/^[-*_]{3,}$/.test(trimmed)) {
        ensureSpace(4);
        doc.setDrawColor(226, 232, 240);
        doc.line(marginX, cursorY, pageWidth - marginX, cursorY);
        cursorY += 4;
        continue;
      }

      // Listes à puces ou numérotées
      const bulletMatch = trimmed.match(/^[-*]\s+(.*)$/);
      const numberedMatch = trimmed.match(/^(\d+\.)\s+(.*)$/);

      if (bulletMatch || numberedMatch) {
        const prefix = bulletMatch ? '- ' : `${numberedMatch![1]} `;
        const itemBody = bulletMatch ? bulletMatch[1] : numberedMatch![2];
        const cleanItem = normalizePdfText(stripInlineMarkdown(itemBody));
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.5);
        doc.setTextColor(22, 34, 56);
        const wrappedItem = doc.splitTextToSize(cleanItem, contentWidth - 7) as string[];
        wrappedItem.forEach((wLine, idx) => {
          ensureSpace(5);
          if (idx === 0) {
            doc.text(prefix, marginX + 2, cursorY);
          }
          doc.text(wLine, marginX + 7, cursorY);
          cursorY += 4.6;
        });
        continue;
      }

      // Paragraphe standard (ou citation > )
      const isQuote = trimmed.startsWith('>');
      const plainLine = normalizePdfText(
        stripInlineMarkdown(isQuote ? trimmed.replace(/^>\s*/, '') : trimmed)
      );
      doc.setFont('helvetica', isQuote ? 'italic' : 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(isQuote ? 71 : 22, isQuote ? 85 : 34, isQuote ? 105 : 56);

      const xOffset = isQuote ? marginX + 4 : marginX;
      const maxW = isQuote ? contentWidth - 4 : contentWidth;
      const wrappedPara = doc.splitTextToSize(plainLine, maxW) as string[];
      for (const pLine of wrappedPara) {
        ensureSpace(5);
        doc.text(pLine, xOffset, cursorY);
        cursorY += 4.7;
      }
    }

    // Sources vérifiables associées
    if (msg.sources && msg.sources.length > 0) {
      ensureSpace(12);
      cursorY += 2;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(11, 22, 44);
      doc.text(
        normalizePdfText(`Sources et textes consultés (${msg.sources.length}) :`),
        marginX,
        cursorY
      );
      cursorY += 4.5;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);

      for (const src of msg.sources) {
        const srcText = normalizePdfText(`- ${src.title} : ${src.uri}`);
        const srcLines = doc.splitTextToSize(srcText, contentWidth - 4) as string[];
        for (const sLine of srcLines) {
          ensureSpace(4.2);
          doc.text(sLine, marginX + 2, cursorY);
          cursorY += 3.9;
        }
      }
    }

    cursorY += 6;
    ensureSpace(4);
    doc.setDrawColor(226, 232, 240);
    doc.line(marginX, cursorY, pageWidth - marginX, cursorY);
    cursorY += 7;
  });

  // --- Pied de page juridique sur toutes les pages ---
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p += 1) {
    doc.setPage(p);
    doc.setDrawColor(203, 213, 225);
    doc.line(marginX, pageHeight - 15, pageWidth - marginX, pageHeight - 15);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(
      normalizePdfText(
        'Assistant Shilo (Droit RDC, OHADA & comparé) - Document d\'information pédagogique ne remplaçant pas un avocat.'
      ),
      marginX,
      pageHeight - 10
    );
    doc.text(`Page ${p} / ${totalPages}`, pageWidth - marginX, pageHeight - 10, {
      align: 'right',
    });
  }

  const datePart = new Date().toISOString().slice(0, 10);
  const slug = sanitizeFileSlug(title || 'consultation_juridique') || 'consultation';
  const fileName = `Assistant_Shilo_RDC_${slug}_${datePart}.pdf`;

  doc.save(fileName);
}
