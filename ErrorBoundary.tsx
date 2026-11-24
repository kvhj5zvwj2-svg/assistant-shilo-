import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    let displayMessage = "Une erreur inattendue s'est produite dans l'application.";
    if (error.message.includes('Missing or insufficient permissions')) {
      displayMessage =
        "Accès refusé aux données. Veuillez vérifier que vous êtes bien connecté avec votre compte personnel.";
    } else if (error.message.startsWith('{')) {
      try {
        const parsed = JSON.parse(error.message) as { error?: string };
        if (parsed.error?.includes('Missing or insufficient permissions')) {
          displayMessage =
            'Accès refusé par les règles de sécurité. Reconnectez-vous pour synchroniser votre session.';
        }
      } catch {
        // Keep fallback French message
      }
    }
    return { hasError: true, message: displayMessage };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F8F9FB] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white border border-slate-200 rounded-xl p-8 text-center shadow-sm">
            <div className="w-12 h-12 rounded-full bg-[#0B162C]/5 text-[#0B162C] flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6 text-[#9F7922]" />
            </div>
            <h2 className="font-serif text-2xl font-bold text-[#0B162C] mb-2">
              Interruption momentanée
            </h2>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">{this.state.message}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#0B162C] text-white text-sm font-medium rounded-lg hover:bg-[#132544] transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              Recharger Assistant Shilo
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
