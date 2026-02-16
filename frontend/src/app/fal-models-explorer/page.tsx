'use client';

/**
 * fal.ai Models Explorer
 * Simple page to explore fal.ai models API in real-time
 */

import { useState } from 'react';
import { Loader2, Search, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function FalModelsExplorer() {
  const [apiKey, setApiKey] = useState('');
  const [category, setCategory] = useState('');
  const [query, setQuery] = useState('');
  const [expandOpenApi, setExpandOpenApi] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFetch = async () => {
    if (!apiKey.trim()) {
      setError('API Key é obrigatória');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResponse(null);

    try {
      // Build URL with query params
      const params = new URLSearchParams();
      if (category) params.append('category', category);
      if (query) params.append('q', query);
      if (expandOpenApi) params.append('expand', 'openapi-3.0');

      const url = `https://api.fal.ai/v1/models${params.toString() ? `?${params.toString()}` : ''}`;

      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Key ${apiKey.trim()}`,
        },
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      setResponse(data);
    } catch (err: any) {
      setError(err.message || 'Erro ao buscar modelos');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 dark:from-gray-950 dark:via-blue-950/20 dark:to-purple-950/10 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            fal.ai Models Explorer
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Explore modelos disponíveis na API do fal.ai em tempo real
          </p>
          <a
            href="https://docs.fal.ai/llms.txt"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline mt-2"
          >
            Ver documentação <ExternalLink className="w-4 h-4" />
          </a>
        </div>

        {/* Form */}
        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6 shadow-lg mb-6">
          <div className="grid gap-6">
            {/* API Key */}
            <div>
              <Label htmlFor="apiKey" className="text-sm font-medium mb-2">
                API Key (obrigatório)
              </Label>
              <Input
                id="apiKey"
                type="password"
                placeholder="fal-..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="bg-white/50 dark:bg-gray-900/50 border-gray-200/50 dark:border-gray-700/50"
              />
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="category" className="text-sm font-medium mb-2">
                  Category (opcional)
                </Label>
                <Input
                  id="category"
                  placeholder="text-to-image, image-to-image..."
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="bg-white/50 dark:bg-gray-900/50 border-gray-200/50 dark:border-gray-700/50"
                />
              </div>

              <div>
                <Label htmlFor="query" className="text-sm font-medium mb-2">
                  Search Query (opcional)
                </Label>
                <Input
                  id="query"
                  placeholder="inpaint, edit, flux..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="bg-white/50 dark:bg-gray-900/50 border-gray-200/50 dark:border-gray-700/50"
                />
              </div>

              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={expandOpenApi}
                    onChange={(e) => setExpandOpenApi(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 dark:border-gray-700"
                  />
                  <span className="text-sm font-medium">
                    Expandir OpenAPI 3.0
                  </span>
                </label>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              onClick={handleFetch}
              disabled={isLoading || !apiKey.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Buscando...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Buscar Modelos
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <p className="text-red-800 dark:text-red-400 font-medium">
              Erro: {error}
            </p>
          </div>
        )}

        {/* Response */}
        {response && (
          <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Resposta da API
              </h2>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {response.models?.length || 0} modelos encontrados
              </span>
            </div>

            {/* JSON Response */}
            <div className="bg-gray-900 dark:bg-black rounded-lg p-4 overflow-auto max-h-[600px]">
              <pre className="text-xs text-green-400 font-mono">
                {JSON.stringify(response, null, 2)}
              </pre>
            </div>

            {/* Quick Stats */}
            {response.models && (
              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                  <p className="text-xs text-gray-600 dark:text-gray-400">Total Modelos</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {response.models.length}
                  </p>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
                  <p className="text-xs text-gray-600 dark:text-gray-400">Has More</p>
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {response.has_more ? 'Sim' : 'Não'}
                  </p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                  <p className="text-xs text-gray-600 dark:text-gray-400">Next Cursor</p>
                  <p className="text-sm font-mono text-green-600 dark:text-green-400 truncate">
                    {response.next_cursor || 'N/A'}
                  </p>
                </div>
                <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3">
                  <p className="text-xs text-gray-600 dark:text-gray-400">Providers</p>
                  <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    {new Set(response.models.map((m: any) => m.endpoint_id?.split('/')[0])).size}
                  </p>
                </div>
              </div>
            )}

            {/* Models Summary */}
            {response.models && response.models.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  Modelos Encontrados
                </h3>
                <div className="space-y-2 max-h-96 overflow-auto">
                  {response.models.map((model: any, idx: number) => (
                    <div
                      key={idx}
                      className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <p className="font-mono text-sm text-blue-600 dark:text-blue-400">
                            {model.endpoint_id}
                          </p>
                          <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                            {model.display_name}
                          </p>
                          {model.description && (
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                              {model.description}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {model.category && (
                            <span className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded">
                              {model.category}
                            </span>
                          )}
                          {model.status && (
                            <span className={`text-xs px-2 py-1 rounded ${
                              model.status === 'active'
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                            }`}>
                              {model.status}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
