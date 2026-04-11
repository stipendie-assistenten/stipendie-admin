import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { backendApi } from '@/lib/api';
import { JobProgressState } from '@/types/jobs';

interface SyncFoundationsCardProps {
  activeJobId?: string;
  onComplete?: () => void;
}

export const SyncFoundationsCard: React.FC<SyncFoundationsCardProps> = ({ activeJobId, onComplete }) => {
  const [syncState, setSyncState] = useState<JobProgressState>({
    loading: false,
  });

  const formatTimeRemaining = (seconds: number | null | undefined): string => {
    if (seconds === null || seconds === undefined || seconds <= 0) return '';
    if (seconds < 60) return `~${Math.round(seconds)}s kvar`;
    if (seconds < 3600) return `~${Math.round(seconds / 60)}min kvar`;
    const hours = Math.floor(seconds / 3600);
    const mins = Math.round((seconds % 3600) / 60);
    return `~${hours}h ${mins}min kvar`;
  };

  const pollStatus = async (taskId: string) => {
    try {
      const statusResponse = await backendApi.get(`/admin/sync-status/${taskId}`);
      const statusData = statusResponse.data;

      if (statusData.status === 'completed' || statusData.status === 'failed') {
        setSyncState({
          loading: false,
          progress: 100,
          completed: statusData.completed || 0,
          total: statusData.total || 0,
          message: statusData.status === 'completed'
            ? `Färdig! ${statusData.result?.created ?? 0} nya, ${statusData.result?.updated ?? 0} uppdaterade, ${statusData.result?.failed ?? 0} misslyckades.`
            : `Fel: ${statusData.error}`,
          error: statusData.status === 'failed' ? statusData.error : undefined,
          estimatedSecondsRemaining: null,
        });
        if (onComplete) onComplete();
      } else {
        setSyncState({
          loading: true,
          progress: statusData.progress || 0,
          completed: statusData.completed || 0,
          total: statusData.total || 0,
          estimatedSecondsRemaining: statusData.estimated_remaining_seconds,
        });
        setTimeout(() => pollStatus(taskId), 2000);
      }
    } catch {
      setSyncState({
        loading: false,
        error: 'Kunde inte hämta status',
      });
    }
  };

  useEffect(() => {
    if (activeJobId && !syncState.loading) {
      setSyncState((prev) => ({ ...prev, loading: true }));
      pollStatus(activeJobId);
    }
  }, [activeJobId]);

  const triggerFoundationSync = async () => {
    setSyncState({ loading: true, error: undefined });
    try {
      const response = await backendApi.post('/admin/trigger-foundation-sync');
      const { task_id } = response.data;
      pollStatus(task_id);
    } catch (error: any) {
      setSyncState({
        loading: false,
        error: error.message || 'Okänt fel',
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sync Foundations</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Triggers manual synchronization of foundation data from the external API.
        </p>
        <Button onClick={triggerFoundationSync} disabled={syncState.loading}>
          {syncState.loading ? 'Synkar...' : 'Starta Sync'}
        </Button>

        {syncState.loading && syncState.total && syncState.total > 0 && (
          <div className="space-y-2">
            <div className="w-full bg-muted rounded-full h-3">
              <div
                className="bg-primary h-3 rounded-full transition-all duration-300"
                style={{ width: `${syncState.progress || 0}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{syncState.completed || 0} / {syncState.total} ({(syncState.progress || 0).toFixed(1)}%)</span>
              <span>{formatTimeRemaining(syncState.estimatedSecondsRemaining)}</span>
            </div>
          </div>
        )}

        {syncState.message && (
          <p className="text-sm text-green-600 dark:text-green-400">{syncState.message}</p>
        )}
        {syncState.error && (
          <p className="text-sm text-destructive">{syncState.error}</p>
        )}
      </CardContent>
    </Card>
  );
};
