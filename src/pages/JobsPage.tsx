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

type BulkTranslationState = {
  loading: boolean;
  message?: string;
  error?: string;
  progress?: number;
  completed?: number;
  total?: number;
  estimatedSecondsRemaining?: number | null;
};

type FoundationStats = {
  total_foundations: number;
  translated_count: number;
  untranslated_count: number;
  embedded_count: number;
  not_embedded_count: number;
  translation_percentage: number;
  embedding_percentage: number;
  translation_eta_seconds: number;
  embedding_eta_seconds: number;
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

// Helper function to format seconds into human-readable time
const formatTimeRemaining = (seconds: number): string => {
  if (seconds <= 0) return '0 min';

  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes}m`);

  return parts.join(' ');
};

const JobsPage: React.FC = () => {
  const [state, setState] = useState<Record<ActionKey, ActionState>>({
    foundationSync: { loading: false },
    grantSync: { loading: false },
    resetCategories: { loading: false },
    clearDatabase: { loading: false },
    bulkTranslation: { loading: false },
    singleTranslation: { loading: false },
  });

  const [bulkTranslationState, setBulkTranslationState] = useState<BulkTranslationState>({
    loading: false,
  });

  const [foundationId, setFoundationId] = useState('');
  const [forceRetranslate, setForceRetranslate] = useState(false);
  const [testModel, setTestModel] = useState('');
  const [testPrompt, setTestPrompt] = useState('');
  const [foundationStats, setFoundationStats] = useState<FoundationStats | null>(null);

  // Load translation defaults and stats on mount
  const loadStats = async () => {
    try {
      const response = await backendApi.get('/admin/foundation-stats');
      setFoundationStats(response.data);
    } catch (e) {
      console.error('Failed to load foundation stats', e);
    }
  };

  React.useEffect(() => {
    const loadDefaults = async () => {
      try {
        const response = await backendApi.get('/admin/translation-defaults');
        setTestModel(response.data.model || '');
        setTestPrompt(response.data.prompt_template || '');
      } catch (e) {
        console.error('Failed to load translation defaults', e);
      }
    };
    loadDefaults();
    loadStats();
  }, []);

  const formatTimeRemaining = (seconds: number | null | undefined): string => {
    if (seconds === null || seconds === undefined || seconds <= 0) return '';
    if (seconds < 60) return `~${Math.round(seconds)}s kvar`;
    if (seconds < 3600) return `~${Math.round(seconds / 60)}min kvar`;
    const hours = Math.floor(seconds / 3600);
    const mins = Math.round((seconds % 3600) / 60);
    return `~${hours}h ${mins}min kvar`;
  };

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
    setBulkTranslationState({ loading: true, error: undefined });
    try {
      const url = forceRetranslate
        ? '/admin/trigger-bulk-purpose-translation?force=true'
        : '/admin/trigger-bulk-purpose-translation';
      const response = await backendApi.post(url);
      const { task_id } = response.data;

      // Start polling for status
      const pollStatus = async () => {
        try {
          const statusResponse = await backendApi.get(`/admin/bulk-translation-status/${task_id}`);
          const statusData = statusResponse.data;

          if (statusData.status === 'completed' || statusData.status === 'failed') {
            setBulkTranslationState({
              loading: false,
              progress: 100,
              completed: statusData.completed || 0,
              total: statusData.total || 0,
              message: statusData.status === 'completed'
                ? `Färdig! ${statusData.completed} översatta, ${statusData.failed} misslyckades, ${statusData.skipped} hoppades över.`
                : `Fel: ${statusData.error}`,
              estimatedSecondsRemaining: null,
            });
            loadStats(); // Refresh stats after completion
          } else {
            setBulkTranslationState({
              loading: true,
              progress: statusData.progress || 0,
              completed: statusData.completed || 0,
              total: statusData.total || 0,
              estimatedSecondsRemaining: statusData.estimated_remaining_seconds,
            });
            setTimeout(pollStatus, 2000);
          }
        } catch {
          setBulkTranslationState({
            loading: false,
            error: 'Kunde inte hämta status',
          });
        }
      };

      pollStatus();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Okänt fel';
      setBulkTranslationState({
        loading: false,
        error: message,
      });
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
      const params = new URLSearchParams();
      if (testModel.trim()) params.append('model', testModel.trim());
      if (testPrompt.trim()) params.append('prompt', testPrompt.trim());
      const url = `/admin/translate-foundation/${foundationId}${params.toString() ? '?' + params.toString() : ''}`;
      const response = await backendApi.post(url, {}, { timeout: 60000 });
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
            {/* Stats Display */}
            {foundationStats && (
              <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Översättningar</span>
                    <span>{foundationStats.translated_count} / {foundationStats.total_foundations} ({foundationStats.translation_percentage}%)</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${foundationStats.translation_percentage}%` }}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Embeddings</span>
                    <span>{foundationStats.embedded_count} / {foundationStats.total_foundations} ({foundationStats.embedding_percentage}%)</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${foundationStats.embedding_percentage}%` }}
                    />
                  </div>
                </div>
                {/* ETA Display */}
                <div className="text-xs text-muted-foreground pt-2 border-t">
                  {foundationStats.untranslated_count > 0 && (
                    <div>Översättning: ~{formatTimeRemaining(foundationStats.translation_eta_seconds)} kvar</div>
                  )}
                  {foundationStats.not_embedded_count > 0 && (
                    <div>Embeddings: ~{formatTimeRemaining(foundationStats.embedding_eta_seconds)} kvar</div>
                  )}
                </div>
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              Översätter alla stiftelseändamål från äldre/juridisk svenska till modern svenska med Ollama.
            </p>
            <div className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                id="forceRetranslate"
                checked={forceRetranslate}
                onChange={(e) => setForceRetranslate(e.target.checked)}
                className="h-4 w-4"
              />
              <label htmlFor="forceRetranslate" className="text-sm">
                Översätt alla (även redan översatta)
              </label>
            </div>
            <Button
              onClick={triggerBulkTranslation}
              disabled={bulkTranslationState.loading}
            >
              {bulkTranslationState.loading ? 'Översätter...' : 'Starta Översättning'}
            </Button>

            {/* Progress Bar */}
            {bulkTranslationState.loading && bulkTranslationState.total && bulkTranslationState.total > 0 && (
              <div className="space-y-2">
                <div className="w-full bg-muted rounded-full h-3">
                  <div
                    className="bg-primary h-3 rounded-full transition-all duration-300"
                    style={{ width: `${bulkTranslationState.progress || 0}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{bulkTranslationState.completed || 0} / {bulkTranslationState.total} ({(bulkTranslationState.progress || 0).toFixed(1)}%)</span>
                  <span>{formatTimeRemaining(bulkTranslationState.estimatedSecondsRemaining)}</span>
                </div>
              </div>
            )}

            {bulkTranslationState.message && (
              <p className="text-sm text-green-600 dark:text-green-400">{bulkTranslationState.message}</p>
            )}
            {bulkTranslationState.error && (
              <p className="text-sm text-destructive">{bulkTranslationState.error}</p>
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
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">LLM Modell</label>
                <Input
                  placeholder="t.ex. phi3:14b"
                  value={testModel}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTestModel(e.target.value)}
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Prompt (använd {'{purpose}'} som platsmarkering)</label>
                <textarea
                  placeholder="Anpassad prompt..."
                  value={testPrompt}
                  onChange={(e) => setTestPrompt(e.target.value)}
                  className="w-full h-32 p-2 text-xs border rounded resize-y"
                />
              </div>
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

        {/* Embedding Generation Card */}
        <Card>
          <CardHeader>
            <CardTitle>Generera Embeddings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Genererar vektor-embeddings för stiftelser med översatta ändamål. Krävs för semantisk sökning.
            </p>
            <Button
              onClick={async () => {
                setState(prev => ({ ...prev, bulkTranslation: { loading: true } }));
                try {
                  const response = await backendApi.post('/admin/trigger-bulk-embedding-generation');
                  setState(prev => ({
                    ...prev,
                    bulkTranslation: { loading: false, message: `Startad! Task ID: ${response.data.task_id}` }
                  }));
                } catch (error) {
                  setState(prev => ({
                    ...prev,
                    bulkTranslation: { loading: false, error: 'Kunde inte starta embedding-generering' }
                  }));
                }
              }}
            >
              Generera Alla Embeddings
            </Button>
            <p className="text-xs text-muted-foreground">
              OBS: Kör "Översätt Alla Ändamål" först om stiftelserna saknar översättningar.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default JobsPage;

