import { useState, useEffect, useMemo } from 'react'
import { Plus, Sparkles, TrendingUp, TrendingDown, Minus, Search, Loader2, Star } from 'lucide-react'
import { Modal, Button, Input, SearchableSelect, Alert, DataTable } from '@/shared/components'
import type { FilterableColumn } from '@/shared/components/DataTable'
import { COUNTRIES, LANGUAGES } from '@/shared/constants'
import styles from './KeywordMiningModal.module.css'
import { useBulkCreateKeywordsWithData, useMineKeywords, type MiningResult as APIMiningResult } from '../api/mutations'
import { useGeoTargetCountries, useGoogleLanguages } from '../api/useKeywords'
import type { ColumnDef } from '@tanstack/react-table'

interface KeywordMiningModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

interface MiningResult extends APIMiningResult {
  isExactMatch: boolean
}

export function KeywordMiningModal({ isOpen, onClose, onSuccess }: KeywordMiningModalProps) {
  const [country, setCountry] = useState('BR')
  const [language, setLanguage] = useState('pt')
  const [seedKeyword, setSeedKeyword] = useState('')
  const [results, setResults] = useState<MiningResult[]>([])
  const [selectedKeywords, setSelectedKeywords] = useState<Set<string>>(new Set())
  const [turboMode, setTurboMode] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const bulkCreateMutation = useBulkCreateKeywordsWithData()
  const mineMutation = useMineKeywords()

  // Fetch countries and languages from Supabase (same source as AlvoAds Google)
  const { data: dbCountries, isLoading: loadingCountries } = useGeoTargetCountries()
  const { data: dbLanguages, isLoading: loadingLanguages } = useGoogleLanguages()

  // Use database data if available, fallback to static constants
  const countryOptions = useMemo(() => {
    if (dbCountries && dbCountries.length > 0) {
      return dbCountries
    }
    return [...COUNTRIES]
  }, [dbCountries])

  const languageOptions = useMemo(() => {
    if (dbLanguages && dbLanguages.length > 0) {
      return dbLanguages
    }
    return [...LANGUAGES]
  }, [dbLanguages])

  const isMining = mineMutation.isPending

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSeedKeyword('')
      setResults([])
      setSelectedKeywords(new Set())
      setError(null)
      setTurboMode(false)
      mineMutation.reset()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  const handleMine = async (useAiSuggestion = false) => {
    // For AI suggestion, keyword can be empty
    // For manual mining, keyword is required
    if (!useAiSuggestion && !seedKeyword.trim()) return

    setError(null)

    try {
      const searchTerm = useAiSuggestion ? '' : seedKeyword.trim().toLowerCase()

      const response = await mineMutation.mutateAsync({
        keyword: searchTerm,
        country,
        language,
      })

      // Transform API results to include exact match flag
      // All keywords start unselected - user must explicitly select
      const resultsWithExactMatch: MiningResult[] = response.keywords.map((kw) => ({
        ...kw,
        isExactMatch: kw.keyword.toLowerCase() === searchTerm.toLowerCase(),
      }))

      // Reset selections when new results arrive
      setSelectedKeywords(new Set())

      // Sort: exact match first, then by search_volume descending
      resultsWithExactMatch.sort((a, b) => {
        // Exact match always comes first
        if (a.isExactMatch && !b.isExactMatch) return -1
        if (!a.isExactMatch && b.isExactMatch) return 1
        // Then sort by search volume (highest first)
        return b.search_volume - a.search_volume
      })

      setResults(resultsWithExactMatch)
    } catch (err) {
      console.error('Mining error:', err)
      setError(err instanceof Error ? err.message : 'Erro ao minerar palavras-chave. Tente novamente.')
    }
  }


  const handleSave = async () => {
    if (selectedKeywords.size === 0) return

    // Filter results by selected keywords
    const selectedResults = results.filter((r) => selectedKeywords.has(r.keyword))

    // Map mining results to CreateKeywordInput format with all data
    const keywordsToCreate = selectedResults.map((r) => ({
      word: r.keyword,
      search_volume: r.search_volume,
      cpc_min: r.cpc_min,
      cpc_max: r.cpc_max,
      language,
      country,
    }))

    await bulkCreateMutation.mutateAsync(keywordsToCreate)
    handleClose()
    onSuccess?.()
  }

  const handleClose = () => {
    setSeedKeyword('')
    setResults([])
    setSelectedKeywords(new Set())
    setError(null)
    mineMutation.reset()
    onClose()
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('pt-BR').format(num)
  }

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
    }).format(num)
  }

  const selectedCount = selectedKeywords.size

  const getQualityIcon = (quality: 'high' | 'medium' | 'low') => {
    switch (quality) {
      case 'high':
        return <TrendingUp size={16} className={styles.qualityHigh} />
      case 'medium':
        return <Minus size={16} className={styles.qualityMedium} />
      case 'low':
        return <TrendingDown size={16} className={styles.qualityLow} />
    }
  }

  // Filter results based on turbo mode - memoized to prevent unnecessary re-renders
  // Turbo 10x criteria: volume > 1000, cpc_min < 0.10, discrepancy > 10
  const displayResults = useMemo(() => {
    const filteredResults = turboMode
      ? results.filter(r =>
          r.search_volume > 1000 &&
          r.cpc_min < 0.10 &&
          r.discrepancy > 10
        )
      : results

    // Separate exact match from other results to ensure it's always first
    const exactMatchResult = filteredResults.find(r => r.isExactMatch)
    const otherResults = filteredResults.filter(r => !r.isExactMatch)

    // Combine for display - exact match always first
    return exactMatchResult
      ? [exactMatchResult, ...otherResults]
      : otherResults
  }, [results, turboMode])

  // Handle selection from DataTable
  const handleRowSelection = (selectedRows: MiningResult[]) => {
    setSelectedKeywords(new Set(selectedRows.map(r => r.keyword)))
  }

  // Define columns for DataTable
  const columns: Array<ColumnDef<MiningResult, unknown>> = useMemo(() => [
    {
      id: 'quality',
      header: () => <span title="Indicador de oportunidade">📊</span>,
      cell: ({ row }) => getQualityIcon(row.original.quality),
      size: 48,
      enableSorting: false,
    },
    {
      accessorKey: 'keyword',
      header: 'Palavra-Chave',
      cell: ({ row }) => (
        <div className={`${styles.keywordCell} ${row.original.isExactMatch ? styles.exactMatchCell : ''}`}>
          {row.original.isExactMatch && <Star size={14} className={styles.exactMatchIcon} />}
          {row.original.keyword}
        </div>
      ),
      enableSorting: true,
    },
    {
      accessorKey: 'search_volume',
      header: 'Pesquisas/mês',
      cell: ({ row }) => (
        <span className={row.original.search_volume > 500000 ? styles.highVolume : ''}>
          {formatNumber(row.original.search_volume)}
        </span>
      ),
      enableSorting: true,
    },
    {
      accessorKey: 'cpc_min',
      header: 'CPC Min',
      cell: ({ row }) => formatCurrency(row.original.cpc_min),
      enableSorting: true,
    },
    {
      accessorKey: 'cpc_max',
      header: 'CPC Máx',
      cell: ({ row }) => formatCurrency(row.original.cpc_max),
      enableSorting: true,
    },
    {
      accessorKey: 'discrepancy',
      header: 'Discrepância',
      cell: ({ row }) => (
        <span className={`${styles.discrepancy} ${row.original.discrepancy > 10 ? styles.highDiscrepancy : row.original.discrepancy < 3 ? styles.lowDiscrepancy : ''}`}>
          {row.original.discrepancy}x
        </span>
      ),
      enableSorting: true,
    },
  ], [])

  // Define filterable columns configuration
  const filterableColumns: FilterableColumn[] = useMemo(() => [
    { id: 'keyword', type: 'text', label: 'Palavra-Chave' },
    { id: 'search_volume', type: 'number', label: 'Pesquisas/mês' },
    { id: 'cpc_min', type: 'number', label: 'CPC Min' },
    { id: 'cpc_max', type: 'number', label: 'CPC Máx' },
    { id: 'discrepancy', type: 'number', label: 'Discrepância' },
  ], [])

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Mineração 10x ⚡" size="xl">
      <div className={styles.container}>

        {/* Step 1: Country and Language */}
        <div className={styles.step}>
          <p className={styles.stepLabel}>
            <span className={styles.stepNumber}>1</span>
            País e idioma da pesquisa
          </p>
          <div className={styles.stepRow}>
            <div className={styles.countrySelect}>
              <SearchableSelect
                options={countryOptions}
                value={country}
                onChange={setCountry}
                placeholder={loadingCountries ? 'Carregando países...' : 'Selecione o país'}
                searchPlaceholder="Buscar país..."
                fullWidth
              />
            </div>
            <div className={styles.languageSelect}>
              <SearchableSelect
                options={languageOptions}
                value={language}
                onChange={setLanguage}
                placeholder={loadingLanguages ? 'Carregando idiomas...' : 'Selecione o idioma'}
                searchPlaceholder="Buscar idioma..."
                fullWidth
              />
            </div>
          </div>
        </div>

        {/* Step 2: Keyword Input */}
        <div className={styles.step}>
          <p className={styles.stepLabel}>
            <span className={styles.stepNumber}>2</span>
            Palavra-chave semente
          </p>
          <div className={styles.miningRow}>
            <div className={styles.inputWrapper}>
              <Search size={18} className={styles.inputIcon} />
              <Input
                value={seedKeyword}
                onChange={(e) => setSeedKeyword(e.target.value)}
                placeholder="Ex: celular, notebook, receitas..."
                className={styles.keywordInput}
                onKeyDown={(e) => e.key === 'Enter' && seedKeyword.trim() && handleMine(false)}
              />
            </div>
            <button
              className={styles.aiButton}
              title="Sugestão com IA (gera palavras-chave automaticamente)"
              onClick={() => handleMine(true)}
              disabled={isMining || !country || !language}
            >
              {isMining && !seedKeyword.trim() ? (
                <Loader2 size={20} className={styles.spinning} />
              ) : (
                <Sparkles size={20} />
              )}
            </button>
            <Button
              variant="primary"
              leftIcon={isMining ? <Loader2 size={18} className={styles.spinning} /> : <Search size={18} />}
              onClick={() => handleMine(false)}
              disabled={isMining || !seedKeyword.trim() || !country || !language}
            >
              {isMining ? 'Minerando...' : 'Minerar'}
            </Button>
          </div>

          {/* Turbo Mode Toggle */}
          <div className={styles.turboRow}>
            <span>Técnica Turbo Mineração 10x</span>
            <span className={styles.turboEmoji}>🎯</span>
            <span className={styles.toggle}>
              <input
                type="checkbox"
                checked={turboMode}
                onChange={(e) => setTurboMode(e.target.checked)}
                aria-label="Ativar técnica Turbo Mineração 10x"
              />
              <span className={styles.toggleSlider} />
            </span>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <Alert variant="error">
            {error}
          </Alert>
        )}

        {/* Loading State */}
        {isMining && (
          <div className={styles.loadingSection}>
            <div className={styles.loadingSpinner}>
              <Loader2 size={32} className={styles.spinning} />
            </div>
            <p className={styles.loadingText}>Analisando palavras-chave...</p>
            <p className={styles.loadingSubtext}>Buscando volume de pesquisa, CPC e oportunidades</p>
          </div>
        )}

        {/* Results Table */}
        {!isMining && results.length > 0 && (
          <div className={styles.resultsSection}>
            <div className={styles.resultsHeader}>
              <h3 className={styles.resultsTitle}>
                Resultados encontrados
                <span className={styles.resultsCount}>
                  {turboMode && displayResults.length !== results.length
                    ? `${displayResults.length} de ${results.length} keywords (filtro Turbo 10x)`
                    : `${results.length} keywords`}
                </span>
              </h3>
              <div className={styles.qualityLegend}>
                <span className={styles.legendItem}>
                  <TrendingUp size={14} className={styles.qualityHigh} /> Alta oportunidade
                </span>
                <span className={styles.legendItem}>
                  <Minus size={14} className={styles.qualityMedium} /> Média
                </span>
                <span className={styles.legendItem}>
                  <TrendingDown size={14} className={styles.qualityLow} /> Baixa
                </span>
              </div>
            </div>

            <div className={styles.tableWrapper}>
              <DataTable
                data={displayResults}
                columns={columns}
                enableSorting={true}
                defaultSorting={[{ id: 'search_volume', desc: true }]}
                enableRowSelection={true}
                onRowSelectionChange={handleRowSelection}
                enableColumnFilters={true}
                filterableColumns={filterableColumns}
                enablePagination={displayResults.length > 20}
                pageSize={20}
                size="sm"
                variant="default"
                stickyHeader
                emptyMessage="Nenhuma keyword encontrada"
                className={styles.dataTable}
              />
            </div>

            {/* Footer with selection info and save button */}
            <div className={styles.footer}>
              <div className={styles.selectionInfo}>
                <span className={styles.selectedText}>
                  {selectedCount > 0 ? (
                    <><strong>{selectedCount}</strong> keyword{selectedCount !== 1 ? 's' : ''} selecionada{selectedCount !== 1 ? 's' : ''}</>
                  ) : (
                    'Selecione as keywords para salvar'
                  )}
                </span>
              </div>
              <Button
                variant="primary"
                leftIcon={<Plus size={18} />}
                onClick={handleSave}
                isLoading={bulkCreateMutation.isPending}
                disabled={selectedCount === 0}
              >
                Salvar Selecionadas
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
