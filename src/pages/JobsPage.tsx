import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { backendApi } from '@/lib/api';

type ActionKey = 'foundationSync' | 'grantSync' | 'resetCategories' | 'clearDatabase' | 'bulkTranslation' | 'singleTranslation';

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
    bulkTranslation: { loading: false },
    singleTranslation: { loading: false },
  });

  const [foundationId, setFoundationId] = useState('');

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

  const triggerBulkTranslation = async () => {
    setState((prev) => ({ ...prev, bulkTranslation: { loading: true, error: undefined } }));
    try {
      const response = await backendApi.post('/admin/trigger-bulk-purpose-translation');
      const { task_id } = response.data;
      // Task started with ID: task_id

      // Start polling for status
      const pollStatus = async () => {
        try {
          const statusResponse = await backendApi.get(`/admin/bulk-translation-status/${task_id}`);
          const statusData = statusResponse.data;

          const statusMessage = `Status: ${statusData.status}\nProgress: ${statusData.progress?.toFixed(1) || 0}%\nCompleted: ${statusData.completed || 0}\nFailed: ${statusData.failed || 0}\nSkipped: ${statusData.skipped || 0}`;

          if (statusData.status === 'completed' || statusData.status === 'failed') {
            setState((prev) => ({
              ...prev,
              bulkTranslation: { loading: false, message: statusMessage }
            }));
            // Task completed
          } else {
            setState((prev) => ({
              ...prev,
              bulkTranslation: { loading: true, message: statusMessage }
            }));
            setTimeout(pollStatus, 2000);
          }
        } catch {
          setState((prev) => ({
            ...prev,
            bulkTranslation: { loading: false, error: 'Failed to get status' }
          }));
        }
      };

      pollStatus();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Okänt fel';
      setState((prev) => ({
        ...prev,
        bulkTranslation: { loading: false, error: message },
      }));
    }
  };

  const translateSingleFoundation = async () => {
    if (!foundationId.trim()) {
      setState((prev) => ({
        ...prev,
        singleTranslation: { loading: false, error: 'Ange ett stiftelse-ID' },
      }));
      return;
    }

    setState((prev) => ({ ...prev, singleTranslation: { loading: true, error: undefined } }));
    try {
      const response = await backendApi.post(`/admin/translate-foundation/${foundationId}`, {}, { timeout: 60000 });
      const data = response.data;
      setState((prev) => ({
        ...prev,
        singleTranslation: {
          loading: false,
          message: JSON.stringify(data, null, 2),
          error: undefined,
        },
      }));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Okänt fel';
      setState((prev) => ({
        ...prev,
        singleTranslation: { loading: false, error: message },
      }));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Backend Jobs</h1>
        <p className="text-muted-foreground">
          Trigga backend-jobb som synkar stiftelser, grants, kategorisering eller rensar databasen.
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
                  <pre className="bg-muted text-xs p-3 rounded border overflow-x-auto whitespace-pre-wrap">
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

        {/* Bulk Translation Card */}
        <Card>
          <CardHeader>
            <CardTitle>Översätt Alla Ändamål</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Översätter alla stiftelseändamål från äldre/juridisk svenska till modern svenska med Ollama.
            </p>
            <Button
              onClick={triggerBulkTranslation}
              disabled={state.bulkTranslation?.loading}
            >
              {state.bulkTranslation?.loading ? 'Översätter...' : 'Starta Översättning'}
            </Button>
            {state.bulkTranslation?.message && (
              <pre className="bg-muted text-xs p-3 rounded border overflow-x-auto whitespace-pre-wrap">
                {state.bulkTranslation.message}
              </pre>
            )}
            {state.bulkTranslation?.error && (
              <p className="text-sm text-destructive">{state.bulkTranslation.error}</p>
            )}
          </CardContent>
        </Card>

        {/* Single Foundation Translation Card */}
        <Card>
          <CardHeader>
            <CardTitle>Testa Översättning</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Översätt en enskild stiftelses ändamål för att testa innan bulk-översättning.
            </p>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Stiftelse-ID"
                value={foundationId}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFoundationId(e.target.value)}
                className="w-32"
              />
              <Button
                onClick={translateSingleFoundation}
                disabled={state.singleTranslation?.loading}
              >
                {state.singleTranslation?.loading ? 'Översätter...' : 'Översätt'}
              </Button>
            </div>
            {state.singleTranslation?.message && (
              <pre className="bg-muted text-xs p-3 rounded border overflow-x-auto whitespace-pre-wrap max-h-64 overflow-y-auto">
                {state.singleTranslation.message}
              </pre>
            )}
            {state.singleTranslation?.error && (
              <p className="text-sm text-destructive">{state.singleTranslation.error}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default JobsPage;

