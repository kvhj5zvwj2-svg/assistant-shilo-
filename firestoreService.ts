import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db, handleFirestoreError, OperationType } from '../firebase';
import type {
  ConversationSummary,
  GroundingSource,
  Jurisdiction,
  LegalMessage,
  LegalMode,
  UserProfile,
  UserRoleType,
  VerificationStatus,
} from '../types/legal';

export function generateSafeId(prefix: string): string {
  const randomPart =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 16)
      : Math.random().toString(36).slice(2, 14);
  return `${prefix}_${Date.now()}_${randomPart}`;
}

function sanitizeSources(sources: GroundingSource[]): GroundingSource[] {
  if (!Array.isArray(sources)) return [];
  return sources
    .filter((s) => s && typeof s.title === 'string' && typeof s.uri === 'string')
    .slice(0, 15)
    .map((s) => ({
      title: s.title.slice(0, 280),
      uri: s.uri.slice(0, 950),
    }));
}

function timestampToMs(ts: unknown): number {
  if (ts instanceof Timestamp) {
    return ts.toMillis();
  }
  return Date.now();
}

export async function ensureUserProfile(user: User): Promise<UserProfile> {
  const userPath = `users/${user.uid}`;
  const userRef = doc(db, 'users', user.uid);

  try {
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const data = snap.data() as UserProfile;
      return data;
    }

    const profile: UserProfile = {
      uid: user.uid,
      displayName: (user.displayName || user.email?.split('@')[0] || 'Utilisateur Shilo').slice(0, 120),
      email: (user.email || 'utilisateur@shilo.cd').slice(0, 200),
      roleType: 'etudiant',
      preferredDomain: 'rdc',
    };

    await setDoc(userRef, {
      ...profile,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return profile;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, userPath);
  }
}

export async function updateUserProfile(
  userId: string,
  updates: { displayName: string; roleType: UserRoleType; preferredDomain: Jurisdiction }
): Promise<void> {
  const userPath = `users/${userId}`;
  const userRef = doc(db, 'users', userId);

  try {
    await updateDoc(userRef, {
      displayName: updates.displayName.trim().slice(0, 120) || 'Utilisateur Shilo',
      roleType: updates.roleType,
      preferredDomain: updates.preferredDomain,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, userPath);
  }
}

export function subscribeToConversations(
  userId: string,
  onData: (items: ConversationSummary[]) => void
): () => void {
  const path = `users/${userId}/conversations`;
  const q = query(
    collection(db, 'users', userId, 'conversations'),
    where('userId', '==', userId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const items: ConversationSummary[] = snapshot.docs
        .map((docSnap) => {
          const d = docSnap.data();
          return {
            id: d.id,
            userId: d.userId,
            title: d.title,
            mode: d.mode,
            jurisdiction: d.jurisdiction,
            messageCount: typeof d.messageCount === 'number' ? d.messageCount : 0,
            lastPreview: d.lastPreview || '',
            createdAtMs: timestampToMs(d.createdAt),
            updatedAtMs: timestampToMs(d.updatedAt),
          };
        })
        .sort((a, b) => b.updatedAtMs - a.updatedAtMs);
      onData(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export function subscribeToMessages(
  userId: string,
  conversationId: string,
  onData: (items: LegalMessage[]) => void
): () => void {
  const path = `users/${userId}/conversations/${conversationId}/messages`;
  const q = query(
    collection(db, 'users', userId, 'conversations', conversationId, 'messages'),
    where('userId', '==', userId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const items: LegalMessage[] = snapshot.docs
        .map((docSnap) => {
          const d = docSnap.data();
          return {
            id: d.id,
            userId: d.userId,
            conversationId: d.conversationId,
            role: d.role,
            content: d.content,
            jurisdiction: d.jurisdiction,
            mode: d.mode,
            sources: Array.isArray(d.sources) ? d.sources : [],
            verifiedStatus: d.verifiedStatus,
            createdAtMs: timestampToMs(d.createdAt),
          };
        })
        .sort((a, b) => a.createdAtMs - b.createdAtMs);
      onData(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function createConversationRecord(params: {
  userId: string;
  conversationId: string;
  title: string;
  mode: LegalMode;
  jurisdiction: Jurisdiction;
  lastPreview: string;
}): Promise<void> {
  const path = `users/${params.userId}/conversations/${params.conversationId}`;
  const convRef = doc(db, 'users', params.userId, 'conversations', params.conversationId);

  try {
    await setDoc(convRef, {
      id: params.conversationId,
      userId: params.userId,
      title: params.title.trim().slice(0, 200) || 'Nouvelle consultation',
      mode: params.mode,
      jurisdiction: params.jurisdiction,
      messageCount: 0,
      lastPreview: params.lastPreview.trim().slice(0, 300),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function addMessageRecord(params: {
  userId: string;
  conversationId: string;
  messageId: string;
  role: 'user' | 'assistant';
  content: string;
  jurisdiction: Jurisdiction;
  mode: LegalMode;
  sources: GroundingSource[];
  verifiedStatus: VerificationStatus;
  newMessageCount: number;
}): Promise<void> {
  const msgPath = `users/${params.userId}/conversations/${params.conversationId}/messages/${params.messageId}`;
  const msgRef = doc(
    db,
    'users',
    params.userId,
    'conversations',
    params.conversationId,
    'messages',
    params.messageId
  );
  const convRef = doc(db, 'users', params.userId, 'conversations', params.conversationId);

  try {
    await setDoc(msgRef, {
      id: params.messageId,
      userId: params.userId,
      conversationId: params.conversationId,
      role: params.role,
      content: params.content.slice(0, 40000),
      jurisdiction: params.jurisdiction,
      mode: params.mode,
      sources: sanitizeSources(params.sources),
      verifiedStatus: params.verifiedStatus,
      createdAt: serverTimestamp(),
    });

    await updateDoc(convRef, {
      messageCount: params.newMessageCount,
      lastPreview: params.content.replace(/\s+/g, ' ').trim().slice(0, 280),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, msgPath);
  }
}

export async function renameConversationRecord(
  userId: string,
  conversationId: string,
  newTitle: string
): Promise<void> {
  const path = `users/${userId}/conversations/${conversationId}`;
  const convRef = doc(db, 'users', userId, 'conversations', conversationId);
  try {
    await updateDoc(convRef, {
      title: newTitle.trim().slice(0, 200) || 'Consultation juridique',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteConversationRecord(userId: string, conversationId: string): Promise<void> {
  const path = `users/${userId}/conversations/${conversationId}`;
  try {
    const msgsQuery = query(
      collection(db, 'users', userId, 'conversations', conversationId, 'messages'),
      where('userId', '==', userId)
    );
    const msgsSnap = await getDocs(msgsQuery);
    const batch = writeBatch(db);
    msgsSnap.docs.forEach((d) => batch.delete(d.ref));
    batch.delete(doc(db, 'users', userId, 'conversations', conversationId));
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function migrateGuestConversations(
  userId: string,
  guestConversations: ConversationSummary[],
  messagesByConv: Record<string, LegalMessage[]>
): Promise<number> {
  let imported = 0;
  for (const conv of guestConversations) {
    const convMessages = messagesByConv[conv.id] || [];
    const safeConvId = /^[a-zA-Z0-9_\-]+$/.test(conv.id) ? conv.id : generateSafeId('conv');
    await createConversationRecord({
      userId,
      conversationId: safeConvId,
      title: conv.title,
      mode: conv.mode,
      jurisdiction: conv.jurisdiction,
      lastPreview: conv.lastPreview,
    });
    let count = 0;
    for (const msg of convMessages) {
      count += 1;
      const safeMsgId = /^[a-zA-Z0-9_\-]+$/.test(msg.id) ? msg.id : generateSafeId('msg');
      await addMessageRecord({
        userId,
        conversationId: safeConvId,
        messageId: safeMsgId,
        role: msg.role,
        content: msg.content,
        jurisdiction: msg.jurisdiction,
        mode: msg.mode,
        sources: msg.sources || [],
        verifiedStatus: msg.verifiedStatus || 'partiel',
        newMessageCount: count,
      });
    }
    imported += 1;
  }
  return imported;
}
