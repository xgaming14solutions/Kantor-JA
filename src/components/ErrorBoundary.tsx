import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught application error:', error, errorInfo);
  }

  private handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F4F7F8] flex items-center justify-center p-4">
          <div className="bg-white border border-[#DCE5E8] rounded-xl p-6 sm:p-8 max-w-md w-full text-center space-y-4">
            <div className="w-12 h-12 rounded-xl bg-[#FBF1F1] text-[#C96A6A] flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#24343D]">Terjadi Kendala Tampilan</h2>
              <p className="text-xs text-[#71818A] mt-1 leading-relaxed">
                Sistem mendeteksi gangguan tak terduga saat memuat halaman. Data Anda tetap aman.
              </p>
            </div>
            {this.state.error && (
              <div className="p-3 rounded-lg bg-[#F4F7F8] border border-[#DCE5E8] text-left text-[11px] font-mono text-[#24343D] break-words max-h-32 overflow-y-auto">
                {this.state.error.message}
              </div>
            )}
            <button
              onClick={this.handleReload}
              className="w-full py-2.5 px-4 rounded-lg text-xs font-semibold text-white bg-[#24485A] hover:bg-[#1C3948] transition inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              Muat Ulang Halaman
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
