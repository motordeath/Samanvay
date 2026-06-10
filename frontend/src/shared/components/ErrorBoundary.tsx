import React, { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, RefreshCw, Home, LogOut } from 'lucide-react';
import { useAuth } from '../../app/providers/AuthProvider';

export const logOperationalError = (error: Error, info?: ErrorInfo) => {
  console.error('[OPERATIONAL_ERROR]', error.message, error.stack, info?.componentStack);
};

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundaryClass extends Component<Props & { navigate: ReturnType<typeof useNavigate>; logout: () => void }, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logOperationalError(error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  private handleDashboard = () => {
    this.setState({ hasError: false, error: null });
    this.props.navigate('/dashboard');
  };

  private handleLogout = () => {
    this.setState({ hasError: false, error: null });
    this.props.logout();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0A0F1C] flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900/50 border border-slate-800 rounded-2xl p-8 shadow-xl flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500 mb-6">
              <AlertCircle className="w-8 h-8" />
            </div>

            <h1 className="text-2xl font-semibold text-white mb-2">Operational Interruption</h1>
            <p className="text-slate-400 mb-8">
              A rendering failure occurred in this component. The operational context has been preserved.
            </p>

            <div className="flex flex-col gap-3 w-full">
              <button
                onClick={this.handleRetry}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-medium transition-colors"
              >
                <RefreshCw className="w-5 h-5" />
                Retry Render
              </button>

              <button
                onClick={this.handleDashboard}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors"
              >
                <Home className="w-5 h-5" />
                Return to Dashboard
              </button>

              <button
                onClick={this.handleLogout}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-slate-700 text-slate-300 hover:bg-slate-800 rounded-lg font-medium transition-colors mt-2"
              >
                <LogOut className="w-5 h-5" />
                Logout
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export const ErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  return <ErrorBoundaryClass navigate={navigate} logout={logout}>{children}</ErrorBoundaryClass>;
};
