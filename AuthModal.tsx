import React, { useState, useEffect } from 'react';
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { Scale, X, LogOut, Check, UserCheck, MailCheck, Upload } from 'lucide-react';
import { auth, googleProvider } from '../firebase';
import {
  JURISDICTION_LABELS,
  ROLE_LABELS,
  type Jurisdiction,
  type UserProfile,
  type UserRoleType,
} from '../types/legal';
import { updateUserProfile } from '../services/firestoreService';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  profile: UserProfile | null;
  guestCount: number;
  onImportGuestHistory: () => Promise<void>;
  onProfileUpdated: (updated: UserProfile) => void;
  onVerificationRefreshed: () => Promise<void>;
}

type AuthTab = 'login' | 'register' | 'reset';

function mapFirebaseAuthError(err: unknown): string {
  const code = (err as { code?: string })?.code || '';
  const message = err instanceof Error ? err.message : '';

  if (code === 'auth/popup-closed-by-user' || message.includes('popup-closed-by-user')) {
    return "La fenêtre de connexion Google a été fermée avant la fin de l'authentification.";
  }
  if (code === 'auth/unauthorized-domain') {
    return "Ce domaine n'est pas encore autorisé dans Firebase Console (Authentication > Settings > Authorized domains).";
  }
  if (code === 'auth/operation-not-allowed') {
    return "La connexion par e-mail/mot de passe n'est pas encore activée dans la console Firebase (Authentication > Sign-in method). Utilisez Google ou activez ce fournisseur.";
  }
  if (code === 'auth/email-already-in-use') {
    return 'Un compte existe déjà avec cette adresse e-mail. Connectez-vous ou réinitialisez votre mot de passe.';
  }
  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
    return 'Adresse e-mail ou mot de passe incorrect.';
  }
  if (code === 'auth/weak-password') {
    return 'Le mot de passe doit contenir au moins 6 caractères.';
  }
  if (code === 'auth/invalid-email') {
    return "Veuillez saisir une adresse e-mail valide.";
  }
  if (code === 'auth/too-many-requests') {
    return 'Trop de tentatives. Veuillez patienter quelques minutes avant de réessayer.';
  }
  return "Impossible de finaliser l'opération d'authentification. Veuillez réessayer.";
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  user,
  profile,
  guestCount,
  onImportGuestHistory,
  onProfileUpdated,
  onVerificationRefreshed,
}) => {
  const [authTab, setAuthTab] = useState<AuthTab>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [registerName, setRegisterName] = useState('');

  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [roleType, setRoleType] = useState<UserRoleType>(profile?.roleType || 'etudiant');
  const [preferredDomain, setPreferredDomain] = useState<Jurisdiction>(profile?.preferredDomain || 'rdc');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName);
      setRoleType(profile.roleType);
      setPreferredDomain(profile.preferredDomain);
    }
  }, [profile]);

  if (!isOpen) return null;

  const handleGoogleAuth = async () => {
    setLoading(true);
    setErrorMsg(null);
    setInfoMsg(null);
    try {
      await signInWithPopup(auth, googleProvider);
      onClose();
    } catch (err: unknown) {
      setErrorMsg(mapFirebaseAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setInfoMsg(null);

    try {
      if (authTab === 'login') {
        await signInWithEmailAndPassword(auth, email.trim(), password);
        if (auth.currentUser?.emailVerified) {
          onClose();
        } else {
          setInfoMsg(
            "Connexion réussie. Veuillez vérifier votre adresse e-mail via le lien reçu pour activer la sauvegarde cloud."
          );
        }
      } else if (authTab === 'register') {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        const cleanName = registerName.trim() || email.split('@')[0] || 'Utilisateur Shilo';
        await updateProfile(cred.user, { displayName: cleanName });
        await sendEmailVerification(cred.user);
        setInfoMsg(
          'Compte créé ! Un e-mail de confirmation vient de vous être envoyé. Cliquez sur le lien reçu puis actualisez votre statut ci-dessous.'
        );
      } else {
        await sendPasswordResetEmail(auth, email.trim());
        setInfoMsg('Un e-mail de réinitialisation du mot de passe a été envoyé à votre adresse.');
      }
    } catch (err: unknown) {
      setErrorMsg(mapFirebaseAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!user) return;
    setLoading(true);
    setErrorMsg(null);
    setInfoMsg(null);
    try {
      await sendEmailVerification(user);
      setInfoMsg("Nouvel e-mail de vérification envoyé. Vérifiez aussi vos courriers indésirables.");
    } catch (err: unknown) {
      setErrorMsg(mapFirebaseAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleCheckVerification = async () => {
    setLoading(true);
    setErrorMsg(null);
    setInfoMsg(null);
    try {
      await onVerificationRefreshed();
      if (auth.currentUser?.emailVerified) {
        setInfoMsg('Adresse e-mail confirmée ! Votre espace personnel est désormais synchronisé.');
      } else {
        setErrorMsg("L'adresse e-mail n'apparaît pas encore comme vérifiée. Cliquez d'abord sur le lien reçu par e-mail.");
      }
    } catch {
      setErrorMsg('Impossible de vérifier le statut du compte.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;
    setLoading(true);
    setErrorMsg(null);
    setSavedNotice(false);

    try {
      await updateUserProfile(user.uid, {
        displayName,
        roleType,
        preferredDomain,
      });
      onProfileUpdated({
        ...profile,
        displayName: displayName.trim() || profile.displayName,
        roleType,
        preferredDomain,
      });
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 2500);
    } catch {
      setErrorMsg('Erreur lors de la mise à jour du profil.');
    } finally {
      setLoading(false);
    }
  };

  const handleImportClick = async () => {
    setLoading(true);
    setErrorMsg(null);
    setInfoMsg(null);
    try {
      await onImportGuestHistory();
      setInfoMsg('Historique local importé avec succès dans votre compte personnel.');
    } catch {
      setErrorMsg("Erreur lors de l'importation de l'historique local.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      setErrorMsg(null);
      setInfoMsg(null);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#060D1A]/65 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full overflow-hidden shadow-xl max-h-[90vh] flex flex-col">
        <div className="bg-[#0B162C] text-white px-6 py-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <Scale className="w-5 h-5 text-[#D9B55B]" />
            <h2 id="auth-modal-title" className="font-serif text-xl font-semibold tracking-tight">
              {user ? 'Compte personnel' : 'Connexion & Inscription'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer la fenêtre"
            className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800 leading-relaxed">
              {errorMsg}
            </div>
          )}

          {infoMsg && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 leading-relaxed">
              {infoMsg}
            </div>
          )}

          {!user ? (
            <div className="space-y-5">
              <p className="text-xs text-slate-600 leading-relaxed">
                Accédez à votre historique personnel sur tous vos appareils, gratuitement et sans
                abonnement.
              </p>

              <button
                type="button"
                onClick={handleGoogleAuth}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 px-5 py-3 bg-[#0B162C] text-white text-sm font-medium rounded-lg hover:bg-[#132544] transition-colors disabled:opacity-60 cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#EA4335"
                    d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.9C6.2 7.2 8.9 5 12 5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.6l3.7 2.9c2.2-2 3.7-5 3.7-8.7z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.3 14.7c-.2-.8-.4-1.6-.4-2.5s.1-1.7.4-2.5L1.6 6.8C.6 8.8 0 11 0 13.3s.6 4.5 1.6 6.5l3.7-2.9z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.1-6.7-5L1.6 17.2C3.5 21.1 7.4 24 12 24z"
                  />
                </svg>
                {loading ? 'Connexion en cours...' : 'Continuer avec Google'}
              </button>

              <div className="relative flex items-center py-1">
                <div className="flex-grow border-t border-slate-200" />
                <span className="shrink mx-3 text-[11px] text-slate-400">ou par e-mail</span>
                <div className="flex-grow border-t border-slate-200" />
              </div>

              {/* Onglets Connexion / Inscription */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => {
                    setAuthTab('login');
                    setErrorMsg(null);
                    setInfoMsg(null);
                  }}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    authTab === 'login' ? 'bg-white text-[#0B162C] shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Connexion
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthTab('register');
                    setErrorMsg(null);
                    setInfoMsg(null);
                  }}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    authTab === 'register' ? 'bg-white text-[#0B162C] shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Créer un compte
                </button>
              </div>

              <form onSubmit={handleEmailAuth} className="space-y-3.5">
                {authTab === 'register' && (
                  <div>
                    <label htmlFor="reg-name" className="block text-xs font-medium text-slate-700 mb-1">
                      Nom complet
                    </label>
                    <input
                      id="reg-name"
                      type="text"
                      required
                      maxLength={120}
                      value={registerName}
                      onChange={(e) => setRegisterName(e.target.value)}
                      placeholder="Ex : Maître Jean-Luc Kabongo"
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#0B162C]"
                    />
                  </div>
                )}

                <div>
                  <label htmlFor="auth-email" className="block text-xs font-medium text-slate-700 mb-1">
                    Adresse e-mail
                  </label>
                  <input
                    id="auth-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nom@exemple.com"
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#0B162C]"
                  />
                </div>

                {authTab !== 'reset' && (
                  <div>
                    <label htmlFor="auth-password" className="block text-xs font-medium text-slate-700 mb-1">
                      Mot de passe
                    </label>
                    <input
                      id="auth-password"
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="6 caractères minimum"
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#0B162C]"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between gap-2 pt-1">
                  {authTab === 'login' ? (
                    <button
                      type="button"
                      onClick={() => setAuthTab('reset')}
                      className="text-xs text-slate-500 hover:text-[#0B162C] hover:underline cursor-pointer"
                    >
                      Mot de passe oublié ?
                    </button>
                  ) : authTab === 'reset' ? (
                    <button
                      type="button"
                      onClick={() => setAuthTab('login')}
                      className="text-xs text-slate-500 hover:text-[#0B162C] hover:underline cursor-pointer"
                    >
                      Retour à la connexion
                    </button>
                  ) : (
                    <span />
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2.5 bg-[#C59B38] text-[#060D1A] text-xs font-semibold rounded-lg hover:bg-[#D9B55B] transition-colors disabled:opacity-60 cursor-pointer whitespace-nowrap"
                  >
                    {authTab === 'login'
                      ? 'Se connecter'
                      : authTab === 'register'
                        ? "S'inscrire"
                        : 'Réinitialiser'}
                  </button>
                </div>
              </form>
            </div>
          ) : !user.emailVerified ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-900">
                  <MailCheck className="w-4 h-4 shrink-0" />
                  <span>Vérification d&apos;e-mail requise</span>
                </div>
                <p className="text-xs text-amber-800 leading-relaxed">
                  Pour sécuriser vos données personnelles dans Firestore, veuillez cliquer sur le
                  lien de confirmation envoyé à <strong>{user.email}</strong>.
                </p>
              </div>

              <div className="flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={handleCheckVerification}
                  disabled={loading}
                  className="w-full py-2.5 bg-[#0B162C] text-white text-xs font-semibold rounded-lg hover:bg-[#132544] transition-colors cursor-pointer"
                >
                  J&apos;ai vérifié mon e-mail (actualiser)
                </button>
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={loading}
                  className="w-full py-2.5 border border-slate-300 text-slate-700 text-xs font-medium rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Renvoyer l&apos;e-mail de confirmation
                </button>
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={loading}
                  className="w-full py-2 text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Se déconnecter
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-[#F8F9FB] border border-slate-200">
                <div className="w-10 h-10 rounded-full bg-[#0B162C] text-[#D9B55B] flex items-center justify-center shrink-0">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#0B162C] truncate">
                    {user.displayName || profile?.displayName}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{user.email}</p>
                </div>
              </div>

              {guestCount > 0 && (
                <div className="p-3 rounded-lg bg-[#F8F9FB] border border-[#C59B38]/40 flex items-center justify-between gap-3">
                  <span className="text-xs text-slate-700">
                    {guestCount} consultation{guestCount > 1 ? 's' : ''} locale
                    {guestCount > 1 ? 's' : ''} disponible{guestCount > 1 ? 's' : ''}
                  </span>
                  <button
                    type="button"
                    onClick={handleImportClick}
                    disabled={loading}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0B162C] text-white text-xs font-medium rounded-md hover:bg-[#132544] cursor-pointer whitespace-nowrap"
                  >
                    <Upload className="w-3.5 h-3.5 text-[#D9B55B]" />
                    Importer
                  </button>
                </div>
              )}

              <div>
                <label htmlFor="profile-name" className="block text-xs font-medium text-slate-700 mb-1.5">
                  Nom complet affiché
                </label>
                <input
                  id="profile-name"
                  type="text"
                  required
                  maxLength={120}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C59B38]/40 focus:border-[#0B162C]"
                />
              </div>

              <div>
                <label htmlFor="profile-role" className="block text-xs font-medium text-slate-700 mb-1.5">
                  Qualité / Profil juridique
                </label>
                <select
                  id="profile-role"
                  value={roleType}
                  onChange={(e) => setRoleType(e.target.value as UserRoleType)}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#C59B38]/40 focus:border-[#0B162C]"
                >
                  {(Object.keys(ROLE_LABELS) as UserRoleType[]).map((key) => (
                    <option key={key} value={key}>
                      {ROLE_LABELS[key]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="profile-domain" className="block text-xs font-medium text-slate-700 mb-1.5">
                  Ordre juridique prioritaire par défaut
                </label>
                <select
                  id="profile-domain"
                  value={preferredDomain}
                  onChange={(e) => setPreferredDomain(e.target.value as Jurisdiction)}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#C59B38]/40 focus:border-[#0B162C]"
                >
                  {(Object.keys(JURISDICTION_LABELS) as Jurisdiction[]).map((key) => (
                    <option key={key} value={key}>
                      {JURISDICTION_LABELS[key].label}
                    </option>
                  ))}
                </select>
              </div>

              {savedNotice && (
                <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-lg">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>Préférences enregistrées dans votre compte.</span>
                </div>
              )}

              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Se déconnecter
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 bg-[#0B162C] text-white text-xs font-medium rounded-lg hover:bg-[#132544] transition-colors disabled:opacity-60 cursor-pointer whitespace-nowrap"
                >
                  {loading ? 'Enregistrement...' : 'Enregistrer le profil'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
