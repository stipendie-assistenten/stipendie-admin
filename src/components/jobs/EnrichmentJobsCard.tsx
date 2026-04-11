import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { backendApi } from '@/lib/api';
import { EnrichmentStatus, EnrichmentDetail } from '@/types/jobs';

export const EnrichmentJobsCard: React.FC = () => {
  const [status, setStatus] = useState<EnrichmentStatus | null>(null);
  const [details, setDetails] = useState<EnrichmentDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const [foundationId, setFoundationId] = useState('');
  const [prompt, setPrompt] = useState('');
  const [forceSearch, setForceSearch] = useState(false);
  const [singleResult, setSingleResult] = useState<any>(null);

  const loadStatus = async () => {
    try {
      const response = await backendApi.get('/admin/enrich/status');
      setStatus(response.data);
    } catch (e) {
      console.error('Failed to load status', e);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const triggerEnrichment = async () => {
    setLoading(true);
    try {
      const response = await backendApi.post('/admin/enrich/start');
      setMessage(`Startad! ${response.data.enqueued} i kö.`);
      setTimeout(loadStatus, 2000);
    } catch {
      setMessage('Fel vid start');
    } finally {
      setLoading(false);
    }
  };

  const testSingle = async () => {
    if (!foundationId) return;
    setLoading(true);
    setSingleResult(null);
    try {
      const params = new URLSearchParams();
      if (prompt) params.append('custom_prompt', prompt);
      if (forceSearch) params.append('force_search', 'true');
      const response = await backendApi.post(`/admin/enrich/foundation/${foundationId}?${params.toString()}`);
      setSingleResult(response.data);
      loadStatus();
    } catch (e: any) {
      setSingleResult({ error: e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>Berikning (Pipeline)</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {status && (
            <div className="space-y-2 p-3 bg-muted/50 rounded-lg text-sm">
              <div className="flex justify-between">
                <span>Klara</span>
                <span className="text-green-600 font-medium">{status.counts.COMPLETED || 0} ({status.completed_percentage}%)</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: `${status.completed_percentage}%` }} />
              </div>
            </div>
          )}
          <div className="flex gap-2">
            <Button onClick={triggerEnrichment} disabled={loading}>Starta</Button>
            <Button variant="outline" onClick={loadStatus}>Uppdatera</Button>
          </div>
          {message && <p className="text-sm text-green-600">{message}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Testa Berikning</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <textarea className="w-full h-24 p-2 text-xs border rounded" placeholder="Prompt" value={prompt} onChange={e => setPrompt(e.target.value)} />
          <div className="flex items-center gap-2">
            <input type="checkbox" id="forceS" checked={forceSearch} onChange={e => setForceSearch(e.target.checked)} />
            <label htmlFor="forceS" className="text-sm">Forcera sök</label>
          </div>
          <div className="flex gap-2">
            <Input placeholder="ID" value={foundationId} onChange={e => setFoundationId(e.target.value)} />
            <Button onClick={testSingle} disabled={loading}>Testa</Button>
          </div>
          {singleResult && (
            <div className="mt-4 space-y-2">
              <h4 className="text-sm font-semibold">Resultat:</h4>
              <pre className="text-xs p-2 bg-muted rounded overflow-auto max-h-60">
                {JSON.stringify(singleResult, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
