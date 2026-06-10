import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthLayout } from '../../auth/components/AuthLayout';

export const OnboardingEntryPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <AuthLayout 
      title="Select Role" 
      subtitle="Choose a starting point. You can always add other contexts later."
    >
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6 sm:p-8 flex flex-col gap-4">
        <button
          onClick={() => navigate('/onboarding/create-organization')}
          className="group text-left p-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-canvas)] hover:bg-[var(--color-surface-muted)] transition-colors flex items-start gap-4"
        >
          <div className="w-10 h-10 rounded border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-center text-[var(--color-text-secondary)] shrink-0 group-hover:text-[var(--color-primary)] transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div>
            <h3 className="font-medium text-[var(--color-text-primary)]">Create Organization</h3>
            <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">Register a new NGO, CSR unit, or community group.</p>
          </div>
        </button>

        <button
          onClick={() => navigate('/onboarding/join-organization')}
          className="group text-left p-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-canvas)] hover:bg-[var(--color-surface-muted)] transition-colors flex items-start gap-4"
        >
          <div className="w-10 h-10 rounded border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-center text-[var(--color-text-secondary)] shrink-0 group-hover:text-[var(--color-primary)] transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div>
            <h3 className="font-medium text-[var(--color-text-primary)]">Join Organization</h3>
            <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">Connect with an existing organization on the platform.</p>
          </div>
        </button>

        <button
          onClick={() => navigate('/onboarding/volunteer')}
          className="group text-left p-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-canvas)] hover:bg-[var(--color-surface-muted)] transition-colors flex items-start gap-4"
        >
          <div className="w-10 h-10 rounded border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-center text-[var(--color-text-secondary)] shrink-0 group-hover:text-[var(--color-primary)] transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <div>
            <h3 className="font-medium text-[var(--color-text-primary)]">Become Volunteer</h3>
            <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">Offer your skills and time to support ongoing initiatives.</p>
          </div>
        </button>
      </div>
    </AuthLayout>
  );
};
