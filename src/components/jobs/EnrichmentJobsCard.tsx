import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { backendApi } from '@/lib/api';
import { EnrichmentStatus, FoundationSearchResult, EnrichmentDefaults } from '@/types/jobs';

export const EnrichmentJobsCard: React.FC = () => {
  const [status, setStatus] = useState<EnrichmentStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [foundationId, setFoundationId] = useState('');
  const [forceSearch, setForceSearch] = useState(false);
  const [singleResult, setSingleResult] = useState<any>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FoundationSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Prompts state
  const [prompts, setPrompts] = useState<EnrichmentDefaults>({
    validation_system_prompt: '',
    validation_user_prompt: '',
    extraction_system_prompt: '',
    extraction_user_prompt: '',
    model: ''
  });

  const loadStatus = async () => {
    try {
      const response = await backendApi.get('/admin/enrich/status');
      setStatus(response.data);
    } catch (e) {
      console.error('Failed to load status', e);
    }
  };

  const loadDefaults = async () => {
    try {
      const response = await backendApi.get('/admin/enrich/defaults');
      setPrompts(response.data);
    } catch (e) {
      console.error('Failed to load defaults', e);
    }
  };

  useEffect(() => {
    loadStatus();
    loadDefaults();
  }, []);

  // Search logic with 3-character threshold and debounce
  useEffect(() => {
    if (searchQuery.length < 3) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await backendApi.get(`/admin/foundations/search?q=${encodeURIComponent(searchQuery)}`);
        setSearchResults(response.data);
      } catch (e) {
        console.error('Search failed', e);
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const selectFoundation = (f: FoundationSearchResult) => {
    setFoundationId(f.id.toString());
    setSearchQuery(f.name);
    setSearchResults([]);
  };

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
    setMessage('');
    try {
      const response = await backendApi.post(`/admin/enrich/foundation/${foundationId}`, {
        force_search: forceSearch,
        validation_sys_prompt: prompts.validation_system_prompt,
        validation_usr_prompt: prompts.validation_user_prompt,
        extraction_sys_prompt: prompts.extraction_system_prompt,
        extraction_usr_prompt: prompts.extraction_user_prompt
      });
      
      if (response.data.status === 'enqueued') {
        setMessage(`Jobb köat (ID: ${response.data.job_id.substring(0, 8)}...). Se status nedan.`);
        // Periodically refresh status to show it moving to PROCESSING/COMPLETED
        const interval = setInterval(async () => {
          await loadStatus();
        }, 3000);
        setTimeout(() => clearInterval(interval), 30000);
      } else {
        setSingleResult(response.data);
      }
      loadStatus();
    } catch (e: any) {
      setSingleResult({ error: e.message });
      setMessage('Fel vid test-körning');
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
            <Button onClick={triggerEnrichment} disabled={loading}>Starta Bulk</Button>
            <Button variant="outline" onClick={loadStatus}>Uppdatera</Button>
          </div>
          {message && <p className="text-sm text-green-600 font-medium">{message}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Testa & Justera Prompts</CardTitle></CardHeader>
        <CardContent className="space-y-4 text-xs">
          <div className="space-y-2 relative">
            <label className="font-semibold block uppercase tracking-wider text-[10px] text-muted-foreground">Sök Stiftelse</label>
            <Input 
              placeholder="Sök på namn (min 3 tecken)..." 
              value={searchQuery} 
              onChange={e => setSearchQuery(e.target.value)}
              className="text-sm"
            />
            {isSearching && <div className="absolute right-3 top-8 text-[10px] animate-pulse">Söker...</div>}
            {searchResults.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-auto">
                {searchResults.map(f => (
                  <button
                    key={f.id}
                    onClick={() => selectFoundation(f)}
                    className="w-full text-left p-2 hover:bg-muted text-xs truncate"
                  >
                    <span className="font-medium">{f.name}</span>
                    <span className="ml-2 text-muted-foreground">({f.orgnr})</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-4 border-r pr-4">
              <h4 className="font-bold text-primary">1. VALIDERINGS-STEG</h4>
              <div className="space-y-1">
                <label className="text-muted-foreground">System Prompt</label>
                <textarea 
                  className="w-full h-32 p-2 border rounded font-mono bg-muted/30" 
                  value={prompts.validation_system_prompt} 
                  onChange={e => setPrompts(prev => ({ ...prev, validation_system_prompt: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-muted-foreground">User Prompt</label>
                <textarea 
                  className="w-full h-32 p-2 border rounded font-mono bg-muted/30" 
                  value={prompts.validation_user_prompt} 
                  onChange={e => setPrompts(prev => ({ ...prev, validation_user_prompt: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-bold text-primary">2. EXTRAKTIONS-STEG</h4>
              <div className="space-y-1">
                <label className="text-muted-foreground">System Prompt</label>
                <textarea 
                  className="w-full h-32 p-2 border rounded font-mono bg-muted/30" 
                  value={prompts.extraction_system_prompt} 
                  onChange={e => setPrompts(prev => ({ ...prev, extraction_system_prompt: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-muted-foreground">User Prompt</label>
                <textarea 
                  className="w-full h-32 p-2 border rounded font-mono bg-muted/30" 
                  value={prompts.extraction_user_prompt} 
                  onChange={e => setPrompts(prev => ({ ...prev, extraction_user_prompt: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <input type="checkbox" id="testForce" checked={forceSearch} onChange={e => setForceSearch(e.target.checked)} />
                <label htmlFor="testForce" className="text-sm">Forcera ny sökning</label>
              </div>
              <div className="text-muted-foreground">ID: <span className="text-foreground font-mono">{foundationId || '-'}</span></div>
            </div>
            <Button onClick={testSingle} disabled={loading || !foundationId} size="lg">Testa Pipeline</Button>
          </div>

          {singleResult && (
            <div className="mt-4 space-y-2 animate-in fade-in slide-in-from-top-2">
              <h4 className="text-sm font-semibold">Resultat:</h4>
              <pre className="text-[10px] p-3 bg-slate-950 text-slate-50 rounded-lg overflow-auto max-h-[400px]">
                {JSON.stringify(singleResult, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
