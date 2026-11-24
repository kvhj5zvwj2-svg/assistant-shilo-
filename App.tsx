import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from './firebase';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LandingView } from './components/LandingView';
import { WorkspaceView } from './components/WorkspaceView';
import { AuthModal } from './components/AuthModal';
import {
  addMessageRecord,
  createConversationRecord,
  deleteConversationRecord,
  ensureUserProfile,
  generateSafeId,
  migrateGuestConversations,
  renameConversationRecord,
  subscribeToConversations,
  subscribeToMessages,
} from './services/firestoreService';
import type {
  ConversationSummary,
  GroundingSource,
  Jurisdiction,
  LegalMessage,
  LegalMode,
  UserProfile,
  VerificationStatus,
} from './types/legal';

interface LocalStore {
  conversations: ConversationSummary[];
  messagesByConv: Record<string, LegalMessage[]>;
}

const LOCAL_STORAGE_KEY = 'assistant_shilo_guest_history_v1';

function loadGuestStore(): LocalStore {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return { conversations: [], messagesByConv: {} };
    const parsed = JSON.parse(raw) as LocalStore;
    if (!Array.isArray(parsed.conversations) || typeof parsed.messagesByConv !== 'object') {
      return { conversations: [], messagesByConv: {} };
    }
    return parsed;
  } catch {
    return { conversations: [], messagesByConv: {} };
  }
}

function saveGuestStore(store: LocalStore): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Ignore storage quota issues
  }
}

function deriveTitleFromQuestion(question: string): string {
  const clean = question.replace(/\s+/g, ' ').trim();
  if (clean.length <= 68) return clean;
  return `${clean.slice(0, 65)}...`;
}

export function AssistantShiloApp() {
  const [view, setView] = useState<'landing' | 'workspace'>('landing');
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [emailVerified, setEmailVerified] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const [activeMode, setActiveMode] = useState<LegalMode>('consultation');
  const [activeJurisdiction, setActiveJurisdiction] = useState<Jurisdiction>('rdc');
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  const [cloudConversations, setCloudConversations] = useState<ConversationSummary[]>([]);
  const [cloudMessages, setCloudMessages] = useState<LegalMessage[]>([]);

  const [guestStore, setGuestStore] = useState<LocalStore>(() => loadGuestStore());

  const [isSending, setIsSending] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const isCloudActive = Boolean(authReady && user && emailVerified);

  const syncUserProfile = async (firebaseUser: User) => {
    try {
      const userProf = await ensureUserProfile(firebaseUser);
      setProfile(userProf);
      if (userProf.preferredDomain) {
        setActiveJurisdiction(userProf.preferredDomain);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Écoute de l'état d'authentification Firebase
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setEmailVerified(Boolean(firebaseUser?.emailVerified));
      setAuthReady(true);

      if (firebaseUser && firebaseUser.emailVerified) {
        await syncUserProfile(firebaseUser);
      } else {
        setProfile(null);
        setCloudConversations([]);
        setCloudMessages([]);
      }
    });
    return () => unsub();
  }, []);

  const handleRefreshVerification = async () => {
    if (!auth.currentUser) return;
    await auth.currentUser.reload();
    await auth.currentUser.getIdToken(true);
    const verified = Boolean(auth.currentUser.emailVerified);
    setUser(auth.currentUser);
    setEmailVerified(verified);
    if (verified) {
      await syncUserProfile(auth.currentUser);
    }
  };

  // Abonnement temps réel aux conversations de l'utilisateur connecté et vérifié
  useEffect(() => {
    if (!isCloudActive || !user) return;
    const unsub = subscribeToConversations(user.uid, (items) => {
      setCloudConversations(items);
    });
    return () => unsub();
  }, [isCloudActive, user]);

  // Abonnement temps réel aux messages de la conversation active
  useEffect(() => {
    if (!isCloudActive || !user || !activeConversationId) {
      setCloudMessages([]);
      return;
    }
    const unsub = subscribeToMessages(user.uid, activeConversationId, (items) => {
      setCloudMessages(items);
    });
    return () => unsub();
  }, [isCloudActive, user, activeConversationId]);

  const conversations = isCloudActive ? cloudConversations : guestStore.conversations;
  const messages = isCloudActive
    ? cloudMessages
    : activeConversationId
      ? guestStore.messagesByConv[activeConversationId] || []
      : [];

  const handleEnterWorkspace = (mode?: LegalMode, jurisdiction?: Jurisdiction) => {
    if (mode) setActiveMode(mode);
    if (jurisdiction) setActiveJurisdiction(jurisdiction);
    setView('workspace');
  };

  const handleNewConversation = (mode?: LegalMode, jurisdiction?: Jurisdiction) => {
    setActiveConversationId(null);
    if (mode) setActiveMode(mode);
    if (jurisdiction) setActiveJurisdiction(jurisdiction);
    setErrorBanner(null);
  };

  const handleSelectConversation = (convId: string) => {
    setActiveConversationId(convId);
    const found = conversations.find((c) => c.id === convId);
    if (found) {
      setActiveMode(found.mode);
      setActiveJurisdiction(found.jurisdiction);
    }
    setErrorBanner(null);
  };

  const handleRenameConversation = async (convId: string, newTitle: string) => {
    if (isCloudActive && user) {
      await renameConversationRecord(user.uid, convId, newTitle);
    } else {
      const updated: LocalStore = {
        ...guestStore,
        conversations: guestStore.conversations.map((c) =>
          c.id === convId ? { ...c, title: newTitle, updatedAtMs: Date.now() } : c
        ),
      };
      setGuestStore(updated);
      saveGuestStore(updated);
    }
  };

  const handleDeleteConversation = async (convId: string) => {
    if (activeConversationId === convId) {
      setActiveConversationId(null);
    }
    if (isCloudActive && user) {
      await deleteConversationRecord(user.uid, convId);
    } else {
      const nextMsgs = { ...guestStore.messagesByConv };
      delete nextMsgs[convId];
      const updated: LocalStore = {
        conversations: guestStore.conversations.filter((c) => c.id !== convId),
        messagesByConv: nextMsgs,
      };
      setGuestStore(updated);
      saveGuestStore(updated);
    }
  };

  const handleImportGuestHistory = async () => {
    if (!isCloudActive || !user || guestStore.conversations.length === 0) return;
    await migrateGuestConversations(user.uid, guestStore.conversations, guestStore.messagesByConv);
    const empty: LocalStore = { conversations: [], messagesByConv: {} };
    setGuestStore(empty);
    saveGuestStore(empty);
  };

  const handleSendMessage = async (question: string) => {
    setIsSending(true);
    setErrorBanner(null);

    const now = Date.now();
    let targetConvId = activeConversationId;
    const currentMsgs = [...messages];

    try {
      if (!targetConvId) {
        targetConvId = generateSafeId('conv');
        const title = deriveTitleFromQuestion(question);

        if (isCloudActive && user) {
          await createConversationRecord({
            userId: user.uid,
            conversationId: targetConvId,
            title,
            mode: activeMode,
            jurisdiction: activeJurisdiction,
            lastPreview: question.slice(0, 280),
          });
        } else {
          const newConv: ConversationSummary = {
            id: targetConvId,
            title,
            mode: activeMode,
            jurisdiction: activeJurisdiction,
            messageCount: 0,
            lastPreview: question.slice(0, 280),
            createdAtMs: now,
            updatedAtMs: now,
          };
          const updated: LocalStore = {
            conversations: [newConv, ...guestStore.conversations],
            messagesByConv: {
              ...guestStore.messagesByConv,
              [targetConvId]: [],
            },
          };
          setGuestStore(updated);
          saveGuestStore(updated);
        }
        setActiveConversationId(targetConvId);
      }

      const userMsgId = generateSafeId('msg');
      const userMsg: LegalMessage = {
        id: userMsgId,
        userId: user?.uid,
        conversationId: targetConvId,
        role: 'user',
        content: question,
        jurisdiction: activeJurisdiction,
        mode: activeMode,
        sources: [],
        verifiedStatus: 'utilisateur',
        createdAtMs: Date.now(),
      };

      const countAfterUser = currentMsgs.length + 1;

      if (isCloudActive && user) {
        await addMessageRecord({
          userId: user.uid,
          conversationId: targetConvId,
          messageId: userMsgId,
          role: 'user',
          content: question,
          jurisdiction: activeJurisdiction,
          mode: activeMode,
          sources: [],
          verifiedStatus: 'utilisateur',
          newMessageCount: countAfterUser,
        });
      } else {
        setGuestStore((prev) => {
          const prevList = prev.messagesByConv[targetConvId!] || [];
          const nextList = [...prevList, userMsg];
          const updated: LocalStore = {
            conversations: prev.conversations.map((c) =>
              c.id === targetConvId
                ? {
                    ...c,
                    messageCount: nextList.length,
                    lastPreview: question.slice(0, 280),
                    updatedAtMs: Date.now(),
                  }
                : c
            ),
            messagesByConv: {
              ...prev.messagesByConv,
              [targetConvId!]: nextList,
            },
          };
          saveGuestStore(updated);
          return updated;
        });
      }

      const apiRes = await fetch('/api/legal/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          mode: activeMode,
          jurisdiction: activeJurisdiction,
          roleType: profile?.roleType,
          history: currentMsgs.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const payload = (await apiRes.json()) as {
        answer?: string;
        sources?: GroundingSource[];
        verifiedStatus?: VerificationStatus;
        error?: string;
      };

      if (!apiRes.ok || !payload.answer) {
        throw new Error(payload.error || "Le serveur juridique n'a pas pu répondre.");
      }

      const assistantMsgId = generateSafeId('msg');
      const assistantMsg: LegalMessage = {
        id: assistantMsgId,
        userId: user?.uid,
        conversationId: targetConvId,
        role: 'assistant',
        content: payload.answer,
        jurisdiction: activeJurisdiction,
        mode: activeMode,
        sources: payload.sources || [],
        verifiedStatus: payload.verifiedStatus || 'partiel',
        createdAtMs: Date.now(),
      };

      if (isCloudActive && user) {
        await addMessageRecord({
          userId: user.uid,
          conversationId: targetConvId,
          messageId: assistantMsgId,
          role: 'assistant',
          content: payload.answer,
          jurisdiction: activeJurisdiction,
          mode: activeMode,
          sources: payload.sources || [],
          verifiedStatus: payload.verifiedStatus || 'partiel',
          newMessageCount: countAfterUser + 1,
        });
      } else {
        setGuestStore((prev) => {
          const prevList = prev.messagesByConv[targetConvId!] || [];
          const nextList = [...prevList, assistantMsg];
          const updated: LocalStore = {
            conversations: prev.conversations.map((c) =>
              c.id === targetConvId
                ? {
                    ...c,
                    messageCount: nextList.length,
                    lastPreview: payload.answer!.replace(/\s+/g, ' ').trim().slice(0, 280),
                    updatedAtMs: Date.now(),
                  }
                : c
            ),
            messagesByConv: {
              ...prev.messagesByConv,
              [targetConvId!]: nextList,
            },
          };
          saveGuestStore(updated);
          return updated;
        });
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Une erreur est survenue lors de la requête juridique.';
      setErrorBanner(msg);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      {view === 'landing' ? (
        <LandingView
          user={user}
          onEnterWorkspace={handleEnterWorkspace}
          onOpenAuth={() => setAuthModalOpen(true)}
        />
      ) : (
        <WorkspaceView
          user={user}
          profile={profile}
          conversations={conversations}
          activeConversationId={activeConversationId}
          messages={messages}
          activeMode={activeMode}
          activeJurisdiction={activeJurisdiction}
          isSending={isSending}
          errorBanner={errorBanner}
          onDismissError={() => setErrorBanner(null)}
          onSelectMode={(mode) => {
            setActiveMode(mode);
            setActiveConversationId(null);
          }}
          onSelectJurisdiction={(jur) => setActiveJurisdiction(jur)}
          onSelectConversation={handleSelectConversation}
          onNewConversation={handleNewConversation}
          onSendMessage={handleSendMessage}
          onRenameConversation={handleRenameConversation}
          onDeleteConversation={handleDeleteConversation}
          onBackHome={() => setView('landing')}
          onOpenAuth={() => setAuthModalOpen(true)}
        />
      )}

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        user={user}
        profile={profile}
        guestCount={guestStore.conversations.length}
        onImportGuestHistory={handleImportGuestHistory}
        onProfileUpdated={(updated) => {
          setProfile(updated);
          setActiveJurisdiction(updated.preferredDomain);
        }}
        onVerificationRefreshed={handleRefreshVerification}
      />
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AssistantShiloApp />
    </ErrorBoundary>
  );
}
