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
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

export function LoginPage() {
  const { t } = useTranslation();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>{t('login.title')}</CardTitle>
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
                disabled
                placeholder={t('login.emailPlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('login.password')}</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                disabled
              />
            </div>
            <p className="text-xs text-muted-foreground">{t('login.notReady')}</p>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled>
              {t('login.submit')}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
