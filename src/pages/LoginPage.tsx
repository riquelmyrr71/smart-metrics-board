import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LoginForm } from '@/components/auth/LoginForm';
import { Building2 } from 'lucide-react';

const LoginPage = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4">
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="p-3 rounded-xl bg-primary text-primary-foreground">
            <Building2 className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">AgencyHub</h1>
        </div>
        <p className="text-muted-foreground">
          Plataforma de Gestão para Agências de Live
        </p>
      </div>
      <LoginForm />
    </div>
  );
};

export default LoginPage;
