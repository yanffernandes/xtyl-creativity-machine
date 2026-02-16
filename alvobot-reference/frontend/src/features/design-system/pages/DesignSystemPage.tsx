import { useState, useMemo, useEffect } from 'react'
import { Check, Copy, AlertCircle, CheckCircle, Info, AlertTriangle, Plus, Trash2, Edit, Search, Bell, ChevronRight, Star, TrendingUp, Users, Zap, Settings, HelpCircle, FileText, Smartphone, Tablet, Monitor, MousePointer, X, DollarSign, Eye, Target, ShoppingCart, RefreshCw } from 'lucide-react'
import {
  Button,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Input,
  Textarea,
  Select,
  Checkbox,
  Alert,
  Modal,
  Spinner,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeader,
  TableCell,
  EmptyState,
  SearchableSelect,
  MultiSelect,
  Toggle,
  showToast,
  // New components
  Skeleton,
  SkeletonText,
  SkeletonCard,
  SkeletonTable,
  SkeletonAvatar,
  Badge,
  StatusBadge,
  CounterBadge,
  Progress,
  CircularProgress,
  IndeterminateProgress,
  Tooltip,
  Popover,
  Tabs,
  TabPanel,
  Accordion,
  AccordionPanel,
  DataTable,
  createColumnHelper,
  type ColumnDef,
  BentoGrid,
  BentoItem,
  Glass,
  GlassCard,
  GlassButton,
  GlassBadge,
  // Dashboard components
  SummaryCardsGrid,
  TableToolbar,
} from '@/shared/components'
import styles from './DesignSystemPage.module.css'

// Color swatch component
function ColorSwatch({ name, variable, value }: { name: string; variable: string; value: string }) {
  const [copied, setCopied] = useState(false)

  const copyToClipboard = () => {
    navigator.clipboard.writeText(`var(${variable})`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button type="button" className={styles.colorSwatch} onClick={copyToClipboard}>
      <div className={styles.colorPreview} style={{ backgroundColor: value }} />
      <div className={styles.colorInfo}>
        <span className={styles.colorName}>{name}</span>
        <code className={styles.colorVariable}>{variable}</code>
      </div>
      {copied && <Check size={14} className={styles.copiedIcon} />}
    </button>
  )
}

// Code block component
function CodeBlock({ code, language = 'tsx' }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false)

  const copyCode = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={styles.codeBlock}>
      <div className={styles.codeHeader}>
        <span>{language}</span>
        <button onClick={copyCode} className={styles.copyButton}>
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? 'Copiado!' : 'Copiar'}
        </button>
      </div>
      <pre className={styles.codeContent}>
        <code>{code}</code>
      </pre>
    </div>
  )
}

// Section component
function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className={styles.section}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      {children}
    </section>
  )
}

// Sample data for SearchableSelect and MultiSelect
const sampleOptions = [
  { value: 'react', label: 'React' },
  { value: 'vue', label: 'Vue.js' },
  { value: 'angular', label: 'Angular' },
  { value: 'svelte', label: 'Svelte' },
  { value: 'nextjs', label: 'Next.js' },
  { value: 'nuxt', label: 'Nuxt' },
  { value: 'remix', label: 'Remix' },
  { value: 'astro', label: 'Astro' },
]

// Sample data for DataTable
interface Person {
  id: number
  name: string
  email: string
  role: string
  status: 'active' | 'inactive' | 'pending'
}

const sampleTableData: Person[] = [
  { id: 1, name: 'Ana Silva', email: 'ana@email.com', role: 'Admin', status: 'active' },
  { id: 2, name: 'Carlos Santos', email: 'carlos@email.com', role: 'Editor', status: 'active' },
  { id: 3, name: 'Maria Lima', email: 'maria@email.com', role: 'Viewer', status: 'pending' },
  { id: 4, name: 'Pedro Costa', email: 'pedro@email.com', role: 'Editor', status: 'inactive' },
  { id: 5, name: 'Julia Alves', email: 'julia@email.com', role: 'Admin', status: 'active' },
]

const columnHelper = createColumnHelper<Person>()

// Tab data
const tabsData = [
  { id: 'overview', label: 'Visao Geral', icon: <FileText size={16} /> },
  { id: 'analytics', label: 'Analytics', icon: <TrendingUp size={16} /> },
  { id: 'settings', label: 'Configuracoes', icon: <Settings size={16} /> },
  { id: 'help', label: 'Ajuda', icon: <HelpCircle size={16} />, disabled: true },
]

// Accordion data
const accordionData = [
  {
    id: 'faq-1',
    title: 'Como funciona o sistema?',
    content: 'O AlvoBot e uma plataforma completa para gerenciamento de conteudo e automacao de marketing. Voce pode criar, agendar e publicar conteudo em multiplas plataformas.',
  },
  {
    id: 'faq-2',
    title: 'Quais integrações estao disponiveis?',
    content: 'Oferecemos integrações com WordPress, Meta (Facebook/Instagram), Google Analytics, e muito mais. Novas integrações são adicionadas regularmente.',
  },
  {
    id: 'faq-3',
    title: 'Como posso entrar em contato com o suporte?',
    content: 'Nosso suporte esta disponivel 24/7 atraves do chat na plataforma, email ou telefone. Tambem temos uma base de conhecimento completa.',
  },
]

// Custom hook for viewport width
function useViewportWidth() {
  const [width, setWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200)

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return width
}

// Get current breakpoint name
function getBreakpointName(width: number): string {
  if (width < 480) return 'xs (Mobile Small)'
  if (width < 640) return 'sm (Mobile)'
  if (width < 768) return 'md (Tablet)'
  if (width < 1024) return 'lg (Desktop)'
  if (width < 1280) return 'xl (Desktop Large)'
  return '2xl (Desktop XL)'
}

export function DesignSystemPage() {
  const [showModal, setShowModal] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [selectValue, setSelectValue] = useState<string | undefined>(undefined)
  const [checkboxValue, setCheckboxValue] = useState<boolean | 'indeterminate'>(false)
  const [searchableSelectValue, setSearchableSelectValue] = useState('')
  const [multiSelectValue, setMultiSelectValue] = useState<string[]>([])
  const [toggleValue, setToggleValue] = useState(false)
  const [toggleValue2, setToggleValue2] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [progressValue, setProgressValue] = useState(65)
  const viewportWidth = useViewportWidth()

  // DataTable columns
  const tableColumns = useMemo(
    () => [
      columnHelper.accessor('name', {
        header: 'Nome',
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor('email', {
        header: 'Email',
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor('role', {
        header: 'Cargo',
        cell: (info) => <Badge variant="default">{info.getValue()}</Badge>,
      }),
      columnHelper.accessor('status', {
        header: 'Status',
        cell: (info) => {
          const status = info.getValue()
          const variant = status === 'active' ? 'success' : status === 'pending' ? 'warning' : 'default'
          return <Badge variant={variant}>{status}</Badge>
        },
      }),
    ] as Array<ColumnDef<Person, unknown>>,
    []
  )

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>Design System</h1>
        <p className={styles.subtitle}>
          Referencia visual completa para o AlvoBot. Use esta pagina como guia para todos os padroes de UI/UX.
        </p>
      </div>

      {/* Navigation */}
      <nav className={styles.nav}>
        <a href="#colors">Cores</a>
        <a href="#typography">Tipografia</a>
        <a href="#spacing">Espacamento</a>
        <a href="#buttons">Botoes</a>
        <a href="#inputs">Inputs</a>
        <a href="#selects">Selects</a>
        <a href="#toggles">Toggles</a>
        <a href="#cards">Cards</a>
        <a href="#alerts">Alerts</a>
        <a href="#toasts">Toasts</a>
        <a href="#modals">Modals</a>
        <a href="#tables">Tabelas</a>
        <a href="#datatable">DataTable</a>
        <a href="#states">Estados</a>
        <a href="#skeleton">Skeleton</a>
        <a href="#badges">Badges</a>
        <a href="#progress">Progress</a>
        <a href="#tooltip">Tooltip</a>
        <a href="#popover">Popover</a>
        <a href="#tabs">Tabs</a>
        <a href="#accordion">Accordion</a>
        <a href="#bento">BentoGrid</a>
        <a href="#glass">Glassmorphism</a>
        <a href="#dashboard">Dashboard</a>
        <a href="#responsive">Responsivo</a>
        <a href="#animations">Animacoes</a>
      </nav>

      {/* Colors Section */}
      <Section id="colors" title="Cores">
        <div className={styles.subsection}>
          <h3>Cores Primarias</h3>
          <div className={styles.colorGrid}>
            <ColorSwatch name="Primary" variable="--color-primary" value="#fbbf24" />
            <ColorSwatch name="Primary Hover" variable="--color-primary-hover" value="#fbc63d" />
            <ColorSwatch name="Primary Light" variable="--color-primary-light" value="#FFFBEC" />
          </div>
        </div>

        <div className={styles.subsection}>
          <h3>Cores de Texto</h3>
          <div className={styles.colorGrid}>
            <ColorSwatch name="Text Primary" variable="--color-text-primary" value="#344054" />
            <ColorSwatch name="Text Secondary" variable="--color-text-secondary" value="#6B7280" />
            <ColorSwatch name="Text Muted" variable="--color-text-muted" value="#98A2B3" />
            <ColorSwatch name="Text Inverse" variable="--color-text-inverse" value="#FFFFFF" />
          </div>
        </div>

        <div className={styles.subsection}>
          <h3>Cores de Fundo</h3>
          <div className={styles.colorGrid}>
            <ColorSwatch name="BG Primary" variable="--color-bg-primary" value="#FFFFFF" />
            <ColorSwatch name="BG Secondary" variable="--color-bg-secondary" value="#F9FAFB" />
            <ColorSwatch name="BG Tertiary" variable="--color-bg-tertiary" value="#F2F4F7" />
            <ColorSwatch name="BG Page" variable="--color-bg-page" value="#FCFCFD" />
          </div>
        </div>

        <div className={styles.subsection}>
          <h3>Cores de Status</h3>
          <div className={styles.colorGrid}>
            <ColorSwatch name="Success" variable="--color-success" value="#12B76A" />
            <ColorSwatch name="Success BG" variable="--color-success-bg" value="#ECFDF3" />
            <ColorSwatch name="Error" variable="--color-error" value="#F63D68" />
            <ColorSwatch name="Error Light" variable="--color-error-light" value="#fee2e2" />
            <ColorSwatch name="Warning" variable="--color-warning" value="#FDB022" />
            <ColorSwatch name="Warning BG" variable="--color-warning-bg" value="#FFFAEB" />
            <ColorSwatch name="Info" variable="--color-info" value="#269AFF" />
          </div>
        </div>

        <div className={styles.subsection}>
          <h3>Bordas</h3>
          <div className={styles.colorGrid}>
            <ColorSwatch name="Border" variable="--color-border" value="#E4E4E7" />
            <ColorSwatch name="Border Light" variable="--color-border-light" value="#D4D4D8" />
            <ColorSwatch name="Border Dark" variable="--color-border-dark" value="#A1A1AA" />
          </div>
        </div>

        <CodeBlock
          code={`/* Uso de cores */
.myComponent {
  color: var(--color-text-primary);
  background-color: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
}`}
          language="css"
        />
      </Section>

      {/* Typography Section */}
      <Section id="typography" title="Tipografia">
        <div className={styles.subsection}>
          <h3>Display</h3>
          <div className={styles.typographyList}>
            <div className={styles.typographyItem}>
              <span style={{ font: 'var(--font-display-xl)' }}>Display XL</span>
              <code>--font-display-xl</code>
            </div>
            <div className={styles.typographyItem}>
              <span style={{ font: 'var(--font-display-lg)' }}>Display LG</span>
              <code>--font-display-lg</code>
            </div>
            <div className={styles.typographyItem}>
              <span style={{ font: 'var(--font-display-md)' }}>Display MD</span>
              <code>--font-display-md</code>
            </div>
            <div className={styles.typographyItem}>
              <span style={{ font: 'var(--font-display-sm)' }}>Display SM</span>
              <code>--font-display-sm</code>
            </div>
          </div>
        </div>

        <div className={styles.subsection}>
          <h3>Headings</h3>
          <div className={styles.typographyList}>
            <div className={styles.typographyItem}>
              <span style={{ font: 'var(--font-heading-xl)' }}>Heading XL</span>
              <code>--font-heading-xl</code>
            </div>
            <div className={styles.typographyItem}>
              <span style={{ font: 'var(--font-heading-lg)' }}>Heading LG</span>
              <code>--font-heading-lg</code>
            </div>
            <div className={styles.typographyItem}>
              <span style={{ font: 'var(--font-heading-md)' }}>Heading MD</span>
              <code>--font-heading-md</code>
            </div>
            <div className={styles.typographyItem}>
              <span style={{ font: 'var(--font-heading-sm)' }}>Heading SM</span>
              <code>--font-heading-sm</code>
            </div>
          </div>
        </div>

        <div className={styles.subsection}>
          <h3>Body</h3>
          <div className={styles.typographyList}>
            <div className={styles.typographyItem}>
              <span style={{ font: 'var(--font-body-lg)' }}>Body LG - Texto de exemplo</span>
              <code>--font-body-lg</code>
            </div>
            <div className={styles.typographyItem}>
              <span style={{ font: 'var(--font-body-md)' }}>Body MD - Texto de exemplo</span>
              <code>--font-body-md</code>
            </div>
            <div className={styles.typographyItem}>
              <span style={{ font: 'var(--font-body-sm)' }}>Body SM - Texto de exemplo</span>
              <code>--font-body-sm</code>
            </div>
            <div className={styles.typographyItem}>
              <span style={{ font: 'var(--font-body-xs)' }}>Body XS - Texto de exemplo</span>
              <code>--font-body-xs</code>
            </div>
          </div>
        </div>

        <div className={styles.subsection}>
          <h3>Labels</h3>
          <div className={styles.typographyList}>
            <div className={styles.typographyItem}>
              <span style={{ font: 'var(--font-label-lg)' }}>Label LG</span>
              <code>--font-label-lg</code>
            </div>
            <div className={styles.typographyItem}>
              <span style={{ font: 'var(--font-label-md)' }}>Label MD</span>
              <code>--font-label-md</code>
            </div>
            <div className={styles.typographyItem}>
              <span style={{ font: 'var(--font-label-sm)' }}>Label SM</span>
              <code>--font-label-sm</code>
            </div>
          </div>
        </div>

        <CodeBlock
          code={`.title {
  font: var(--font-heading-xl);
  color: var(--color-text-primary);
}

.description {
  font: var(--font-body-md);
  color: var(--color-text-secondary);
}`}
          language="css"
        />
      </Section>

      {/* Spacing Section */}
      <Section id="spacing" title="Espacamento">
        <div className={styles.spacingGrid}>
          {[
            { name: 'space-1', value: '4px' },
            { name: 'space-2', value: '8px' },
            { name: 'space-3', value: '12px' },
            { name: 'space-4', value: '16px' },
            { name: 'space-5', value: '20px' },
            { name: 'space-6', value: '24px' },
            { name: 'space-8', value: '32px' },
            { name: 'space-10', value: '40px' },
            { name: 'space-12', value: '48px' },
            { name: 'space-16', value: '64px' },
          ].map(({ name, value }) => (
            <div key={name} className={styles.spacingItem}>
              <div className={styles.spacingPreview} style={{ width: value, height: value }} />
              <div className={styles.spacingInfo}>
                <code>--{name}</code>
                <span>{value}</span>
              </div>
            </div>
          ))}
        </div>

        <div className={styles.subsection}>
          <h3>Border Radius</h3>
          <div className={styles.radiusGrid}>
            {[
              { name: 'radius-xs', value: '2px' },
              { name: 'radius-sm', value: '4px' },
              { name: 'radius-md', value: '8px' },
              { name: 'radius-lg', value: '12px' },
              { name: 'radius-xl', value: '16px' },
              { name: 'radius-full', value: '9999px' },
            ].map(({ name, value }) => (
              <div key={name} className={styles.radiusItem}>
                <div className={styles.radiusPreview} style={{ borderRadius: value }} />
                <code>--{name}</code>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.subsection}>
          <h3>Sombras</h3>
          <div className={styles.shadowGrid}>
            {[
              { name: 'shadow-sm', value: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' },
              { name: 'shadow-md', value: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' },
              { name: 'shadow-lg', value: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' },
              { name: 'shadow-xl', value: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' },
            ].map(({ name, value }) => (
              <div key={name} className={styles.shadowItem}>
                <div className={styles.shadowPreview} style={{ boxShadow: value }} />
                <code>--{name}</code>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* Buttons Section */}
      <Section id="buttons" title="Botoes">
        <div className={styles.subsection}>
          <h3>Variantes</h3>
          <div className={styles.componentRow}>
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
          </div>
        </div>

        <div className={styles.subsection}>
          <h3>Tamanhos</h3>
          <div className={styles.componentRow}>
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
          </div>
        </div>

        <div className={styles.subsection}>
          <h3>Com Icones</h3>
          <div className={styles.componentRow}>
            <Button leftIcon={<Plus size={16} />}>Adicionar</Button>
            <Button rightIcon={<Search size={16} />}>Buscar</Button>
            <Button variant="danger" leftIcon={<Trash2 size={16} />}>Excluir</Button>
          </div>
        </div>

        <div className={styles.subsection}>
          <h3>Estados</h3>
          <div className={styles.componentRow}>
            <Button isLoading>Loading</Button>
            <Button disabled>Disabled</Button>
            <Button fullWidth>Full Width</Button>
          </div>
        </div>

        <CodeBlock
          code={`import { Button } from '@/shared/components'

<Button variant="primary" size="md">
  Primary Button
</Button>

<Button variant="danger" leftIcon={<Trash2 size={16} />}>
  Delete
</Button>

<Button isLoading>
  Processing...
</Button>`}
        />
      </Section>

      {/* Inputs Section */}
      <Section id="inputs" title="Inputs">
        <div className={styles.subsection}>
          <h3>Input de Texto</h3>
          <div className={styles.inputGrid}>
            <Input
              label="Label do Input"
              placeholder="Placeholder..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
            />
            <Input
              label="Com Erro"
              placeholder="Campo invalido"
              error="Este campo e obrigatorio"
            />
            <Input
              label="Desabilitado"
              placeholder="Nao editavel"
              disabled
            />
          </div>
        </div>

        <div className={styles.subsection}>
          <h3>Textarea</h3>
          <div className={styles.inputGrid}>
            <Textarea
              label="Descricao"
              placeholder="Digite uma descricao..."
              rows={3}
            />
          </div>
        </div>

        <div className={styles.subsection}>
          <h3>Select (Radix UI)</h3>
          <div className={styles.inputGrid}>
            <Select
              label="Selecione uma opcao"
              value={selectValue}
              onValueChange={setSelectValue}
              placeholder="Selecione..."
              options={[
                { value: '1', label: 'Opcao 1' },
                { value: '2', label: 'Opcao 2' },
                { value: '3', label: 'Opcao 3' },
              ]}
            />
            <Select
              label="Com erro"
              options={[
                { value: '1', label: 'Opcao 1' },
                { value: '2', label: 'Opcao 2' },
              ]}
              error="Selecione uma opcao valida"
            />
            <Select
              label="Desabilitado"
              options={[
                { value: '1', label: 'Opcao 1' },
              ]}
              disabled
            />
          </div>
        </div>

        <div className={styles.subsection}>
          <h3>Checkbox (Radix UI)</h3>
          <div className={styles.componentRow}>
            <Checkbox
              label="Aceito os termos"
              checked={checkboxValue}
              onCheckedChange={setCheckboxValue}
            />
            <Checkbox label="Desabilitado" disabled />
            <Checkbox label="Marcado e desabilitado" checked disabled />
            <Checkbox label="Indeterminado" checked="indeterminate" />
          </div>
        </div>

        <CodeBlock
          code={`import { Input, Select, Checkbox, Textarea } from '@/shared/components'

<Input
  label="Email"
  type="email"
  placeholder="seu@email.com"
  error={errors.email}
/>

// Select usa Radix UI internamente
<Select
  label="Categoria"
  options={[
    { value: '1', label: 'Opcao 1' },
    { value: '2', label: 'Opcao 2' },
  ]}
  value={value}
  onValueChange={setValue}
  placeholder="Selecione..."
/>

// Checkbox usa Radix UI internamente
<Checkbox
  label="Lembrar de mim"
  checked={remember}
  onCheckedChange={setRemember}
/>

// Estado indeterminado (ex: select-all)
<Checkbox
  label="Selecionar todos"
  checked="indeterminate"
  onCheckedChange={handleSelectAll}
/>`}
        />
      </Section>

      {/* Selects Section */}
      <Section id="selects" title="Selects Avancados">
        <div className={styles.subsection}>
          <h3>SearchableSelect</h3>
          <p className={styles.componentDescription}>
            Select com busca integrada, ideal para listas longas. Suporta custom rendering e estados de loading.
          </p>
          <div className={styles.inputGrid}>
            <SearchableSelect
              label="Framework favorito"
              options={sampleOptions}
              value={searchableSelectValue}
              onChange={setSearchableSelectValue}
              placeholder="Selecione um framework"
              searchPlaceholder="Buscar framework..."
            />
            <SearchableSelect
              label="Com erro"
              options={sampleOptions}
              value=""
              onChange={() => {}}
              error="Selecione uma opcao"
            />
          </div>
        </div>

        <div className={styles.subsection}>
          <h3>MultiSelect</h3>
          <p className={styles.componentDescription}>
            Selecao multipla com busca, tags e contador. Perfeito para filtros e categorias.
          </p>
          <div className={styles.inputGrid}>
            <MultiSelect
              label="Frameworks que voce conhece"
              options={sampleOptions}
              value={multiSelectValue}
              onChange={setMultiSelectValue}
              placeholder="Selecione os frameworks"
              hint="Selecione todos os frameworks que voce ja utilizou"
            />
          </div>
        </div>

        <CodeBlock
          code={`import { SearchableSelect, MultiSelect } from '@/shared/components'

// SearchableSelect - selecao unica com busca
<SearchableSelect
  label="Framework"
  options={[
    { value: 'react', label: 'React' },
    { value: 'vue', label: 'Vue.js' },
  ]}
  value={value}
  onChange={setValue}
  placeholder="Selecione..."
/>

// MultiSelect - selecao multipla
<MultiSelect
  label="Tecnologias"
  options={options}
  value={selectedValues}
  onChange={setSelectedValues}
  maxSelectedVisible={3}
/>`}
        />
      </Section>

      {/* Toggles Section */}
      <Section id="toggles" title="Toggle / Switch (Radix UI)">
        <div className={styles.subsection}>
          <h3>Tamanhos</h3>
          <div className={styles.componentColumn}>
            <Toggle
              size="sm"
              label="Toggle pequeno"
              checked={toggleValue}
              onCheckedChange={setToggleValue}
            />
            <Toggle
              size="md"
              label="Toggle medio (padrao)"
              checked={toggleValue}
              onCheckedChange={setToggleValue}
            />
            <Toggle
              size="lg"
              label="Toggle grande"
              checked={toggleValue}
              onCheckedChange={setToggleValue}
            />
          </div>
        </div>

        <div className={styles.subsection}>
          <h3>Com Descricao</h3>
          <div className={styles.componentColumn}>
            <Toggle
              label="Notificacoes por email"
              description="Receba atualizacoes sobre suas tarefas por email"
              checked={toggleValue2}
              onCheckedChange={setToggleValue2}
            />
            <Toggle
              label="Modo escuro"
              description="Ajusta a interface para ambientes com pouca luz"
            />
          </div>
        </div>

        <div className={styles.subsection}>
          <h3>Estados</h3>
          <div className={styles.componentColumn}>
            <Toggle label="Desabilitado" disabled />
            <Toggle label="Desabilitado e ativo" disabled defaultChecked />
            <Toggle label="Com erro" error="Esta opcao e obrigatoria" />
          </div>
        </div>

        <CodeBlock
          code={`import { Toggle } from '@/shared/components'

// Toggle usa Radix Switch internamente
<Toggle
  label="Ativar notificacoes"
  description="Receba alertas em tempo real"
  checked={isEnabled}
  onCheckedChange={setIsEnabled}
  size="md"
/>

// Controlled vs Uncontrolled
<Toggle
  label="Controlado"
  checked={value}
  onCheckedChange={setValue}
/>

<Toggle
  label="Nao-controlado"
  defaultChecked
/>

// Com erro
<Toggle
  label="Aceitar termos"
  error="Voce precisa aceitar os termos"
/>`}
        />
      </Section>

      {/* Cards Section */}
      <Section id="cards" title="Cards">
        <div className={styles.cardGrid}>
          <Card>
            <CardHeader title="Card Simples" />
            <CardBody>
              <p>Conteudo do card com texto de exemplo para demonstrar o layout.</p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Card com Footer" />
            <CardBody>
              <p>Este card tem um footer com acoes.</p>
            </CardBody>
            <CardFooter>
              <Button variant="ghost" size="sm">Cancelar</Button>
              <Button size="sm">Salvar</Button>
            </CardFooter>
          </Card>

          <Card className={styles.highlightCard}>
            <CardBody>
              <div className={styles.cardIcon}>
                <Edit size={24} />
              </div>
              <h3>Card de Acao</h3>
              <p>Cards podem ser usados para acoes rapidas.</p>
            </CardBody>
          </Card>
        </div>

        <CodeBlock
          code={`import { Card, CardHeader, CardBody, CardFooter } from '@/shared/components'

<Card>
  <CardHeader title="Titulo do Card" />
  <CardBody>
    <p>Conteudo do card</p>
  </CardBody>
  <CardFooter>
    <Button>Acao</Button>
  </CardFooter>
</Card>`}
        />
      </Section>

      {/* Alerts Section */}
      <Section id="alerts" title="Alerts">
        <div className={styles.alertStack}>
          <Alert variant="success">
            Operacao realizada com sucesso!
          </Alert>
          <Alert variant="error">
            Erro ao processar a requisicao.
          </Alert>
          <Alert variant="warning">
            Atencao: Esta acao nao pode ser desfeita.
          </Alert>
          <Alert variant="info">
            Dica: Voce pode arrastar os itens para reordenar.
          </Alert>
        </div>

        <div className={styles.subsection}>
          <h3>Com Titulo</h3>
          <div className={styles.alertStack}>
            <Alert variant="success" title="Sucesso!">
              Seus dados foram salvos com sucesso.
            </Alert>
            <Alert variant="error" title="Erro" onClose={() => {}}>
              Este alert pode ser fechado pelo usuario.
            </Alert>
          </div>
        </div>

        <CodeBlock
          code={`import { Alert } from '@/shared/components'

// Alert simples (icone automatico baseado na variant)
<Alert variant="success">
  Salvo com sucesso!
</Alert>

// Com titulo
<Alert variant="error" title="Erro ao salvar">
  Verifique sua conexao e tente novamente.
</Alert>

// Com botao de fechar
<Alert variant="warning" title="Atencao" onClose={() => handleClose()}>
  Esta acao nao pode ser desfeita.
</Alert>`}
        />
      </Section>

      {/* Toasts Section */}
      <Section id="toasts" title="Toast Notifications">
        <p className={styles.componentDescription}>
          Notificacoes animadas e profissionais usando Sonner. Aparecem no canto superior direito
          e desaparecem automaticamente apos 4 segundos.
        </p>

        <div className={styles.subsection}>
          <h3>Tipos de Toast</h3>
          <div className={styles.componentRow}>
            <Button
              variant="outline"
              leftIcon={<CheckCircle size={16} />}
              onClick={() => showToast.success('Operacao realizada!', { description: 'Seus dados foram salvos com sucesso.' })}
            >
              Success
            </Button>
            <Button
              variant="outline"
              leftIcon={<AlertCircle size={16} />}
              onClick={() => showToast.error('Erro ao processar', { description: 'Tente novamente mais tarde.' })}
            >
              Error
            </Button>
            <Button
              variant="outline"
              leftIcon={<AlertTriangle size={16} />}
              onClick={() => showToast.warning('Atencao!', { description: 'Esta acao pode ter consequencias.' })}
            >
              Warning
            </Button>
            <Button
              variant="outline"
              leftIcon={<Info size={16} />}
              onClick={() => showToast.info('Dica:', { description: 'Voce pode usar atalhos de teclado.' })}
            >
              Info
            </Button>
          </div>
        </div>

        <div className={styles.subsection}>
          <h3>Toast com Promise</h3>
          <div className={styles.componentRow}>
            <Button
              variant="secondary"
              leftIcon={<Bell size={16} />}
              onClick={() => {
                const promise = new Promise((resolve) => setTimeout(resolve, 2000))
                showToast.promise(promise, {
                  loading: 'Processando...',
                  success: 'Concluido com sucesso!',
                  error: 'Erro ao processar',
                })
              }}
            >
              Simular Promise (2s)
            </Button>
          </div>
        </div>

        <CodeBlock
          code={`import { showToast } from '@/shared/components'

// Toasts simples
showToast.success('Salvo com sucesso!')
showToast.error('Erro ao salvar')
showToast.warning('Atencao!')
showToast.info('Dica util')

// Com descricao
showToast.success('Operacao concluida', {
  description: 'Seus dados foram salvos.',
  duration: 5000,
})

// Com promise (loading -> success/error)
showToast.promise(saveData(), {
  loading: 'Salvando...',
  success: 'Dados salvos!',
  error: 'Erro ao salvar',
})`}
        />
      </Section>

      {/* Modals Section */}
      <Section id="modals" title="Modals">
        <Button onClick={() => setShowModal(true)}>Abrir Modal</Button>

        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title="Titulo do Modal"
        >
          <p>Este e o conteudo do modal. Voce pode colocar qualquer componente aqui.</p>
          <div style={{ marginTop: 'var(--space-4)' }}>
            <Input label="Nome" placeholder="Digite seu nome" />
          </div>
          <div style={{ marginTop: 'var(--space-4)', display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button onClick={() => setShowModal(false)}>Confirmar</Button>
          </div>
        </Modal>

        <CodeBlock
          code={`import { Modal, Button } from '@/shared/components'

const [isOpen, setIsOpen] = useState(false)

<Button onClick={() => setIsOpen(true)}>Abrir</Button>

<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Titulo do Modal"
>
  <p>Conteudo do modal</p>
  <Button onClick={() => setIsOpen(false)}>Fechar</Button>
</Modal>`}
        />
      </Section>

      {/* Tables Section */}
      <Section id="tables" title="Tabelas">
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>Nome</TableHeader>
              <TableHeader>Email</TableHeader>
              <TableHeader>Status</TableHeader>
              <TableHeader>Acoes</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell>Joao Silva</TableCell>
              <TableCell>joao@email.com</TableCell>
              <TableCell><span className={styles.statusActive}>Ativo</span></TableCell>
              <TableCell>
                <Button variant="ghost" size="sm"><Edit size={14} /></Button>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Maria Santos</TableCell>
              <TableCell>maria@email.com</TableCell>
              <TableCell><span className={styles.statusInactive}>Inativo</span></TableCell>
              <TableCell>
                <Button variant="ghost" size="sm"><Edit size={14} /></Button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>

        <CodeBlock
          code={`import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from '@/shared/components'

<Table>
  <TableHead>
    <TableRow>
      <TableHeader>Nome</TableHeader>
      <TableHeader>Email</TableHeader>
    </TableRow>
  </TableHead>
  <TableBody>
    <TableRow>
      <TableCell>Joao Silva</TableCell>
      <TableCell>joao@email.com</TableCell>
    </TableRow>
  </TableBody>
</Table>`}
        />
      </Section>

      {/* DataTable Section */}
      <Section id="datatable" title="DataTable (Avancado)">
        <p className={styles.componentDescription}>
          Tabela avancada com TanStack Table. Suporta ordenacao, filtragem, paginacao e selecao de linhas.
          Mais leve que AG Grid (~30KB vs ~300KB) e suficiente para a maioria dos casos de uso.
        </p>

        <div className={styles.subsection}>
          <h3>Com Todas as Features</h3>
          <DataTable
            data={sampleTableData}
            columns={tableColumns}
            enableSorting
            enableFiltering
            enablePagination
            enableRowSelection
            pageSize={3}
            variant="striped"
          />
        </div>

        <CodeBlock
          code={`import { DataTable, createColumnHelper, Badge } from '@/shared/components'

const columnHelper = createColumnHelper<Person>()

const columns = [
  columnHelper.accessor('name', { header: 'Nome' }),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: (info) => <Badge variant="success">{info.getValue()}</Badge>,
  }),
]

<DataTable
  data={data}
  columns={columns}
  enableSorting
  enableFiltering
  enablePagination
  pageSize={10}
/>`}
        />
      </Section>

      {/* Skeleton Section */}
      <Section id="skeleton" title="Skeleton Loading">
        <p className={styles.componentDescription}>
          Placeholders de carregamento para melhorar a percepcao de performance.
          Use skeletons em vez de spinners quando o layout do conteudo e previsivel.
        </p>

        <div className={styles.subsection}>
          <h3>Variantes</h3>
          <div className={styles.componentRow} style={{ gap: 'var(--space-6)', flexWrap: 'wrap' }}>
            <div>
              <p className={styles.componentLabel}>Text</p>
              <Skeleton variant="text" width={200} />
            </div>
            <div>
              <p className={styles.componentLabel}>Circular</p>
              <Skeleton variant="circular" width={48} height={48} />
            </div>
            <div>
              <p className={styles.componentLabel}>Rectangular</p>
              <Skeleton variant="rectangular" width={120} height={80} />
            </div>
          </div>
        </div>

        <div className={styles.subsection}>
          <h3>Compostos</h3>
          <div className={styles.cardGrid}>
            <div>
              <p className={styles.componentLabel}>SkeletonAvatar + Text</p>
              <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
                <SkeletonAvatar size="md" />
                <SkeletonText lines={2} />
              </div>
            </div>
            <div>
              <p className={styles.componentLabel}>SkeletonCard</p>
              <SkeletonCard />
            </div>
          </div>
        </div>

        <div className={styles.subsection}>
          <h3>SkeletonTable</h3>
          <SkeletonTable rows={3} columns={4} />
        </div>

        <CodeBlock
          code={`import { Skeleton, SkeletonText, SkeletonCard, SkeletonTable, SkeletonAvatar } from '@/shared/components'

// Loading de texto
<Skeleton variant="text" width={200} />

// Avatar com texto
<div style={{ display: 'flex', gap: 8 }}>
  <SkeletonAvatar size="md" />
  <SkeletonText lines={2} />
</div>

// Card completo
<SkeletonCard hasImage imageHeight={150} lines={3} />

// Tabela
<SkeletonTable rows={5} columns={4} />`}
        />
      </Section>

      {/* Badges Section */}
      <Section id="badges" title="Badges">
        <p className={styles.componentDescription}>
          Componentes para indicar status, contadores e categorias.
        </p>

        <div className={styles.subsection}>
          <h3>Variantes</h3>
          <div className={styles.componentRow}>
            <Badge variant="default">Default</Badge>
            <Badge variant="primary">Primary</Badge>
            <Badge variant="success">Success</Badge>
            <Badge variant="warning">Warning</Badge>
            <Badge variant="error">Error</Badge>
            <Badge variant="info">Info</Badge>
          </div>
        </div>

        <div className={styles.subsection}>
          <h3>Com Dot e Outline</h3>
          <div className={styles.componentRow}>
            <Badge variant="success" dot>Online</Badge>
            <Badge variant="warning" dot>Pendente</Badge>
            <Badge variant="primary" outline>Outline</Badge>
            <Badge variant="error" outline>Outline Error</Badge>
          </div>
        </div>

        <div className={styles.subsection}>
          <h3>Status Badge</h3>
          <div className={styles.componentRow}>
            <StatusBadge status="online" />
            <StatusBadge status="offline" />
            <StatusBadge status="away" />
            <StatusBadge status="busy" />
            <StatusBadge status="pending" />
          </div>
        </div>

        <div className={styles.subsection}>
          <h3>Counter Badge</h3>
          <div className={styles.componentRow}>
            <CounterBadge count={5} />
            <CounterBadge count={42} variant="error" />
            <CounterBadge count={150} max={99} />
            <CounterBadge count={0} showZero />
          </div>
        </div>

        <CodeBlock
          code={`import { Badge, StatusBadge, CounterBadge } from '@/shared/components'

<Badge variant="success" dot>Online</Badge>
<Badge variant="primary" outline>Categoria</Badge>

<StatusBadge status="online" />
<StatusBadge status="pending" />

<CounterBadge count={42} variant="error" />
<CounterBadge count={150} max={99} />`}
        />
      </Section>

      {/* Progress Section */}
      <Section id="progress" title="Progress">
        <p className={styles.componentDescription}>
          Indicadores de progresso linear e circular.
        </p>

        <div className={styles.subsection}>
          <h3>Linear Progress</h3>
          <div className={styles.componentColumn} style={{ gap: 'var(--space-4)' }}>
            <Progress value={progressValue} showLabel />
            <Progress value={75} variant="success" size="lg" label="Upload completo" showLabel />
            <Progress value={30} variant="warning" size="sm" />
            <Progress value={90} variant="error" striped animated />
          </div>
          <div style={{ marginTop: 'var(--space-4)' }}>
            <Button size="sm" onClick={() => setProgressValue((v) => Math.min(100, v + 10))}>
              +10%
            </Button>
          </div>
        </div>

        <div className={styles.subsection}>
          <h3>Circular Progress</h3>
          <div className={styles.componentRow}>
            <CircularProgress value={65} size="sm" showLabel />
            <CircularProgress value={80} size="md" variant="success" showLabel />
            <CircularProgress value={45} size="lg" variant="warning" showLabel />
          </div>
        </div>

        <div className={styles.subsection}>
          <h3>Indeterminate (Loading)</h3>
          <IndeterminateProgress />
        </div>

        <CodeBlock
          code={`import { Progress, CircularProgress, IndeterminateProgress } from '@/shared/components'

// Linear com label
<Progress value={75} showLabel variant="success" />

// Striped e animado
<Progress value={50} striped animated />

// Circular
<CircularProgress value={80} size="lg" showLabel />

// Loading indeterminado
<IndeterminateProgress />`}
        />
      </Section>

      {/* Tooltip Section */}
      <Section id="tooltip" title="Tooltip (Radix UI)">
        <p className={styles.componentDescription}>
          Dicas contextuais que aparecem ao passar o mouse sobre um elemento.
          Usa Radix Tooltip internamente para acessibilidade e posicionamento automatico.
        </p>

        <div className={styles.subsection}>
          <h3>Posicoes</h3>
          <div className={styles.componentRow}>
            <Tooltip content="Tooltip em cima" position="top">
              <Button variant="outline">Top</Button>
            </Tooltip>
            <Tooltip content="Tooltip embaixo" position="bottom">
              <Button variant="outline">Bottom</Button>
            </Tooltip>
            <Tooltip content="Tooltip a esquerda" position="left">
              <Button variant="outline">Left</Button>
            </Tooltip>
            <Tooltip content="Tooltip a direita" position="right">
              <Button variant="outline">Right</Button>
            </Tooltip>
          </div>
        </div>

        <div className={styles.subsection}>
          <h3>Com Icones</h3>
          <div className={styles.componentRow}>
            <Tooltip content="Editar item">
              <Button variant="ghost" size="sm"><Edit size={16} /></Button>
            </Tooltip>
            <Tooltip content="Excluir item">
              <Button variant="ghost" size="sm"><Trash2 size={16} /></Button>
            </Tooltip>
            <Tooltip content="Adicionar novo">
              <Button variant="ghost" size="sm"><Plus size={16} /></Button>
            </Tooltip>
          </div>
        </div>

        <div className={styles.subsection}>
          <h3>Delay Customizado</h3>
          <div className={styles.componentRow}>
            <Tooltip content="Delay rapido (100ms)" delay={100}>
              <Button variant="outline" size="sm">100ms</Button>
            </Tooltip>
            <Tooltip content="Delay padrao (200ms)" delay={200}>
              <Button variant="outline" size="sm">200ms (padrao)</Button>
            </Tooltip>
            <Tooltip content="Delay lento (500ms)" delay={500}>
              <Button variant="outline" size="sm">500ms</Button>
            </Tooltip>
          </div>
        </div>

        <CodeBlock
          code={`import { Tooltip } from '@/shared/components'

// Tooltip usa Radix UI internamente
<Tooltip content="Texto do tooltip" position="top">
  <Button>Hover me</Button>
</Tooltip>

// Com delay customizado
<Tooltip content="Aparece apos 500ms" delay={500}>
  <span>Elemento com delay</span>
</Tooltip>

// Posicoes: top, bottom, left, right
<Tooltip content="Dica" position="bottom">
  <IconButton />
</Tooltip>`}
        />
      </Section>

      {/* Popover Section */}
      <Section id="popover" title="Popover (Radix UI)">
        <p className={styles.componentDescription}>
          Containers flutuantes com conteudo mais complexo que tooltips.
          Usa Radix Popover para posicionamento e acessibilidade automatica.
        </p>

        <div className={styles.subsection}>
          <h3>Posicoes e Alinhamento</h3>
          <div className={styles.componentRow}>
            <Popover
              trigger={<Button variant="outline">Bottom Start</Button>}
              position="bottom"
              align="start"
            >
              <div style={{ padding: 'var(--space-2)' }}>
                <h4 style={{ margin: '0 0 8px 0', font: 'var(--font-heading-md)' }}>Popover Title</h4>
                <p style={{ margin: 0, font: 'var(--font-body-sm)', color: 'var(--color-text-secondary)' }}>
                  Este e um popover com conteudo mais complexo.
                </p>
              </div>
            </Popover>
            <Popover
              trigger={<Button variant="outline">Top Center</Button>}
              position="top"
              align="center"
            >
              <div style={{ padding: 'var(--space-2)' }}>
                <p style={{ margin: 0, font: 'var(--font-body-sm)' }}>
                  Popover alinhado ao centro, acima do trigger.
                </p>
              </div>
            </Popover>
            <Popover
              trigger={<Button variant="outline">Right End</Button>}
              position="right"
              align="end"
            >
              <div style={{ padding: 'var(--space-2)' }}>
                <p style={{ margin: 0, font: 'var(--font-body-sm)' }}>
                  Popover a direita, alinhado ao final.
                </p>
              </div>
            </Popover>
          </div>
        </div>

        <div className={styles.subsection}>
          <h3>Com Close Button</h3>
          <Popover
            trigger={<Button>Menu de opcoes</Button>}
            position="bottom"
            showCloseButton
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', minWidth: 150, paddingTop: 'var(--space-2)' }}>
              <Button variant="ghost" size="sm" leftIcon={<Edit size={14} />}>Editar</Button>
              <Button variant="ghost" size="sm" leftIcon={<Copy size={14} />}>Duplicar</Button>
              <Button variant="ghost" size="sm" leftIcon={<Trash2 size={14} />}>Excluir</Button>
            </div>
          </Popover>
        </div>

        <CodeBlock
          code={`import { Popover } from '@/shared/components'

// Popover usa Radix UI internamente
<Popover
  trigger={<Button>Open</Button>}
  position="bottom"
  align="start"
  showCloseButton
>
  <div>Conteudo do popover</div>
</Popover>

// Posicoes: top, bottom, left, right
// Alinhamento: start, center, end
<Popover position="top" align="center">
  <ComplexContent />
</Popover>

// Controlado externamente
<Popover open={isOpen} onOpenChange={setIsOpen}>
  ...
</Popover>`}
        />
      </Section>

      {/* Tabs Section */}
      <Section id="tabs" title="Tabs">
        <p className={styles.componentDescription}>
          Navegacao em abas para organizar conteudo relacionado.
        </p>

        <div className={styles.subsection}>
          <h3>Default</h3>
          <Tabs tabs={tabsData} activeTab={activeTab} onChange={setActiveTab} />
          <div style={{ marginTop: 'var(--space-4)', padding: 'var(--space-4)', background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-md)' }}>
            <TabPanel id="overview" activeTab={activeTab}>
              <p>Conteudo da aba Visao Geral. Aqui voce encontra um resumo das informacoes.</p>
            </TabPanel>
            <TabPanel id="analytics" activeTab={activeTab}>
              <p>Conteudo da aba Analytics. Graficos e metricas aparecem aqui.</p>
            </TabPanel>
            <TabPanel id="settings" activeTab={activeTab}>
              <p>Conteudo da aba Configuracoes. Ajuste suas preferencias.</p>
            </TabPanel>
          </div>
        </div>

        <div className={styles.subsection}>
          <h3>Variantes</h3>
          <div className={styles.componentColumn} style={{ gap: 'var(--space-6)' }}>
            <div>
              <p className={styles.componentLabel}>Pills</p>
              <Tabs
                tabs={tabsData.slice(0, 3)}
                activeTab={activeTab}
                onChange={setActiveTab}
                variant="pills"
              />
            </div>
            <div>
              <p className={styles.componentLabel}>Underline</p>
              <Tabs
                tabs={tabsData.slice(0, 3)}
                activeTab={activeTab}
                onChange={setActiveTab}
                variant="underline"
              />
            </div>
          </div>
        </div>

        <CodeBlock
          code={`import { Tabs, TabPanel } from '@/shared/components'

const tabs = [
  { id: 'tab1', label: 'Tab 1', icon: <Icon /> },
  { id: 'tab2', label: 'Tab 2' },
  { id: 'tab3', label: 'Tab 3', disabled: true },
]

<Tabs
  tabs={tabs}
  activeTab={activeTab}
  onChange={setActiveTab}
  variant="underline" // 'default' | 'pills' | 'underline'
/>

<TabPanel id="tab1" activeTab={activeTab}>
  Conteudo da Tab 1
</TabPanel>`}
        />
      </Section>

      {/* Accordion Section */}
      <Section id="accordion" title="Accordion">
        <p className={styles.componentDescription}>
          Paineis expansiveis para organizar conteudo em secoes colapsaveis.
        </p>

        <div className={styles.subsection}>
          <h3>Single Expand</h3>
          <Accordion items={accordionData} defaultExpanded={['faq-1']} />
        </div>

        <div className={styles.subsection}>
          <h3>Multiple Expand</h3>
          <Accordion items={accordionData} allowMultiple variant="bordered" />
        </div>

        <div className={styles.subsection}>
          <h3>Standalone Panel</h3>
          <AccordionPanel title="Painel Individual" icon={<HelpCircle size={18} />}>
            <p>Este e um painel individual que pode ser usado separadamente.</p>
          </AccordionPanel>
        </div>

        <CodeBlock
          code={`import { Accordion, AccordionPanel } from '@/shared/components'

const items = [
  { id: '1', title: 'Titulo 1', content: 'Conteudo 1' },
  { id: '2', title: 'Titulo 2', content: 'Conteudo 2' },
]

// Accordion completo
<Accordion
  items={items}
  defaultExpanded={['1']}
  allowMultiple
  variant="bordered" // 'default' | 'bordered' | 'separated'
/>

// Painel individual
<AccordionPanel title="Titulo" icon={<Icon />}>
  Conteudo
</AccordionPanel>`}
        />
      </Section>

      {/* BentoGrid Section */}
      <Section id="bento" title="BentoGrid">
        <p className={styles.componentDescription}>
          Layout moderno em grid inspirado no design da Apple. Ideal para dashboards e landing pages.
        </p>

        <div className={styles.subsection}>
          <h3>Layout Basico</h3>
          <BentoGrid columns={4} gap="md">
            <BentoItem
              colSpan={2}
              title="Metricas"
              description="Acompanhe seus numeros em tempo real"
              icon={<TrendingUp size={20} />}
              variant="gradient"
              interactive
            />
            <BentoItem
              title="Usuarios"
              description="1.234 ativos"
              icon={<Users size={20} />}
              badge={<Badge variant="success" size="sm">+12%</Badge>}
              interactive
            />
            <BentoItem
              title="Performance"
              description="99.9% uptime"
              icon={<Zap size={20} />}
              variant="primary"
              interactive
            />
            <BentoItem
              colSpan={3}
              rowSpan={2}
              title="Visao Geral"
              description="Dashboard completo com todas as informacoes do seu projeto"
              variant="dark"
              showBackground
            >
              <div style={{ marginTop: 'var(--space-4)' }}>
                <Progress value={75} variant="success" showLabel />
              </div>
            </BentoItem>
            <BentoItem
              title="Novo"
              icon={<Star size={20} />}
              variant="subtle"
              interactive
            />
          </BentoGrid>
        </div>

        <CodeBlock
          code={`import { BentoGrid, BentoItem } from '@/shared/components'

<BentoGrid columns={4} gap="md">
  <BentoItem
    colSpan={2}
    title="Titulo"
    description="Descricao"
    icon={<Icon />}
    variant="gradient"
    interactive
  />
  <BentoItem
    title="Card"
    badge={<Badge>Novo</Badge>}
    variant="dark"
  />
</BentoGrid>`}
        />
      </Section>

      {/* Glassmorphism Section */}
      <Section id="glass" title="Glassmorphism">
        <p className={styles.componentDescription}>
          Efeitos de vidro fosco inspirados no iOS e macOS. Usa backdrop-filter para blur.
        </p>

        <div className={styles.subsection} style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: 'var(--space-6)', borderRadius: 'var(--radius-lg)' }}>
          <h3 style={{ color: 'white', marginBottom: 'var(--space-4)' }}>Sobre Fundo Colorido</h3>
          <div className={styles.componentRow} style={{ flexWrap: 'wrap', gap: 'var(--space-4)' }}>
            <GlassCard style={{ width: 200 }}>
              <h4 style={{ margin: '0 0 8px 0' }}>Glass Card</h4>
              <p style={{ margin: 0, fontSize: 14 }}>Conteudo com efeito de vidro</p>
            </GlassCard>
            <Glass variant="dark" rounded="lg" style={{ padding: 'var(--space-4)', width: 200 }}>
              <h4 style={{ margin: '0 0 8px 0' }}>Dark Glass</h4>
              <p style={{ margin: 0, fontSize: 14 }}>Variante escura</p>
            </Glass>
          </div>
          <div style={{ marginTop: 'var(--space-4)', display: 'flex', gap: 'var(--space-3)' }}>
            <GlassButton>Glass Button</GlassButton>
            <GlassBadge>Badge</GlassBadge>
            <GlassBadge variant="tinted">Tinted</GlassBadge>
          </div>
        </div>

        <CodeBlock
          code={`import { Glass, GlassCard, GlassButton, GlassBadge } from '@/shared/components'

<GlassCard>
  <h4>Glass Card</h4>
  <p>Conteudo...</p>
</GlassCard>

<Glass
  variant="dark" // 'light' | 'dark' | 'frosted' | 'subtle' | 'tinted'
  blur="lg" // 'sm' | 'md' | 'lg' | 'xl'
  rounded="xl"
  gradientBorder
  glow
>
  Conteudo customizado
</Glass>

<GlassButton>Botao</GlassButton>
<GlassBadge variant="tinted">Badge</GlassBadge>`}
        />
      </Section>

      {/* Dashboard Patterns Section */}
      <Section id="dashboard" title="Dashboard Patterns">
        <p className={styles.componentDescription}>
          Componentes padronizados para dashboards de metricas. Use estes padroes para manter consistencia
          visual entre Revenue Dashboard, Ads Dashboard e futuros dashboards.
        </p>

        <div className={styles.subsection}>
          <h3>Summary Cards Grid</h3>
          <p className={styles.componentDescription}>
            Grid responsivo de cards de metricas. Adapta de 6 colunas (desktop) para 1 coluna (mobile).
          </p>
          <SummaryCardsGrid
            cards={[
              { icon: DollarSign, label: 'Receita', value: 'R$ 1.234,56', color: '#10B981' },
              { icon: Eye, label: 'Impressoes', value: '123.456', color: '#3B82F6' },
              { icon: MousePointer, label: 'Cliques', value: '4.567', color: '#8B5CF6' },
              { icon: TrendingUp, label: 'CTR', value: '3.71%', color: '#F59E0B' },
              { icon: Target, label: 'Conversoes', value: '89', color: '#10B981' },
              { icon: ShoppingCart, label: 'CPA', value: 'R$ 13,87', color: '#EC4899' },
            ]}
          />
        </div>

        <div className={styles.subsection}>
          <h3>Summary Cards Loading</h3>
          <SummaryCardsGrid
            cards={[
              { icon: DollarSign, label: 'Receita', value: '', color: '#10B981' },
              { icon: Eye, label: 'Impressoes', value: '', color: '#3B82F6' },
              { icon: MousePointer, label: 'Cliques', value: '', color: '#8B5CF6' },
              { icon: TrendingUp, label: 'CTR', value: '', color: '#F59E0B' },
              { icon: Target, label: 'Conversoes', value: '', color: '#10B981' },
              { icon: ShoppingCart, label: 'CPA', value: '', color: '#EC4899' },
            ]}
            isLoading
          />
        </div>

        <div className={styles.subsection}>
          <h3>Table Toolbar</h3>
          <p className={styles.componentDescription}>
            Toolbar padronizada para tabelas de dados com busca, filtros, seletor de colunas e exportacao.
          </p>
          <TableToolbar
            searchValue=""
            onSearchChange={() => {}}
            searchPlaceholder="Buscar campanha ou conta..."
            columns={[
              { id: 'name', label: 'Nome', visible: true, required: true },
              { id: 'impressions', label: 'Impressoes', visible: true },
              { id: 'clicks', label: 'Cliques', visible: true },
              { id: 'ctr', label: 'CTR', visible: true },
              { id: 'cost', label: 'Custo', visible: true },
              { id: 'conversions', label: 'Conversoes', visible: false },
            ]}
            onColumnsChange={() => {}}
            onExportCSV={() => showToast.success('Exportando CSV...')}
            onExportXLSX={() => showToast.success('Exportando Excel...')}
            filters={
              <select className={styles.demoSelect}>
                <option>Todos os status</option>
                <option>Ativo</option>
                <option>Pausado</option>
              </select>
            }
          />
          <div className={styles.toolbarPreview}>
            <span>Conteudo da tabela apareceria aqui...</span>
          </div>
        </div>

        <div className={styles.subsection}>
          <h3>Cores de Metricas</h3>
          <p className={styles.componentDescription}>
            Cores padronizadas por tipo de metrica para consistencia visual.
          </p>
          <div className={styles.metricColorsGrid}>
            <div className={styles.metricColorItem}>
              <div className={styles.metricColorSwatch} style={{ backgroundColor: '#10B981' }} />
              <span>Receita / Conversoes</span>
              <code>#10B981</code>
            </div>
            <div className={styles.metricColorItem}>
              <div className={styles.metricColorSwatch} style={{ backgroundColor: '#EF4444' }} />
              <span>Gasto / Custo</span>
              <code>#EF4444</code>
            </div>
            <div className={styles.metricColorItem}>
              <div className={styles.metricColorSwatch} style={{ backgroundColor: '#3B82F6' }} />
              <span>Impressoes</span>
              <code>#3B82F6</code>
            </div>
            <div className={styles.metricColorItem}>
              <div className={styles.metricColorSwatch} style={{ backgroundColor: '#8B5CF6' }} />
              <span>Cliques</span>
              <code>#8B5CF6</code>
            </div>
            <div className={styles.metricColorItem}>
              <div className={styles.metricColorSwatch} style={{ backgroundColor: '#F59E0B' }} />
              <span>CTR / Taxas</span>
              <code>#F59E0B</code>
            </div>
            <div className={styles.metricColorItem}>
              <div className={styles.metricColorSwatch} style={{ backgroundColor: '#EC4899' }} />
              <span>CPC / CPA / RPM</span>
              <code>#EC4899</code>
            </div>
          </div>
        </div>

        <div className={styles.subsection}>
          <h3>Platform Badges</h3>
          <p className={styles.componentDescription}>
            Badges para identificar a plataforma de origem dos dados.
          </p>
          <div className={styles.componentRow}>
            <span className={styles.platformBadgeGoogle}>Google</span>
            <span className={styles.platformBadgeMeta}>Meta</span>
            <span className={styles.platformBadgeAdManager}>Ad Manager</span>
            <span className={styles.platformBadgeAdSense}>AdSense</span>
          </div>
        </div>

        <div className={styles.subsection}>
          <h3>Refresh Button (Cache Status)</h3>
          <p className={styles.componentDescription}>
            Botao de refresh padronizado com indicador de tempo desde ultima atualizacao.
            O tempo e exibido dentro do botao, nao como elemento separado.
          </p>
          <div className={styles.componentRow}>
            <Button variant="secondary" size="sm" leftIcon={<RefreshCw size={16} />}>
              {'< 1 min'}
            </Button>
            <Button variant="secondary" size="sm" leftIcon={<RefreshCw size={16} />}>
              Ha 5 min
            </Button>
            <Button variant="secondary" size="sm" leftIcon={<RefreshCw size={16} />}>
              Ha 2h
            </Button>
            <Button variant="secondary" size="sm" leftIcon={<RefreshCw size={16} />} disabled>
              Atualizando...
            </Button>
          </div>
          <div className={styles.refreshTimeTable}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>Intervalo</TableHeader>
                  <TableHeader>Formato</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>{'< 1 minuto'}</TableCell>
                  <TableCell><code>{'< 1 min'}</code></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>1 minuto</TableCell>
                  <TableCell><code>Ha 1 min</code></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>2-59 minutos</TableCell>
                  <TableCell><code>Ha X min</code></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>1 hora</TableCell>
                  <TableCell><code>Ha 1h</code></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>2+ horas</TableCell>
                  <TableCell><code>Ha Xh</code></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>1+ dia</TableCell>
                  <TableCell><code>Ha X dia(s)</code></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Durante refresh</TableCell>
                  <TableCell><code>Atualizando...</code></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>

        <div className={styles.subsection}>
          <h3>DataGrid Structure</h3>
          <p className={styles.componentDescription}>
            Estrutura padronizada para tabelas de dados com toolbar, header, body e pagination.
            Implementacao customizada usando HTML table nativo (sem AG Grid ou TanStack Table).
          </p>
          <div className={styles.dataGridStructure}>
            <div className={styles.dataGridDiagram}>
              <div className={styles.diagramToolbar}>
                <span>[Search] [Filtros]</span>
                <span>[Colunas] [AutoFit] [Exportar]</span>
              </div>
              <div className={styles.diagramDivider} />
              <div className={styles.diagramHeader}>
                <span>STATUS</span>
                <span>CAMPANHA</span>
                <span>IMPRESSOES</span>
                <span>CLIQUES</span>
                <span>ACOES</span>
              </div>
              <div className={styles.diagramBody}>
                <span>Rows com dados...</span>
              </div>
              <div className={styles.diagramPagination}>
                <span>Mostrando 1-20 de 100</span>
                <span>[1] [2] [3] ... [5]</span>
              </div>
            </div>
          </div>
          <div className={styles.dataGridSpecs}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>Elemento</TableHeader>
                  <TableHeader>Especificacao</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>Toolbar</TableCell>
                  <TableCell><code>border-bottom: none</code> + <code>border-radius: lg lg 0 0</code></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Linha divisoria</TableCell>
                  <TableCell><code>border-top</code> do table container (1px solid)</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Header font-size</TableCell>
                  <TableCell><code>var(--font-size-xs)</code> (12px) + uppercase</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Altura toolbar elements</TableCell>
                  <TableCell><code>36px</code> (search, select, buttons)</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Cell padding</TableCell>
                  <TableCell><code>var(--space-3) var(--space-4)</code></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Numeros</TableCell>
                  <TableCell><code>font-variant-numeric: tabular-nums</code></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>

        <CodeBlock
          code={`import { SummaryCardsGrid, TableToolbar, type CardConfig, type ColumnConfig } from '@/shared/components'

// Summary Cards
const cards: CardConfig[] = [
  { icon: DollarSign, label: 'Receita', value: 'R$ 1.234,56', color: '#10B981' },
  { icon: Eye, label: 'Impressoes', value: '123.456', color: '#3B82F6' },
  // ... mais cards
]

<SummaryCardsGrid cards={cards} isLoading={isLoading} />

// Table Toolbar
const columns: ColumnConfig[] = [
  { id: 'name', label: 'Nome', visible: true, required: true },
  { id: 'impressions', label: 'Impressoes', visible: true },
  // ... mais colunas
]

<TableToolbar
  searchValue={search}
  onSearchChange={setSearch}
  columns={columns}
  onColumnsChange={setColumns}
  onExportCSV={handleExportCSV}
  onExportXLSX={handleExportXLSX}
  filters={<CustomFilters />}
/>`}
        />
      </Section>

      {/* Responsive Design Section */}
      <Section id="responsive" title="Design Responsivo">
        <p className={styles.componentDescription}>
          Diretrizes e padroes para criar interfaces que funcionam bem em todos os dispositivos.
          Uma parcela significativa dos usuarios acessa o sistema apenas via mobile.
        </p>

        <div className={styles.subsection}>
          <h3>Viewport Atual</h3>
          <div className={styles.viewportIndicator}>
            {viewportWidth}px - {getBreakpointName(viewportWidth)}
          </div>
          <p className={styles.componentDescription}>
            Redimensione a janela para ver como os componentes se adaptam a diferentes tamanhos de tela.
          </p>
        </div>

        <div className={styles.subsection}>
          <h3>Breakpoints</h3>
          <p className={styles.componentDescription}>
            Use esses breakpoints consistentemente em todo o projeto para comportamento responsivo previsivel.
          </p>
          <div className={styles.breakpointsGrid}>
            {[
              { name: 'xs', value: '480px', desc: 'Mobile pequeno', icon: <Smartphone size={16} /> },
              { name: 'sm', value: '640px', desc: 'Mobile', icon: <Smartphone size={16} /> },
              { name: 'md', value: '768px', desc: 'Tablet', icon: <Tablet size={16} /> },
              { name: 'lg', value: '1024px', desc: 'Desktop', icon: <Monitor size={16} /> },
              { name: 'xl', value: '1280px', desc: 'Desktop grande', icon: <Monitor size={16} /> },
              { name: '2xl', value: '1536px', desc: 'Desktop extra large', icon: <Monitor size={16} /> },
            ].map(({ name, value, desc, icon }) => (
              <div key={name} className={styles.breakpointItem}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  {icon}
                  <span className={styles.breakpointName}>{name}</span>
                </div>
                <span className={styles.breakpointValue}>{value}</span>
                <span className={styles.breakpointDesc}>{desc}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.subsection}>
          <h3>Touch Targets</h3>
          <p className={styles.componentDescription}>
            Elementos interativos devem ter tamanho minimo de 44x44px (Apple HIG) para serem facilmente tocaveis.
            Prefira 48px para melhor usabilidade.
          </p>
          <div className={styles.touchTargetDemo}>
            <div className={styles.touchTarget}>
              <div className={styles.touchTargetBox} style={{ width: 32, height: 32 }}>
                <X size={14} />
              </div>
              <span className={styles.touchTargetLabel}>32px<br/><Badge variant="error" size="sm">Ruim</Badge></span>
            </div>
            <div className={styles.touchTarget}>
              <div className={styles.touchTargetBox} style={{ width: 44, height: 44 }}>
                <X size={16} />
              </div>
              <span className={styles.touchTargetLabel}>44px<br/><Badge variant="warning" size="sm">Minimo</Badge></span>
            </div>
            <div className={styles.touchTarget}>
              <div className={styles.touchTargetBox} style={{ width: 48, height: 48 }}>
                <X size={18} />
              </div>
              <span className={styles.touchTargetLabel}>48px<br/><Badge variant="success" size="sm">Ideal</Badge></span>
            </div>
            <div className={styles.touchTarget}>
              <div className={styles.touchTargetBox} style={{ width: 56, height: 56 }}>
                <X size={20} />
              </div>
              <span className={styles.touchTargetLabel}>56px<br/><Badge variant="info" size="sm">Confortavel</Badge></span>
            </div>
          </div>
        </div>

        <div className={styles.subsection}>
          <h3>Padroes Mobile-First</h3>
          <p className={styles.componentDescription}>
            Desenvolva primeiro para mobile e adicione complexidade para telas maiores.
          </p>
          <div className={styles.mobilePatternsList}>
            <div className={styles.mobilePattern}>
              <div className={styles.mobilePatternIcon}>
                <Smartphone size={24} />
              </div>
              <div className={styles.mobilePatternContent}>
                <h4>Stack em Mobile</h4>
                <p>Componentes lado a lado em desktop devem empilhar verticalmente em mobile.</p>
              </div>
            </div>
            <div className={styles.mobilePattern}>
              <div className={styles.mobilePatternIcon}>
                <MousePointer size={24} />
              </div>
              <div className={styles.mobilePatternContent}>
                <h4>Touch-Friendly</h4>
                <p>Botoes e links devem ter pelo menos 44px de altura. Espacamento generoso entre elementos.</p>
              </div>
            </div>
            <div className={styles.mobilePattern}>
              <div className={styles.mobilePatternIcon}>
                <FileText size={24} />
              </div>
              <div className={styles.mobilePatternContent}>
                <h4>Tipografia Adaptavel</h4>
                <p>Reduza o tamanho dos titulos em telas menores. Use --font-display-sm em vez de --font-display-md.</p>
              </div>
            </div>
            <div className={styles.mobilePattern}>
              <div className={styles.mobilePatternIcon}>
                <ChevronRight size={24} />
              </div>
              <div className={styles.mobilePatternContent}>
                <h4>Navegacao Horizontal</h4>
                <p>Use scroll horizontal com overflow-x: auto para navegacoes longas em mobile.</p>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.subsection}>
          <h3>Boas Praticas vs Erros Comuns</h3>
          <div className={styles.responsiveComparison}>
            <div className={`${styles.comparisonPanel} ${styles.good}`}>
              <div className={styles.comparisonHeader}>
                <CheckCircle size={18} />
                Correto
              </div>
              <div className={styles.comparisonContent}>
                Use unidades relativas e variaveis CSS para espacamento.
                <code>{`padding: var(--space-4);
gap: var(--space-3);
font: var(--font-body-md);`}</code>
              </div>
            </div>
            <div className={`${styles.comparisonPanel} ${styles.bad}`}>
              <div className={styles.comparisonHeader}>
                <X size={18} />
                Incorreto
              </div>
              <div className={styles.comparisonContent}>
                Valores fixos dificultam responsividade.
                <code>{`padding: 24px;
gap: 16px;
font-size: 16px;`}</code>
              </div>
            </div>
          </div>
          <div className={styles.responsiveComparison}>
            <div className={`${styles.comparisonPanel} ${styles.good}`}>
              <div className={styles.comparisonHeader}>
                <CheckCircle size={18} />
                Correto
              </div>
              <div className={styles.comparisonContent}>
                Grid responsivo com minmax para colunas fluidas.
                <code>{`grid-template-columns:
  repeat(auto-fill,
    minmax(280px, 1fr));`}</code>
              </div>
            </div>
            <div className={`${styles.comparisonPanel} ${styles.bad}`}>
              <div className={styles.comparisonHeader}>
                <X size={18} />
                Incorreto
              </div>
              <div className={styles.comparisonContent}>
                Numero fixo de colunas quebra em mobile.
                <code>{`grid-template-columns:
  repeat(4, 1fr);`}</code>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.subsection}>
          <h3>Checklist Mobile</h3>
          <div className={styles.guidelinesList}>
            <div className={styles.guidelineItem}>
              <div className={styles.guidelineIcon}><CheckCircle size={16} /></div>
              <div className={styles.guidelineText}>
                <strong>Touch targets:</strong> Minimo 44px de altura para elementos clicaveis.
              </div>
            </div>
            <div className={styles.guidelineItem}>
              <div className={styles.guidelineIcon}><CheckCircle size={16} /></div>
              <div className={styles.guidelineText}>
                <strong>Espacamento:</strong> Use var(--space-3) ou mais entre elementos interativos.
              </div>
            </div>
            <div className={styles.guidelineItem}>
              <div className={styles.guidelineIcon}><CheckCircle size={16} /></div>
              <div className={styles.guidelineText}>
                <strong>Scroll horizontal:</strong> Use para navegacoes e tabs com -webkit-overflow-scrolling: touch.
              </div>
            </div>
            <div className={styles.guidelineItem}>
              <div className={styles.guidelineIcon}><CheckCircle size={16} /></div>
              <div className={styles.guidelineText}>
                <strong>Modais:</strong> Em mobile, modais devem ocupar a tela inteira ou deslizar de baixo.
              </div>
            </div>
            <div className={styles.guidelineItem}>
              <div className={styles.guidelineIcon}><CheckCircle size={16} /></div>
              <div className={styles.guidelineText}>
                <strong>Tabelas:</strong> Use scroll horizontal ou transforme em cards empilhados.
              </div>
            </div>
            <div className={styles.guidelineItem}>
              <div className={styles.guidelineIcon}><CheckCircle size={16} /></div>
              <div className={styles.guidelineText}>
                <strong>Formularios:</strong> Inputs devem ser full-width em mobile. Use type correto (email, tel, number).
              </div>
            </div>
          </div>
        </div>

        <CodeBlock
          code={`/* Mobile-first: comece com mobile, adicione para desktop */
.container {
  padding: var(--space-3);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

/* Tablet e acima */
@media (min-width: 768px) {
  .container {
    padding: var(--space-4);
    flex-direction: row;
    gap: var(--space-4);
  }
}

/* Desktop */
@media (min-width: 1024px) {
  .container {
    padding: var(--space-6);
    max-width: var(--container-xl);
    margin: 0 auto;
  }
}

/* Touch targets minimos */
.button, .link, .input {
  min-height: var(--touch-target-min); /* 44px */
}

/* Grid responsivo automatico */
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-4);
}

/* Navegacao com scroll horizontal */
.nav {
  display: flex;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}

.nav::-webkit-scrollbar {
  display: none;
}`}
          language="css"
        />
      </Section>

      {/* States Section */}
      <Section id="states" title="Estados">
        <div className={styles.subsection}>
          <h3>Loading</h3>
          <div className={styles.componentRow}>
            <Spinner size="sm" />
            <Spinner size="md" />
            <Spinner size="lg" />
          </div>
        </div>

        <div className={styles.subsection}>
          <h3>Empty State</h3>
          <EmptyState
            title="Nenhum item encontrado"
            description="Comece adicionando seu primeiro item."
            action={<Button leftIcon={<Plus size={16} />}>Adicionar</Button>}
          />
        </div>

        <CodeBlock
          code={`import { Spinner, EmptyState, Button } from '@/shared/components'

<Spinner size="md" />

<EmptyState
  title="Nenhum projeto"
  description="Crie seu primeiro projeto."
  action={<Button>Criar Projeto</Button>}
/>`}
        />
      </Section>

      {/* Page Layout Section */}
      <Section id="layout" title="Layout de Pagina">
        <div className={styles.layoutGuide}>
          <div className={styles.layoutItem}>
            <h4>Container</h4>
            <code>max-width: 1400px</code>
            <p>Padrao para a maioria das paginas</p>
          </div>
          <div className={styles.layoutItem}>
            <h4>Padding</h4>
            <code>padding: var(--space-6)</code>
            <p>Espacamento interno do container</p>
          </div>
          <div className={styles.layoutItem}>
            <h4>Breakpoints</h4>
            <code>1024px | 768px | 640px</code>
            <p>Tablet | Mobile | Small Mobile</p>
          </div>
        </div>

        <CodeBlock
          code={`.container {
  max-width: 1400px;
  margin: 0 auto;
  padding: var(--space-6);
}

@media (max-width: 768px) {
  .container {
    padding: var(--space-4);
  }
}`}
          language="css"
        />
      </Section>

      {/* Animations Section */}
      <Section id="animations" title="Animacoes e Micro-interacoes">
        <p className={styles.componentDescription}>
          Sistema de animacoes leve e performatico para criar interfaces fluidas e responsivas.
          Todas as animacoes usam apenas transform e opacity para garantir 60fps.
        </p>

        <div className={styles.subsection}>
          <h3>Demos Interativas</h3>
          <p className={styles.componentDescription}>
            Passe o mouse sobre os cards para ver cada animacao em acao.
          </p>
          <div className={styles.animationDemoGrid}>
            <div className={`${styles.animationDemo} ${styles.demoFadeIn}`}>
              <div className={styles.animationDemoBox} />
              <span className={styles.animationDemoLabel}>Fade In</span>
              <code className={styles.animationDemoCode}>fadeIn</code>
            </div>
            <div className={`${styles.animationDemo} ${styles.demoScaleIn}`}>
              <div className={styles.animationDemoBox} />
              <span className={styles.animationDemoLabel}>Scale In</span>
              <code className={styles.animationDemoCode}>scaleIn</code>
            </div>
            <div className={`${styles.animationDemo} ${styles.demoSlideDown}`}>
              <div className={styles.animationDemoBox} />
              <span className={styles.animationDemoLabel}>Slide Down</span>
              <code className={styles.animationDemoCode}>slideInFromTop</code>
            </div>
            <div className={`${styles.animationDemo} ${styles.demoSlideUp}`}>
              <div className={styles.animationDemoBox} />
              <span className={styles.animationDemoLabel}>Slide Up</span>
              <code className={styles.animationDemoCode}>slideInFromBottom</code>
            </div>
            <div className={`${styles.animationDemo} ${styles.demoBounce}`}>
              <div className={styles.animationDemoBox} />
              <span className={styles.animationDemoLabel}>Bounce</span>
              <code className={styles.animationDemoCode}>bounce</code>
            </div>
            <div className={`${styles.animationDemo} ${styles.demoSpring}`}>
              <div className={styles.animationDemoBox} />
              <span className={styles.animationDemoLabel}>Spring</span>
              <code className={styles.animationDemoCode}>cubic-bezier</code>
            </div>
            <div className={`${styles.animationDemo} ${styles.demoPulse}`}>
              <div className={styles.animationDemoBox} />
              <span className={styles.animationDemoLabel}>Pulse</span>
              <code className={styles.animationDemoCode}>pulse</code>
            </div>
            <div className={`${styles.animationDemo} ${styles.demoShake}`}>
              <div className={styles.animationDemoBox} />
              <span className={styles.animationDemoLabel}>Shake</span>
              <code className={styles.animationDemoCode}>shake</code>
            </div>
            <div className={`${styles.animationDemo} ${styles.demoSpin}`}>
              <div className={styles.animationDemoBox} />
              <span className={styles.animationDemoLabel}>Spin</span>
              <code className={styles.animationDemoCode}>spin</code>
            </div>
          </div>
        </div>

        <div className={styles.subsection}>
          <h3>Button Press Effect</h3>
          <p className={styles.componentDescription}>
            Clique nos botoes para ver o efeito de pressionamento sutil.
          </p>
          <div className={styles.componentRow}>
            <Button variant="primary">Clique-me</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="danger">Danger</Button>
          </div>
        </div>

        <div className={styles.subsection}>
          <h3>Interactive Cards</h3>
          <p className={styles.componentDescription}>
            Cards interativos elevam ao passar o mouse, criando profundidade visual.
          </p>
          <div className={styles.cardDemoGrid}>
            <Card interactive>
              <CardBody>
                <h4 style={{ margin: '0 0 8px 0' }}>Card Interativo</h4>
                <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>
                  Passe o mouse para ver a elevacao.
                </p>
              </CardBody>
            </Card>
            <Card interactive variant="elevated">
              <CardBody>
                <h4 style={{ margin: '0 0 8px 0' }}>Card Elevated</h4>
                <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>
                  Combina interactive + elevated.
                </p>
              </CardBody>
            </Card>
            <Card interactive>
              <CardBody>
                <h4 style={{ margin: '0 0 8px 0' }}>Navegacao</h4>
                <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>
                  Ideal para itens navegaveis.
                </p>
              </CardBody>
            </Card>
          </div>
        </div>

        <div className={styles.subsection}>
          <h3>Transicoes CSS</h3>
          <p className={styles.componentDescription}>
            Variaveis de transicao para manter consistencia em todo o sistema.
          </p>
          <div className={styles.transitionGrid}>
            <div className={styles.transitionItem}>
              <div className={styles.transitionDemo} data-speed="fast">
                <div className={styles.transitionBox} />
              </div>
              <div className={styles.transitionInfo}>
                <code>--transition-fast</code>
                <span>0.15s ease</span>
                <p>Micro-interacoes: hover, focus, toggle</p>
              </div>
            </div>
            <div className={styles.transitionItem}>
              <div className={styles.transitionDemo} data-speed="normal">
                <div className={styles.transitionBox} />
              </div>
              <div className={styles.transitionInfo}>
                <code>--transition-normal</code>
                <span>0.2s ease</span>
                <p>Elementos de UI: dropdown, tooltip</p>
              </div>
            </div>
            <div className={styles.transitionItem}>
              <div className={styles.transitionDemo} data-speed="slow">
                <div className={styles.transitionBox} />
              </div>
              <div className={styles.transitionInfo}>
                <code>--transition-slow</code>
                <span>0.3s ease</span>
                <p>Modais, paineis, navegacao</p>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.subsection}>
          <h3>Keyframes Disponiveis</h3>
          <p className={styles.componentDescription}>
            Animacoes pre-definidas em animations.css que podem ser usadas em qualquer componente.
          </p>
          <div className={styles.keyframesList}>
            <div className={styles.keyframeItem}>
              <code>fadeIn / fadeOut</code>
              <span>Transicao suave de opacidade</span>
            </div>
            <div className={styles.keyframeItem}>
              <code>scaleIn / scaleOut</code>
              <span>Escala com opacidade</span>
            </div>
            <div className={styles.keyframeItem}>
              <code>slideInFromTop</code>
              <span>Desliza de cima (dropdowns)</span>
            </div>
            <div className={styles.keyframeItem}>
              <code>slideInFromBottom</code>
              <span>Desliza de baixo (modais mobile)</span>
            </div>
            <div className={styles.keyframeItem}>
              <code>slideInFromRight</code>
              <span>Desliza da direita (toasts)</span>
            </div>
            <div className={styles.keyframeItem}>
              <code>shake</code>
              <span>Tremida para erros</span>
            </div>
            <div className={styles.keyframeItem}>
              <code>pulse</code>
              <span>Pulsacao para atencao</span>
            </div>
            <div className={styles.keyframeItem}>
              <code>spin</code>
              <span>Rotacao para loading</span>
            </div>
            <div className={styles.keyframeItem}>
              <code>bounce</code>
              <span>Quique para feedback</span>
            </div>
            <div className={styles.keyframeItem}>
              <code>ripple</code>
              <span>Onda para cliques</span>
            </div>
          </div>
        </div>

        <div className={styles.subsection}>
          <h3>Principios de Animacao</h3>
          <div className={styles.principlesGrid}>
            <Card padding="sm">
              <CardBody>
                <h4>Proposito</h4>
                <p>Animacoes devem ter um proposito claro: feedback, orientacao ou hierarquia.</p>
              </CardBody>
            </Card>
            <Card padding="sm">
              <CardBody>
                <h4>Sutileza</h4>
                <p>Prefira animacoes sutis. Movimentos exagerados distraem o usuario.</p>
              </CardBody>
            </Card>
            <Card padding="sm">
              <CardBody>
                <h4>Performance</h4>
                <p>Use apenas transform e opacity para animacoes. Evite layout thrashing.</p>
              </CardBody>
            </Card>
            <Card padding="sm">
              <CardBody>
                <h4>Acessibilidade</h4>
                <p>Respeite prefers-reduced-motion para usuarios sensiveis a movimento.</p>
              </CardBody>
            </Card>
          </div>
        </div>

        <div className={styles.subsection}>
          <h3>Componentes com Animacao</h3>
          <div className={styles.interactionList}>
            <div className={styles.interactionItem}>
              <span className={styles.interactionName}>Button</span>
              <span className={styles.interactionValue}>Press effect (translateY + scale)</span>
            </div>
            <div className={styles.interactionItem}>
              <span className={styles.interactionName}>Card interactive</span>
              <span className={styles.interactionValue}>Hover lift (translateY -2px + shadow)</span>
            </div>
            <div className={styles.interactionItem}>
              <span className={styles.interactionName}>Modal</span>
              <span className={styles.interactionValue}>Spring animation (scale + fade)</span>
            </div>
            <div className={styles.interactionItem}>
              <span className={styles.interactionName}>Dropdown / Select</span>
              <span className={styles.interactionValue}>Slide down + fade (transform-origin: top)</span>
            </div>
            <div className={styles.interactionItem}>
              <span className={styles.interactionName}>MultiSelect Tags</span>
              <span className={styles.interactionValue}>Scale + fade in ao adicionar</span>
            </div>
            <div className={styles.interactionItem}>
              <span className={styles.interactionName}>Toast</span>
              <span className={styles.interactionValue}>Slide in from right</span>
            </div>
            <div className={styles.interactionItem}>
              <span className={styles.interactionName}>Spinner</span>
              <span className={styles.interactionValue}>Rotate infinito</span>
            </div>
          </div>
        </div>

        <CodeBlock
          code={`/* Importar animacoes globais */
@import './assets/styles/animations.css';

/* Usar transicoes padrao */
.myComponent {
  transition: all var(--transition-fast);
}

/* Spring animation (bounce natural) */
.modal {
  animation: contentSlideIn 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* Button press effect */
.button:active:not(:disabled) {
  transform: translateY(1px) scale(0.98);
}

/* Card hover lift */
.card.interactive:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

/* Dropdown slide */
.dropdown {
  animation: dropdownSlideIn var(--transition-fast) ease-out;
  transform-origin: top center;
}

@keyframes dropdownSlideIn {
  from { opacity: 0; transform: translateY(-4px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

/* Respeitar preferencias do usuario */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}`}
          language="css"
        />
      </Section>
    </div>
  )
}
