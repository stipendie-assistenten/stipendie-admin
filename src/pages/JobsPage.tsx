import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { backendApi } from '@/lib/api';

type ActionKey = 'foundationSync' | 'grantSync' | 'resetCategories' | 'clearDatabase';

type ActionState = {
  loading: boolean;
  message?: string;
  error?: string;
};

const actions: {
  key: ActionKey;
  label: string;
  description: string;
  endpoint: string;
  confirmText?: string;
}[] = [
  {
    key: 'foundationSync',
    label: 'Sync Foundations',
    description: 'Triggers manual synchronization of foundation data.',
    endpoint: '/admin/trigger-foundation-sync',
  },
  {
    key: 'grantSync',
    label: 'Sync Grants',
    description: 'Triggers grant synchronization (placeholder if not implemented).',
    endpoint: '/admin/trigger-grant-sync',
  },
  {
    key: 'resetCategories',
    label: 'Reset Categories',
    description: 'Resets and recategorizes all foundations.',
    endpoint: '/admin/reset-categories',
  },
  {
    key: 'clearDatabase',
    label: 'Clear Database',
    description: 'Dangerous! Clears foundations, applications, and profiles.',
    endpoint: '/admin/clear-database',
    confirmText: 'Är du SÄKER? Detta rensar databasen och kan inte ångras.',
  },
];

const JobsPage: React.FC = () => {
  const [state, setState] = useState<Record<ActionKey, ActionState>>({
    foundationSync: { loading: false },
    grantSync: { loading: false },
    resetCategories: { loading: false },
    clearDatabase: { loading: false },
  });

  const trigger = async (key: ActionKey, endpoint: string, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;

    setState((prev) => ({ ...prev, [key]: { ...prev[key], loading: true, error: undefined } }));
    try {
      const response = await backendApi.post(endpoint, {}, { timeout: 120000 });
      const data = response.data;
      setState((prev) => ({
        ...prev,
        [key]: {
          loading: false,
          message: typeof data === 'object' ? JSON.stringify(data, null, 2) : String(data),
          error: undefined,
        },
      }));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Okänt fel';
      setState((prev) => ({
        ...prev,
        [key]: { loading: false, error: message },
      }));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Backend Jobs</h1>
        <p className="text-muted-foreground">
          Trigga backend-jobb som synkar stiftelser, grants, kategorisering eller rensar databasen. Åtgärder körs synkront; timeout är satt till ~2 minuter men jobbet kan fortsätta på servern även om klienten bryter.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {actions.map((action) => {
          const actionState = state[action.key];
          return (
            <Card key={action.key}>
              <CardHeader>
                <CardTitle>{action.label}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{action.description}</p>
                <Button
                  onClick={() => trigger(action.key, action.endpoint, action.confirmText)}
                  disabled={actionState?.loading}
                  variant={action.key === 'clearDatabase' ? 'destructive' : 'default'}
                >
                  {actionState?.loading ? 'Kör...' : 'Kör'}
                </Button>
                {actionState?.message && (
                  <pre className="bg-muted text-xs p-3 rounded border overflow-x-auto">
                    {actionState.message}
                  </pre>
                )}
                {actionState?.error && (
                  <p className="text-sm text-destructive">{actionState.error}</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default JobsPage;
