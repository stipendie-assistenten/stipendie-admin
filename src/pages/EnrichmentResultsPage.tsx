import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { backendApi } from '@/lib/api';
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Search,
} from 'lucide-react';

interface EnrichmentResult {
  id: number;
  name: string;
  status: string;
  last_run: string | null;
  error: string | null;
  website_url: string | null;
  application_deadline: string | null;
  application_start: string | null;
  application_method: string | null;
}

const STATUS_FILTERS = ['ALL', 'COMPLETED', 'FAILED', 'PROCESSING', 'PENDING', 'UNPROCESSED', 'NO_VALID_SITE'];

const statusConfig: Record<string, { label: string; icon: React.ReactNode; badgeClass: string }> = {
  COMPLETED: {
    label: 'Klar',
    icon: <CheckCircle className="h-4 w-4 text-green-500" />,
    badgeClass: 'bg-green-100 text-green-800 border-green-200',
  },
  FAILED: {
    label: 'Misslyckades',
    icon: <XCircle className="h-4 w-4 text-red-500" />,
    badgeClass: 'bg-red-100 text-red-800 border-red-200',
  },
  NO_VALID_SITE: {
    label: 'Ingen hemsida',
    icon: <AlertTriangle className="h-4 w-4 text-orange-500" />,
    badgeClass: 'bg-orange-100 text-orange-800 border-orange-200',
  },
  PROCESSING: {
    label: 'Bearbetar',
    icon: <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />,
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  PENDING: {
    label: 'Väntar',
    icon: <Clock className="h-4 w-4 text-yellow-500" />,
    badgeClass: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  },
  UNPROCESSED: {
    label: 'Obehandlad',
    icon: <Clock className="h-4 w-4 text-gray-400" />,
    badgeClass: 'bg-gray-100 text-gray-600 border-gray-200',
  },
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const config = statusConfig[status] ?? {
    label: status,
    icon: null,
    badgeClass: 'bg-gray-100 text-gray-600 border-gray-200',
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.badgeClass}`}
    >
      {config.icon}
      {config.label}
    </span>
  );
};

const ExpandableRow: React.FC<{ result: EnrichmentResult }> = ({ result }) => {
  const [expanded, setExpanded] = useState(false);
  const hasData =
    result.website_url || result.application_deadline || result.application_start || result.application_method;

  return (
    <>
      <tr
        className={`border-b transition-colors hover:bg-muted/30 cursor-pointer ${expanded ? 'bg-muted/20' : ''}`}
        onClick={() => setExpanded(!expanded)}
      >
        <td className="py-3 px-4">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate max-w-xs">{result.name}</span>
          </div>
          <span className="text-[10px] text-muted-foreground font-mono">ID {result.id}</span>
        </td>
        <td className="py-3 px-4">
          <StatusBadge status={result.status} />
        </td>
        <td className="py-3 px-4 text-xs text-muted-foreground">
          {result.last_run ? new Date(result.last_run).toLocaleString('sv-SE') : '—'}
        </td>
        <td className="py-3 px-4">
          {result.website_url ? (
            <a
              href={result.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              Öppna <ExternalLink className="h-3 w-3" />
            </a>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </td>
        <td className="py-3 px-4 text-right">
          {expanded ? <ChevronUp className="h-4 w-4 ml-auto" /> : <ChevronDown className="h-4 w-4 ml-auto" />}
        </td>
      </tr>

      {expanded && (
        <tr className="bg-muted/10 border-b animate-in fade-in slide-in-from-top-1">
          <td colSpan={5} className="px-6 py-4">
            {result.error && (
              <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-700 font-mono">
                <p className="font-semibold mb-1">Felmeddelande:</p>
                <p>{result.error}</p>
              </div>
            )}

            {hasData ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <DataField label="Hemsida" value={result.website_url} isLink />
                <DataField label="Sista ansökningsdag" value={result.application_deadline} />
                <DataField label="Ansökan öppnar" value={result.application_start} />
                <DataField label="Ansökningsmetod" value={result.application_method} />
              </div>
            ) : (
              !result.error && (
                <p className="text-sm text-muted-foreground italic">
                  Ingen data extraherades för denna stiftelse.
                </p>
              )
            )}
          </td>
        </tr>
      )}
    </>
  );
};

const DataField: React.FC<{ label: string; value: string | null; isLink?: boolean }> = ({
  label,
  value,
  isLink,
}) => (
  <div className="space-y-1">
    <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">{label}</p>
    {value ? (
      isLink ? (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-600 hover:underline break-all flex items-center gap-1"
        >
          {value.length > 40 ? value.substring(0, 40) + '…' : value}
          <ExternalLink className="h-3 w-3 flex-shrink-0" />
        </a>
      ) : (
        <p className="text-xs font-medium">{value}</p>
      )
    ) : (
      <p className="text-xs text-muted-foreground italic">Saknas</p>
    )}
  </div>
);

const EnrichmentResultsPage: React.FC = () => {
  const [results, setResults] = useState<EnrichmentResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [limit, setLimit] = useState(50);
  const [search, setSearch] = useState('');
  const [summary, setSummary] = useState<Record<string, number>>({});

  const fetchResults = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { limit };
      if (statusFilter !== 'ALL') params.status = statusFilter;
      const response = await backendApi.get('/admin/enrich/details', { params });
      setResults(response.data.foundations ?? []);
    } catch (e) {
      console.error('Failed to load enrichment results', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const response = await backendApi.get('/admin/enrich/status');
      setSummary(response.data.counts ?? {});
    } catch (e) {
      console.error('Failed to load summary', e);
    }
  };

  useEffect(() => {
    fetchResults();
    fetchSummary();
  }, [statusFilter, limit]);

  const filteredResults = search
    ? results.filter(
        (r) =>
          r.name.toLowerCase().includes(search.toLowerCase()) ||
          r.id.toString().includes(search)
      )
    : results;

  const totalByStatus = Object.entries(summary)
    .sort(([, a], [, b]) => b - a);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Berikningsresultat</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Visa och granska utfallet av berikningspipelinen för alla stiftelser.
        </p>
      </div>

      {/* Summary cards */}
      {totalByStatus.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {totalByStatus.map(([status, count]) => (
            <Card
              key={status}
              className={`cursor-pointer transition-all hover:shadow-md ${
                statusFilter === status ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => setStatusFilter(statusFilter === status ? 'ALL' : status)}
            >
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-1">
                  <StatusBadge status={status} />
                </div>
                <p className="text-2xl font-bold">{count}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Sök på namn eller ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border rounded-md bg-background"
              />
            </div>

            <div className="flex flex-wrap gap-1.5">
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={`px-3 py-1.5 text-xs rounded-full border font-medium transition-colors ${
                    statusFilter === f
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background hover:bg-muted border-input text-muted-foreground'
                  }`}
                >
                  {f === 'ALL' ? 'Alla' : (statusConfig[f]?.label ?? f)}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <select
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="text-xs border rounded-md px-2 py-1.5 bg-background"
              >
                {[25, 50, 100, 200].map((n) => (
                  <option key={n} value={n}>
                    {n} resultat
                  </option>
                ))}
              </select>
              <Button variant="outline" size="sm" onClick={fetchResults} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
                Uppdatera
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results table */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {loading ? 'Laddar...' : `${filteredResults.length} stiftelser`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="py-3 px-4 text-left font-semibold">Stiftelse</th>
                  <th className="py-3 px-4 text-left font-semibold">Status</th>
                  <th className="py-3 px-4 text-left font-semibold">Senast kördes</th>
                  <th className="py-3 px-4 text-left font-semibold">Hemsida</th>
                  <th className="py-3 px-4" />
                </tr>
              </thead>
              <tbody>
                {filteredResults.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-muted-foreground text-sm">
                      {loading ? 'Hämtar data...' : 'Inga resultat hittades.'}
                    </td>
                  </tr>
                ) : (
                  filteredResults.map((r) => <ExpandableRow key={r.id} result={r} />)
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EnrichmentResultsPage;
