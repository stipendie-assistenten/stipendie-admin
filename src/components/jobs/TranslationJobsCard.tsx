import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { backendApi } from '@/lib/api';
import { JobProgressState, ActionState, FoundationStats } from '@/types/jobs';

interface TranslationJobsCardProps {
  activeTranslationJobId?: string;
  activeEmbeddingJobId?: string;
  onComplete?: () => void;
}

export const TranslationJobsCard: React.FC<TranslationJobsCardProps> = ({ 
  activeTranslationJobId, 
  activeEmbeddingJobId,
  onComplete 
}) => {
  const [stats, setStats] = useState<FoundationStats | null>(null);
  const [bulkTranslationState, setBulkTranslationState] = useState<JobProgressState>({ loading: false });
  const [embeddingState, setEmbeddingState] = useState<ActionState>({ loading: false });
  const [singleTranslationState, setSingleTranslationState] = useState<ActionState>({ loading: false });
  
  const [foundationId, setFoundationId] = useState('');
  const [forceRetranslate, setForceRetranslate] = useState(false);
  const [testModel, setTestModel] = useState('');
  const [testPrompt, setTestPrompt] = useState('');

  const loadStats = async () => {
    try {
      const response = await backendApi.get('/admin/foundation-stats');
      setStats(response.data);
    } catch (e) {
      console.error('Failed to load stats', e);
    }
  };

  const loadDefaults = async () => {
    try {
      const response = await backendApi.get('/admin/translation-defaults');
      setTestModel(response.data.model || '');
      setTestPrompt(response.data.prompt_template || '');
    } catch (e) {
      console.error('Failed to load defaults', e);
    }
  };

  useEffect(() => {
    loadStats();
    loadDefaults();
  }, []);

  const formatTimeRemaining = (seconds: number | null | undefined): string => {
    if (seconds === null || seconds === undefined || seconds <= 0) return '';
    if (seconds < 60) return `~${Math.round(seconds)}s kvar`;
    if (seconds < 3600) return `~${Math.round(seconds / 60)}min kvar`;
    const hours = Math.floor(seconds / 3600);
    const mins = Math.round((seconds % 3600) / 60);
    return `~${hours}h ${mins}min kvar`;
  };

  const pollTranslationStatus = async (taskId: string) => {
    try {
      const response = await backendApi.get(`/admin/bulk-translation-status/${taskId}`);
      const data = response.data;

      if (data.status === 'completed' || data.status === 'failed') {
        setBulkTranslationState({
          loading: false,
          progress: 100,
          message: data.status === 'completed' 
            ? `Färdig! ${data.completed} översatta.` 
            : `Fel: ${data.error}`,
        });
        loadStats();
        if (onComplete) onComplete();
      } else {
        setBulkTranslationState({
          loading: true,
          progress: data.progress || 0,
          completed: data.completed,
          total: data.total,
          estimatedSecondsRemaining: data.estimated_remaining_seconds
        });
        setTimeout(() => pollTranslationStatus(taskId), 2000);
      }
    } catch {
      setBulkTranslationState({ loading: false, error: 'Kunde inte hämta status' });
    }
  };

  useEffect(() => {
    if (activeTranslationJobId && !bulkTranslationState.loading) {
      setBulkTranslationState({ loading: true });
      pollTranslationStatus(activeTranslationJobId);
    }
  }, [activeTranslationJobId]);

  const triggerBulkTranslation = async () => {
    setBulkTranslationState({ loading: true });
    try {
      const response = await backendApi.post(`/admin/trigger-bulk-purpose-translation${forceRetranslate ? '?force=true' : ''}`);
      pollTranslationStatus(response.data.task_id);
    } catch (e: any) {
      setBulkTranslationState({ loading: false, error: e.message });
    }
  };

  const triggerEmbeddingGeneration = async () => {
    setEmbeddingState({ loading: true });
    try {
      const response = await backendApi.post('/admin/trigger-bulk-embedding-generation');
      setEmbeddingState({ loading: false, message: `Startad! Task ID: ${response.data.task_id}` });
    } catch {
      setEmbeddingState({ loading: false, error: 'Kunde inte starta' });
    }
  };

  const translateSingle = async () => {
    if (!foundationId) return;
    setSingleTranslationState({ loading: true });
    try {
      const params = new URLSearchParams();
      if (testModel) params.append('model', testModel);
      if (testPrompt) params.append('prompt', testPrompt);
      const response = await backendApi.post(`/admin/translate-foundation/${foundationId}?${params.toString()}`);
      setSingleTranslationState({ loading: false, message: JSON.stringify(response.data, null, 2) });
    } catch (e: any) {
      setSingleTranslationState({ loading: false, error: e.message });
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Översätt Alla Ändamål</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {stats && (
            <div className="space-y-3 p-3 bg-muted/50 rounded-lg text-sm">
              <div className="flex justify-between">
                <span>Översättningar</span>
                <span>{stats.translated} / {stats.total_foundations} ({stats.translation_percentage}%)</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-primary h-2 rounded-full" style={{ width: `${stats.translation_percentage}%` }} />
              </div>
            </div>
          )}
          <div className="flex items-center gap-2">
            <input type="checkbox" id="forceTrans" checked={forceRetranslate} onChange={e => setForceRetranslate(e.target.checked)} />
            <label htmlFor="forceTrans" className="text-sm">Tvinga om-översättning</label>
          </div>
          <Button onClick={triggerBulkTranslation} disabled={bulkTranslationState.loading}>
            {bulkTranslationState.loading ? 'Översätter...' : 'Starta Översättning'}
          </Button>
          {bulkTranslationState.loading && (
             <div className="text-xs text-muted-foreground">
               Progress: {bulkTranslationState.progress?.toFixed(1)}% {formatTimeRemaining(bulkTranslationState.estimatedSecondsRemaining)}
             </div>
          )}
          {bulkTranslationState.message && <p className="text-sm text-green-600">{bulkTranslationState.message}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Generera Embeddings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 font-sm">
          {stats && (
            <div className="space-y-1">
               <div className="flex justify-between text-sm">
                 <span>Embeddings</span>
                 <span>{stats.embedded} / {stats.total_foundations} ({stats.embedding_percentage}%)</span>
               </div>
               <div className="w-full bg-muted rounded-full h-2">
                 <div className="bg-green-500 h-2 rounded-full" style={{ width: `${stats.embedding_percentage}%` }} />
               </div>
            </div>
          )}
          <Button onClick={triggerEmbeddingGeneration} disabled={embeddingState.loading}>Starta</Button>
          {embeddingState.message && <p className="text-sm text-green-600">{embeddingState.message}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Testa Översättning</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="Modell" value={testModel} onChange={e => setTestModel(e.target.value)} />
          <textarea className="w-full h-24 p-2 text-xs border rounded" value={testPrompt} onChange={e => setTestPrompt(e.target.value)} />
          <div className="flex gap-2">
            <Input placeholder="ID" value={foundationId} onChange={e => setFoundationId(e.target.value)} />
            <Button onClick={translateSingle} disabled={singleTranslationState.loading}>Testa</Button>
          </div>
          {singleTranslationState.message && <pre className="text-xs p-2 bg-muted rounded overflow-auto max-h-40">{singleTranslationState.message}</pre>}
        </CardContent>
      </Card>
    </div>
  );
};
