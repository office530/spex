import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from '@spex/ui';
import { Hammer } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

interface LocationState {
  from?: { pathname?: string };
}

export function LoginPage() {
  const { t } = useTranslation();
  const { session, signIn, loading } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (session) {
    const state = location.state as LocationState | null;
    return <Navigate to={state?.from?.pathname ?? '/'} replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    const result = await signIn(email, password);
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
    }
  }

  const disabled = submitting || loading;

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      {/* Brand panel — hidden on mobile */}
      <div className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-hero-from to-hero-to text-primary-foreground p-10">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-foreground/15 backdrop-blur">
            <Hammer className="h-5 w-5" />
          </div>
          <div className="text-xl font-bold">{t('app.name')}</div>
        </div>
        <div className="space-y-3 max-w-md">
          <div className="text-3xl font-bold leading-tight">{t('login.title')}</div>
          <p className="text-primary-foreground/80">{t('app.tagline')}</p>
        </div>
        <div className="text-xs text-primary-foreground/60">© {new Date().getFullYear()} Spex</div>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center bg-muted/40 p-4">
        <Card className="w-full max-w-md shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">{t('login.title')}</CardTitle>
            <CardDescription>{t('login.description')}</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t('login.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('login.emailPlaceholder')}
                  disabled={disabled}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t('login.password')}</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={disabled}
                />
              </div>
              {error && (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={disabled}>
                {submitting ? t('login.submitting') : t('login.submit')}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
