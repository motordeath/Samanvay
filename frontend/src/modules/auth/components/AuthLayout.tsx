import React from 'react';
import { Shield, Users, Activity, Package } from 'lucide-react';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children, title, subtitle }) => {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[var(--color-canvas)] text-[var(--color-text-primary)] font-sans">
      
      {/* Left Panel - Informational Branding */}
      <div className="hidden lg:flex lg:w-5/12 bg-[var(--color-surface)] border-r border-[var(--color-border)] p-12 flex-col justify-between relative overflow-hidden">
        {/* Abstract Tone */}
        <div className="absolute top-0 left-0 right-0 h-96 bg-gradient-to-b from-[var(--color-primary)]/5 to-transparent pointer-events-none" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-8 h-8 bg-[var(--color-primary)] rounded flex items-center justify-center">
              <span className="text-white font-bold text-lg">S</span>
            </div>
            <span className="text-xl font-medium tracking-wide">Samanvay</span>
          </div>

          <h2 className="text-3xl font-semibold mb-6 leading-tight">
            Humanitarian <br/> Coordination Network
          </h2>
          <p className="text-[var(--color-text-secondary)] max-w-md leading-relaxed text-sm mb-12">
            Secure, reliable infrastructure for coordinating resources, volunteers, and logistics across operational contexts.
          </p>

          {/* Trust Indicators */}
          <div className="space-y-6">
            <div className="flex items-center gap-4 text-sm font-medium text-[var(--color-text-secondary)]">
              <div className="w-10 h-10 rounded-md bg-[var(--color-canvas)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-primary)]">
                <Users className="w-5 h-5" />
              </div>
              Active NGO Network
            </div>
            <div className="flex items-center gap-4 text-sm font-medium text-[var(--color-text-secondary)]">
              <div className="w-10 h-10 rounded-md bg-[var(--color-canvas)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-primary)]">
                <Shield className="w-5 h-5" />
              </div>
              Verified Volunteers
            </div>
            <div className="flex items-center gap-4 text-sm font-medium text-[var(--color-text-secondary)]">
              <div className="w-10 h-10 rounded-md bg-[var(--color-canvas)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-primary)]">
                <Activity className="w-5 h-5" />
              </div>
              Live Coordination Support
            </div>
            <div className="flex items-center gap-4 text-sm font-medium text-[var(--color-text-secondary)]">
              <div className="w-10 h-10 rounded-md bg-[var(--color-canvas)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-primary)]">
                <Package className="w-5 h-5" />
              </div>
              Resource Distribution Coverage
            </div>
          </div>
        </div>

        <div className="relative z-10 mt-12 text-xs text-[var(--color-text-secondary)]/70">
          &copy; {new Date().getFullYear()} Samanvay Open Infrastructure
        </div>
      </div>

      {/* Right Panel - Authentication Flow */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 lg:p-12 relative">
        <div className="w-full max-w-md">
          {/* Mobile Header (Hidden on Desktop) */}
          <div className="lg:hidden flex items-center gap-2 mb-8 justify-center">
            <div className="w-6 h-6 bg-[var(--color-primary)] rounded flex items-center justify-center">
              <span className="text-white font-bold text-xs">S</span>
            </div>
            <span className="font-medium tracking-wide">Samanvay</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-semibold mb-2">{title}</h1>
            <p className="text-sm text-[var(--color-text-secondary)]">{subtitle}</p>
          </div>

          {/* Render the specific auth form card here */}
          {children}
        </div>
      </div>
    </div>
  );
};
