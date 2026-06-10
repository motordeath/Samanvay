import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../services/auth.service';
import { AuthLayout } from '../components/AuthLayout';

export function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await authService.register({ name, email, password });
      // Store token
      localStorage.setItem('samanvay_token', response.data.token);
      // Temporarily direct to dashboard or onboarding placeholder
      navigate('/onboarding/role-selection');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout 
      title="Register Presence" 
      subtitle="Join the humanitarian coordination network."
    >
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6 sm:p-8">
        <form onSubmit={handleSignup} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--color-text-secondary)]">
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Doe"
              required
              className="w-full bg-[var(--color-canvas)] border border-[var(--color-border)] rounded-md px-3 py-2.5 text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]/50 focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]/50"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--color-text-secondary)]">
              Operational Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="node@organization.org"
              required
              className="w-full bg-[var(--color-canvas)] border border-[var(--color-border)] rounded-md px-3 py-2.5 text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]/50 focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]/50"
            />
          </div>
          
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--color-text-secondary)]">
              Security Key
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full bg-[var(--color-canvas)] border border-[var(--color-border)] rounded-md px-3 py-2.5 text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]/50 focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]/50"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--color-text-secondary)]">
              Confirm Security Key
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full bg-[var(--color-canvas)] border border-[var(--color-border)] rounded-md px-3 py-2.5 text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]/50 focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]/50"
            />
          </div>

          {error && (
            <div className="text-sm text-[var(--color-danger)] bg-[var(--color-danger)]/10 p-3 rounded-md border border-[var(--color-danger)]/20">
              {error}
            </div>
          )}

          <div className="pt-3 flex flex-col gap-3">
            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {isLoading ? 'Registering...' : 'Create Account'}
            </button>
            
            <Link 
              to="/login" 
              className="w-full py-2.5 bg-[var(--color-surface-elevated)] hover:bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] border border-[var(--color-border)] rounded-md font-medium transition-colors text-center"
            >
              Already have an active node? Sign In
            </Link>
          </div>
        </form>
      </div>
    </AuthLayout>
  );
}
