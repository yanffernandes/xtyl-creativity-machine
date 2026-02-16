import { useState } from 'react'
import { ArrowLeft, Package, Plus, X, Sparkles, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button, Input } from '@/shared/components'
import styles from './BulkProductPage.module.css'

interface ProductItem {
  id: string
  name: string
  description: string
  url: string
  price?: number
}

interface CampaignPreview {
  productName: string
  keywords: string[]
  headlines: string[]
  descriptions: string[]
  budget: number
}

export function BulkProductPage() {
  const navigate = useNavigate()

  // Products state
  const [products, setProducts] = useState<ProductItem[]>([])
  const [newProduct, setNewProduct] = useState({ name: '', description: '', url: '', price: '' })

  // AI Settings
  const [generateKeywords, setGenerateKeywords] = useState(true)
  const [generateHeadlines, setGenerateHeadlines] = useState(true)
  const [keywordsPerProduct, setKeywordsPerProduct] = useState(10)
  const [baseBudget, setBaseBudget] = useState(50)

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false)
  const [previews, setPreviews] = useState<CampaignPreview[]>([])
  const [step, setStep] = useState<'products' | 'settings' | 'preview' | 'generating'>('products')

  const handleAddProduct = () => {
    if (!newProduct.name.trim() || !newProduct.url.trim()) return

    const product: ProductItem = {
      id: Date.now().toString(),
      name: newProduct.name.trim(),
      description: newProduct.description.trim(),
      url: newProduct.url.trim(),
      price: newProduct.price ? Number(newProduct.price) : undefined,
    }

    setProducts(prev => [...prev, product])
    setNewProduct({ name: '', description: '', url: '', price: '' })
  }

  const handleRemoveProduct = (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id))
  }

  const handleGeneratePreview = async () => {
    setStep('generating')
    setIsGenerating(true)

    // Simulate AI generation
    await new Promise(resolve => setTimeout(resolve, 2000))

    const generatedPreviews: CampaignPreview[] = products.map(product => ({
      productName: product.name,
      keywords: [
        product.name.toLowerCase(),
        `comprar ${product.name.toLowerCase()}`,
        `${product.name.toLowerCase()} preço`,
        `melhor ${product.name.toLowerCase()}`,
        `${product.name.toLowerCase()} online`,
      ],
      headlines: [
        `${product.name} - Compre Agora`,
        `Melhor ${product.name} do Brasil`,
        `${product.name} com Desconto`,
      ],
      descriptions: [
        `Encontre o melhor ${product.name} com os melhores preços. Entrega rápida e garantida.`,
        `${product.name} de qualidade. Satisfação garantida ou seu dinheiro de volta.`,
      ],
      budget: baseBudget,
    }))

    setPreviews(generatedPreviews)
    setIsGenerating(false)
    setStep('preview')
  }

  const handleCreateCampaigns = async () => {
    setStep('generating')
    setIsGenerating(true)

    await new Promise(resolve => setTimeout(resolve, 3000))

    setIsGenerating(false)
    navigate('/alvoads-google')
  }

  const handleBack = () => {
    if (step === 'settings') setStep('products')
    else if (step === 'preview') setStep('settings')
    else navigate('/alvoads-google')
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <button type="button" className={styles.backButton} onClick={handleBack}>
            <ArrowLeft size={20} />
          </button>
          <div className={styles.headerTitle}>
            <Package size={20} className={styles.headerIcon} />
            <h1>Campanhas por Produto</h1>
          </div>
        </div>
        <div className={styles.headerRight}>
          {step === 'products' && products.length > 0 && (
            <Button variant="primary" onClick={() => setStep('settings')}>
              Configurar AI ({products.length} produtos)
            </Button>
          )}
          {step === 'settings' && (
            <Button
              variant="primary"
              leftIcon={<Sparkles size={16} />}
              onClick={handleGeneratePreview}
            >
              Gerar com IA
            </Button>
          )}
          {step === 'preview' && (
            <Button
              variant="primary"
              onClick={handleCreateCampaigns}
              disabled={isGenerating}
            >
              Criar {previews.length} Campanhas
            </Button>
          )}
        </div>
      </header>

      {step === 'products' && (
        <main className={styles.content}>
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Adicionar Produtos</h2>
            <p className={styles.sectionDescription}>
              Adicione os produtos/serviços para os quais deseja criar campanhas.
              A IA irá gerar keywords e anúncios automaticamente.
            </p>

            <div className={styles.addProductForm}>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <Input
                    label="Nome do Produto *"
                    value={newProduct.name}
                    onChange={(e) => setNewProduct(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ex: Curso de Marketing Digital"
                  />
                </div>
                <div className={styles.formGroup}>
                  <Input
                    label="URL *"
                    value={newProduct.url}
                    onChange={(e) => setNewProduct(prev => ({ ...prev, url: e.target.value }))}
                    placeholder="https://seusite.com/produto"
                  />
                </div>
              </div>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <Input
                    label="Descrição (ajuda a IA)"
                    value={newProduct.description}
                    onChange={(e) => setNewProduct(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Breve descrição do produto"
                  />
                </div>
                <div className={styles.formGroup}>
                  <Input
                    label="Preço (opcional)"
                    type="number"
                    value={newProduct.price}
                    onChange={(e) => setNewProduct(prev => ({ ...prev, price: e.target.value }))}
                    placeholder="R$ 0,00"
                  />
                </div>
              </div>
              <Button
                variant="outline"
                leftIcon={<Plus size={16} />}
                onClick={handleAddProduct}
                disabled={!newProduct.name.trim() || !newProduct.url.trim()}
              >
                Adicionar Produto
              </Button>
            </div>

            {products.length > 0 && (
              <div className={styles.productsList}>
                <h3 className={styles.productsListTitle}>
                  Produtos adicionados ({products.length})
                </h3>
                {products.map(product => (
                  <div key={product.id} className={styles.productItem}>
                    <div className={styles.productInfo}>
                      <span className={styles.productName}>{product.name}</span>
                      <span className={styles.productUrl}>{product.url}</span>
                    </div>
                    <button
                      type="button"
                      className={styles.removeButton}
                      onClick={() => handleRemoveProduct(product.id)}
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {products.length === 0 && (
              <div className={styles.emptyState}>
                <Package size={48} className={styles.emptyIcon} />
                <p>Nenhum produto adicionado ainda</p>
                <span>Adicione produtos acima ou importe de uma planilha</span>
              </div>
            )}
          </div>
        </main>
      )}

      {step === 'settings' && (
        <main className={styles.content}>
          <div className={styles.settingsGrid}>
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Configurações de IA</h2>

              <label className={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={generateKeywords}
                  onChange={(e) => setGenerateKeywords(e.target.checked)}
                />
                <span>Gerar palavras-chave automaticamente</span>
              </label>

              {generateKeywords && (
                <div className={styles.formGroup}>
                  <Input
                    label="Keywords por produto"
                    type="number"
                    value={keywordsPerProduct}
                    onChange={(e) => setKeywordsPerProduct(Number(e.target.value))}
                    min={5}
                    max={50}
                  />
                </div>
              )}

              <label className={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={generateHeadlines}
                  onChange={(e) => setGenerateHeadlines(e.target.checked)}
                />
                <span>Gerar headlines e descrições</span>
              </label>
            </div>

            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Configurações de Campanha</h2>

              <div className={styles.formGroup}>
                <Input
                  label="Orçamento diário por campanha (R$)"
                  type="number"
                  value={baseBudget}
                  onChange={(e) => setBaseBudget(Number(e.target.value))}
                  min={1}
                />
              </div>
            </div>
          </div>
        </main>
      )}

      {step === 'preview' && (
        <main className={styles.content}>
          <div className={styles.previewSection}>
            <h2 className={styles.sectionTitle}>Preview das Campanhas Geradas</h2>

            <div className={styles.previewList}>
              {previews.map((preview, index) => (
                <div key={index} className={styles.previewCard}>
                  <h3 className={styles.previewCardTitle}>{preview.productName}</h3>

                  <div className={styles.previewSection}>
                    <span className={styles.previewLabel}>Keywords ({preview.keywords.length})</span>
                    <div className={styles.tagList}>
                      {preview.keywords.map((kw, i) => (
                        <span key={i} className={styles.tag}>{kw}</span>
                      ))}
                    </div>
                  </div>

                  <div className={styles.previewSection}>
                    <span className={styles.previewLabel}>Headlines</span>
                    <div className={styles.headlineList}>
                      {preview.headlines.map((h, i) => (
                        <div key={i} className={styles.headline}>{h}</div>
                      ))}
                    </div>
                  </div>

                  <div className={styles.previewSection}>
                    <span className={styles.previewLabel}>Descrições</span>
                    <div className={styles.descriptionList}>
                      {preview.descriptions.map((d, i) => (
                        <div key={i} className={styles.description}>{d}</div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      )}

      {step === 'generating' && (
        <main className={styles.content}>
          <div className={styles.generatingState}>
            <Loader2 size={48} className={`${styles.generatingIcon} animate-spin`} />
            <h2 className={styles.generatingTitle}>
              {isGenerating ? 'Gerando com IA...' : 'Criando campanhas...'}
            </h2>
            <p className={styles.generatingSubtitle}>
              Isso pode levar alguns segundos
            </p>
          </div>
        </main>
      )}
    </div>
  )
}
