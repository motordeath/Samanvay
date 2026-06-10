import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '../providers/AuthProvider';
import { OnboardingGuard } from './OnboardingGuard';
import { ProtectedRoute } from './ProtectedRoute';

import { ErrorBoundary } from '../../shared/components/ErrorBoundary';

// PUBLIC
import { LandingPage } from '../../modules/landing/pages/LandingPage';

// Auth
import { LoginPage } from '../../modules/auth/pages/LoginPage';
import { SignupPage } from '../../modules/auth/pages/SignupPage';

// Onboarding
import { JoinOrganizationPage } from '../../modules/onboarding/pages/JoinOrganizationPage';
import { OnboardingEntryPage } from '../../modules/onboarding/pages/OnboardingEntryPage';
import { CreateOrganizationPage } from '../../modules/onboarding/pages/CreateOrganizationPage';
import { VolunteerOnboardingPage } from '../../modules/onboarding/pages/VolunteerOnboardingPage';

// Dashboard
import { DashboardResolver } from '../../modules/dashboard/pages/DashboardResolver';
import { DashboardLayout } from '../../modules/dashboard/layouts/DashboardLayout';
import { WorkspaceSelectionScreen } from '../../modules/dashboard/components/WorkspaceSelectionScreen';
import { OverviewPage } from '../../modules/dashboard/pages/OverviewPage';
import { InventoryPage } from '../../modules/dashboard/pages/InventoryPage';
import { InventoryDetailPage } from '../../modules/dashboard/pages/InventoryDetailPage';
import { VolunteersPage } from '../../modules/dashboard/pages/VolunteersPage';
import { ActivityPage } from '../../modules/dashboard/pages/ActivityPage';
import { TransfersPage } from '../../modules/dashboard/pages/TransfersPage';
import { TransferDetailPage } from '../../modules/dashboard/pages/TransferDetailPage';
import { AssignmentsPage } from '../../modules/dashboard/pages/AssignmentsPage';
import { RequestsPage } from '../../modules/dashboard/pages/RequestsPage';
import { RequestDetailPage } from '../../modules/dashboard/pages/RequestDetailPage';

export const AppRouter: React.FC = () => {
  return (
    <AuthProvider>
      <ErrorBoundary>
        <Routes>
          {/* PUBLIC */}
          <Route path="/" element={<LandingPage />} />
        
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        {/* AUTHENTICATED */}
        <Route 
          path="/onboarding" 
          element={
            <ProtectedRoute>
              <OnboardingGuard requireOnboarding>
                <OnboardingEntryPage />
              </OnboardingGuard>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/onboarding/create-organization" 
          element={
            <ProtectedRoute>
              <OnboardingGuard requireOnboarding>
                <CreateOrganizationPage />
              </OnboardingGuard>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/onboarding/join-organization" 
          element={
            <ProtectedRoute>
              <OnboardingGuard requireOnboarding>
                <JoinOrganizationPage />
              </OnboardingGuard>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/onboarding/volunteer" 
          element={
            <ProtectedRoute>
              <OnboardingGuard requireOnboarding>
                <VolunteerOnboardingPage />
              </OnboardingGuard>
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <OnboardingGuard>
                <DashboardResolver />
              </OnboardingGuard>
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/dashboard/*" 
          element={
            <ProtectedRoute>
              <OnboardingGuard>
                <DashboardLayout />
              </OnboardingGuard>
            </ProtectedRoute>
          } 
        >
          <Route path="overview" element={<OverviewPage />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="inventory/:id" element={<InventoryDetailPage />} />
          <Route path="volunteers" element={<VolunteersPage />} />
          <Route path="activity" element={<ActivityPage />} />
          <Route path="transfers" element={<TransfersPage />} />
          <Route path="transfers/:id" element={<TransferDetailPage />} />
          <Route path="assignments" element={<AssignmentsPage />} />
          <Route path="requests" element={<RequestsPage />} />
          <Route path="requests/:id" element={<RequestDetailPage />} />
          <Route path="select-workspace" element={<WorkspaceSelectionScreen />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ErrorBoundary>
    </AuthProvider>
  );
};
