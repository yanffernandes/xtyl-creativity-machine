import { useState, useEffect, useId } from 'react'
import { X, RefreshCw, AlertTriangle, Loader2 } from 'lucide-react'
import { Button, Input, showToast } from '@/shared/components'
import { supabase } from '@/shared/utils/supabase'
import styles from './sidebar.module.css'
import { UtmPreviewSection } from './UtmPreviewSection'
import { useFlowEditorStore } from '../../stores/flowEditorStore'
import { MESSENGER_LIMITS, BRANCH_COLORS,
  type MessengerNodeData,
  type TextNodeData,
  type CardNodeData,
  type WaitNodeData,
  type TrafficNodeData,
  type CallFlowNodeData,
  type CommentNodeData,
  type MessageButton,
  type TrafficBranch,
  type TimeUnit,
  type MessageType,
  type ImageAspectRatio } from '../../types'

interface NodeEditSidebarProps {
  nodeId: string
  nodeType: string
  data: MessengerNodeData
  availableFlows?: Array<{ id: string; name: string }>
  onSave: (nodeId: string, data: MessengerNodeData) => void
  onClose: () => void
  onRefreshFlows?: () => void
}

export function NodeEditSidebar({
  nodeId,
  nodeType,
  data,
  availableFlows = [],
  onSave,
  onClose,
  onRefreshFlows,
}: NodeEditSidebarProps) {
  const [editData, setEditData] = useState<MessengerNodeData>(data)
  const [isUploading, setIsUploading] = useState(false)
  const { flowId, flowName, utmEnabled } = useFlowEditorStore()
  const textMessageTypeId = useId()
  const textMessageBodyId = useId()
  const cardMessageTypeId = useId()
  const cardTitleId = useId()
  const cardSubtitleId = useId()
  const cardImageAspectId = useId()
  const cardUrlId = useId()
  const waitDurationId = useId()
  const callFlowId = useId()
  const commentTextId = useId()

  useEffect(() => {
    setEditData(data)
  }, [data, nodeId])

  const handleSave = () => {
    onSave(nodeId, editData)
    onClose()
  }

  const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

  // Text Node helpers - use nodeType prop instead of editData.type for reliability
  const addButton = () => {
    if (nodeType !== 'text' && nodeType !== 'card') return
    const currentData = editData as TextNodeData | CardNodeData
    const currentButtons = currentData.buttons || []
    if (currentButtons.length >= MESSENGER_LIMITS.MAX_BUTTONS) return

    const newButton: MessageButton = {
      id: generateId(),
      label: '',
      action: 'send_message',
    }

    setEditData({
      ...currentData,
      buttons: [...currentButtons, newButton],
    })
  }

  const removeButton = (index: number) => {
    if (nodeType !== 'text' && nodeType !== 'card') return
    const currentData = editData as TextNodeData | CardNodeData
    const currentButtons = currentData.buttons || []
    setEditData({
      ...currentData,
      buttons: currentButtons.filter((_, i) => i !== index),
    })
  }

  const updateButton = (index: number, updates: Partial<MessageButton>) => {
    if (nodeType !== 'text' && nodeType !== 'card') return
    const currentData = editData as TextNodeData | CardNodeData
    const currentButtons = currentData.buttons || []
    setEditData({
      ...currentData,
      buttons: currentButtons.map((b, i) =>
        i === index ? { ...b, ...updates } : b
      ),
    })
  }

  // Traffic Node helpers
  const addBranch = () => {
    if (editData.type !== 'traffic') return
    const currentData = editData as TrafficNodeData
    const newBranch: TrafficBranch = {
      id: generateId(),
      label: `Opção ${currentData.branches.length + 1}`,
      percentage: 50,
    }
    setEditData({
      ...currentData,
      branches: [...currentData.branches, newBranch],
    })
  }

  const removeBranch = (index: number) => {
    if (editData.type !== 'traffic') return
    const currentData = editData as TrafficNodeData
    setEditData({
      ...currentData,
      branches: currentData.branches.filter((_, i) => i !== index),
    })
  }

  const updateBranch = (index: number, updates: Partial<TrafficBranch>) => {
    if (editData.type !== 'traffic') return
    const currentData = editData as TrafficNodeData
    setEditData({
      ...currentData,
      branches: currentData.branches.map((b, i) =>
        i === index ? { ...b, ...updates } : b
      ),
    })
  }

  const distributeEqually = () => {
    if (editData.type !== 'traffic') return
    const currentData = editData as TrafficNodeData
    const count = currentData.branches.length
    if (count === 0) return
    const equalPercentage = Math.floor(100 / count)
    const remainder = 100 - equalPercentage * count

    setEditData({
      ...currentData,
      branches: currentData.branches.map((b, i) => ({
        ...b,
        percentage: equalPercentage + (i < remainder ? 1 : 0),
      })),
    })
  }

  const getTotalPercentage = () => {
    if (editData.type !== 'traffic') return 0
    return (editData as TrafficNodeData).branches.reduce(
      (sum, b) => sum + b.percentage,
      0
    )
  }

  const getCharCount = (text?: string) => (text || '').length

  const handleImageUpload = async (file: File) => {
    setIsUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `flow-images/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('alvocast/public')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) {
        console.error('Error uploading image:', uploadError)
        showToast.error('Erro ao fazer upload da imagem. Tente novamente.')
        return
      }

      const { data: urlData } = supabase.storage
        .from('alvocast/public')
        .getPublicUrl(filePath)

      if (urlData?.publicUrl) {
        setEditData({
          ...(editData as CardNodeData),
          imageUrl: urlData.publicUrl,
        })
      }
    } catch (error) {
      console.error('Error uploading image:', error)
      showToast.error('Erro ao fazer upload da imagem. Tente novamente.')
    } finally {
      setIsUploading(false)
    }
  }

  const getTextLimit = (hasButtons: boolean) =>
    hasButtons ? MESSENGER_LIMITS.BUTTON_TEMPLATE_TEXT : MESSENGER_LIMITS.TEXT_MESSAGE

  const isNearLimit = (count: number, limit: number) =>
    count >= limit * 0.8 && count < limit

  const isAtLimit = (count: number, limit: number) => count >= limit

  return (
    <div className={styles.sidebar}>
      <div className={styles.sidebarHeader}>
        <h3>Editar Nó</h3>
        <button className={styles.closeBtn} onClick={onClose}>
          <X size={18} />
        </button>
      </div>

      <div className={styles.sidebarContent}>
        {/* Text Node Editor */}
        {nodeType === 'text' && (
          <div className={styles.editForm}>
            <div className={styles.formGroup}>
              <label htmlFor={textMessageTypeId}>Tipo da Mensagem:</label>
              <select
                id={textMessageTypeId}
                value={(editData as TextNodeData).messageType}
                onChange={(e) =>
                  setEditData({
                    ...(editData as TextNodeData),
                    messageType: e.target.value as MessageType,
                  })
                }
              >
                <option value="ACCOUNT_UPDATE">Account Update</option>
                <option value="POST_PURCHASE_UPDATE">Post Purchase Update</option>
                <option value="CONFIRMED_EVENT_UPDATE">Confirmed Event Update</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor={textMessageBodyId}>Texto da Mensagem:</label>
              <textarea
                id={textMessageBodyId}
                value={(editData as TextNodeData).text}
                onChange={(e) =>
                  setEditData({
                    ...(editData as TextNodeData),
                    text: e.target.value,
                  })
                }
                placeholder="Digite sua mensagem..."
                rows={4}
                maxLength={getTextLimit((editData as TextNodeData).buttons.length > 0)}
              />
              <div
                className={`${styles.charCounter} ${
                  isNearLimit(
                    getCharCount((editData as TextNodeData).text),
                    getTextLimit((editData as TextNodeData).buttons.length > 0)
                  )
                    ? styles.warning
                    : ''
                } ${
                  isAtLimit(
                    getCharCount((editData as TextNodeData).text),
                    getTextLimit((editData as TextNodeData).buttons.length > 0)
                  )
                    ? styles.error
                    : ''
                }`}
              >
                {getCharCount((editData as TextNodeData).text)} /{' '}
                {getTextLimit((editData as TextNodeData).buttons.length > 0)}
              </div>
            </div>

            <div className={styles.formGroup}>
              <span className={styles.formLabel}>Botões:</span>
              <div className={styles.buttonsEditor}>
                {(editData as TextNodeData).buttons.map((button, index) => (
                  <div key={button.id} className={styles.buttonEditor}>
                    {/* Label do botão */}
                    <div className={styles.buttonLabelRow}>
                      <input
                        type="text"
                        value={button.label}
                        onChange={(e) =>
                          updateButton(index, { label: e.target.value })
                        }
                        placeholder="Label do botão"
                        maxLength={MESSENGER_LIMITS.BUTTON_TITLE}
                        className={styles.buttonLabelInput}
                      />
                      <button
                        className={styles.removeBtn}
                        onClick={() => removeButton(index)}
                      >
                        ×
                      </button>
                    </div>
                    <div
                      className={`${styles.charCounter} ${
                        isNearLimit(getCharCount(button.label), MESSENGER_LIMITS.BUTTON_TITLE)
                          ? styles.warning
                          : ''
                      } ${
                        isAtLimit(getCharCount(button.label), MESSENGER_LIMITS.BUTTON_TITLE)
                          ? styles.error
                          : ''
                      }`}
                    >
                      {getCharCount(button.label)}/{MESSENGER_LIMITS.BUTTON_TITLE}
                    </div>

                    {/* Ação do botão */}
                    <select
                      value={button.action}
                      onChange={(e) =>
                        updateButton(index, {
                          action: e.target.value as 'send_message' | 'open_website',
                        })
                      }
                      className={styles.buttonActionSelect}
                    >
                      <option value="send_message">Send Message</option>
                      <option value="open_website">Open Website</option>
                    </select>
                    {button.action === 'send_message' && (
                      <div style={{ width: '100%' }}>
                        <input
                          type="text"
                          value={button.message || ''}
                          onChange={(e) =>
                            updateButton(index, { message: e.target.value })
                          }
                          placeholder="Mensagem a ser enviada"
                          maxLength={MESSENGER_LIMITS.BUTTON_PAYLOAD}
                        />
                        <div
                          className={`${styles.charCounter} ${styles.charCounterInline} ${
                            isNearLimit(getCharCount(button.message), MESSENGER_LIMITS.BUTTON_PAYLOAD)
                              ? styles.warning
                              : ''
                          } ${
                            isAtLimit(getCharCount(button.message), MESSENGER_LIMITS.BUTTON_PAYLOAD)
                              ? styles.error
                              : ''
                          }`}
                        >
                          {getCharCount(button.message)}/{MESSENGER_LIMITS.BUTTON_PAYLOAD}
                        </div>
                      </div>
                    )}
                    {button.action === 'open_website' && (
                      <div style={{ width: '100%' }}>
                        <input
                          type="text"
                          value={button.url || ''}
                          onChange={(e) =>
                            updateButton(index, { url: e.target.value })
                          }
                          placeholder="URL do website"
                          maxLength={MESSENGER_LIMITS.BUTTON_URL}
                        />
                        <div
                          className={`${styles.charCounter} ${styles.charCounterInline} ${
                            isNearLimit(getCharCount(button.url), MESSENGER_LIMITS.BUTTON_URL)
                              ? styles.warning
                              : ''
                          } ${
                            isAtLimit(getCharCount(button.url), MESSENGER_LIMITS.BUTTON_URL)
                              ? styles.error
                              : ''
                          }`}
                        >
                          {getCharCount(button.url)}/{MESSENGER_LIMITS.BUTTON_URL}
                        </div>
                        {button.url && (
                          <UtmPreviewSection
                            url={button.url}
                            flowId={flowId || 'new'}
                            flowName={flowName}
                            nodeId={nodeId}
                            nodeName={button.label || 'botao'}
                            utmEnabled={utmEnabled}
                          />
                        )}
                      </div>
                    )}
                  </div>
                ))}
                <button
                  className={styles.addButton}
                  onClick={addButton}
                  disabled={
                    (editData as TextNodeData).buttons.length >=
                    MESSENGER_LIMITS.MAX_BUTTONS
                  }
                >
                  + Adicionar Botão
                  {(editData as TextNodeData).buttons.length >=
                    MESSENGER_LIMITS.MAX_BUTTONS && (
                    <span> (Máximo {MESSENGER_LIMITS.MAX_BUTTONS})</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Card Node Editor */}
        {nodeType === 'card' && (
          <div className={styles.editForm}>
            <div className={styles.formGroup}>
              <label htmlFor={cardMessageTypeId}>Tipo da Mensagem:</label>
              <select
                id={cardMessageTypeId}
                value={(editData as CardNodeData).messageType}
                onChange={(e) =>
                  setEditData({
                    ...(editData as CardNodeData),
                    messageType: e.target.value as MessageType,
                  })
                }
              >
                <option value="ACCOUNT_UPDATE">Account Update</option>
                <option value="POST_PURCHASE_UPDATE">Post Purchase Update</option>
                <option value="CONFIRMED_EVENT_UPDATE">Confirmed Event Update</option>
              </select>
            </div>

            <div className={`${styles.formGroup} ${!(editData as CardNodeData).title ? styles.hasError : ''}`}>
              <label htmlFor={cardTitleId}>Título (obrigatório):</label>
              <input
                type="text"
                id={cardTitleId}
                value={(editData as CardNodeData).title}
                onChange={(e) =>
                  setEditData({
                    ...(editData as CardNodeData),
                    title: e.target.value,
                  })
                }
                placeholder="Título do card"
                maxLength={MESSENGER_LIMITS.GENERIC_TEMPLATE_TITLE}
                className={!(editData as CardNodeData).title ? styles.inputError : ''}
              />
              <div
                className={`${styles.charCounter} ${
                  isNearLimit(getCharCount((editData as CardNodeData).title), MESSENGER_LIMITS.GENERIC_TEMPLATE_TITLE)
                    ? styles.warning
                    : ''
                } ${
                  isAtLimit(getCharCount((editData as CardNodeData).title), MESSENGER_LIMITS.GENERIC_TEMPLATE_TITLE)
                    ? styles.error
                    : ''
                }`}
              >
                {getCharCount((editData as CardNodeData).title)} / {MESSENGER_LIMITS.GENERIC_TEMPLATE_TITLE}
              </div>
              {!(editData as CardNodeData).title && (
                <span className={styles.fieldError}>Este campo é obrigatório</span>
              )}
            </div>

            <div className={styles.formGroup}>
              <label htmlFor={cardSubtitleId}>Subtítulo (opcional):</label>
              <input
                type="text"
                id={cardSubtitleId}
                value={(editData as CardNodeData).subtitle || ''}
                onChange={(e) =>
                  setEditData({
                    ...(editData as CardNodeData),
                    subtitle: e.target.value,
                  })
                }
                placeholder="Subtítulo do card"
                maxLength={MESSENGER_LIMITS.GENERIC_TEMPLATE_SUBTITLE}
              />
              <div
                className={`${styles.charCounter} ${
                  isNearLimit(getCharCount((editData as CardNodeData).subtitle), MESSENGER_LIMITS.GENERIC_TEMPLATE_SUBTITLE)
                    ? styles.warning
                    : ''
                } ${
                  isAtLimit(getCharCount((editData as CardNodeData).subtitle), MESSENGER_LIMITS.GENERIC_TEMPLATE_SUBTITLE)
                    ? styles.error
                    : ''
                }`}
              >
                {getCharCount((editData as CardNodeData).subtitle)} / {MESSENGER_LIMITS.GENERIC_TEMPLATE_SUBTITLE}
              </div>
            </div>

            <div className={styles.formGroup}>
              <span className={styles.formLabel}>Imagem:</span>
              <div className={styles.imageUploadWrapper}>
                <input
                  type="file"
                  accept="image/*"
                  aria-label="Upload de imagem"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      handleImageUpload(file)
                    }
                  }}
                  className={styles.fileInput}
                  disabled={isUploading}
                />
                {isUploading && (
                  <div className={styles.uploadingIndicator}>
                    <Loader2 size={16} className={styles.spinning} />
                    <span>Enviando...</span>
                  </div>
                )}
              </div>
              <input
                type="text"
                aria-label="URL da imagem"
                value={(editData as CardNodeData).imageUrl || ''}
                onChange={(e) =>
                  setEditData({
                    ...(editData as CardNodeData),
                    imageUrl: e.target.value,
                  })
                }
                placeholder="URL da imagem (ou faça upload acima)"
                className={styles.imageUrlInput}
                disabled={isUploading}
              />
              {(editData as CardNodeData).imageUrl && (
                <div className={styles.imagePreview}>
                  <>
                    {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
                    <img
                      src={(editData as CardNodeData).imageUrl}
                      alt="Preview"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none'
                      }}
                    />
                  </>
                </div>
              )}
            </div>

            <div className={styles.formGroup}>
              <label htmlFor={cardImageAspectId}>Formato da Imagem:</label>
              <select
                id={cardImageAspectId}
                value={(editData as CardNodeData).imageAspectRatio}
                onChange={(e) =>
                  setEditData({
                    ...(editData as CardNodeData),
                    imageAspectRatio: e.target.value as ImageAspectRatio,
                  })
                }
              >
                <option value="square">Quadrado (1:1) - Recomendado</option>
                <option value="horizontal">Horizontal (1.91:1) - Padrão Facebook</option>
              </select>
              <small className={styles.hint}>
                💡 Quadrado (1:1) funciona melhor no mobile
              </small>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor={cardUrlId}>URL do Card (opcional):</label>
              <input
                type="text"
                id={cardUrlId}
                value={(editData as CardNodeData).url || ''}
                onChange={(e) =>
                  setEditData({
                    ...(editData as CardNodeData),
                    url: e.target.value,
                  })
                }
                placeholder="https://example.com"
              />
            </div>

            <div className={styles.formGroup}>
              <span className={styles.formLabel}>Botões:</span>
              <div className={styles.buttonsEditor}>
                {((editData as CardNodeData).buttons || []).map((button, index) => (
                  <div key={button.id} className={styles.buttonEditor}>
                    {/* Label do botão */}
                    <div className={styles.buttonLabelRow}>
                      <input
                        type="text"
                        value={button.label}
                        onChange={(e) =>
                          updateButton(index, { label: e.target.value })
                        }
                        placeholder="Label do botão"
                        maxLength={MESSENGER_LIMITS.BUTTON_TITLE}
                        className={styles.buttonLabelInput}
                      />
                      <button
                        className={styles.removeBtn}
                        onClick={() => removeButton(index)}
                      >
                        ×
                      </button>
                    </div>
                    <div
                      className={`${styles.charCounter} ${
                        isNearLimit(getCharCount(button.label), MESSENGER_LIMITS.BUTTON_TITLE)
                          ? styles.warning
                          : ''
                      } ${
                        isAtLimit(getCharCount(button.label), MESSENGER_LIMITS.BUTTON_TITLE)
                          ? styles.error
                          : ''
                      }`}
                    >
                      {getCharCount(button.label)}/{MESSENGER_LIMITS.BUTTON_TITLE}
                    </div>

                    {/* Ação do botão */}
                    <select
                      value={button.action}
                      onChange={(e) =>
                        updateButton(index, {
                          action: e.target.value as 'send_message' | 'open_website',
                        })
                      }
                      className={styles.buttonActionSelect}
                    >
                      <option value="send_message">Send Message</option>
                      <option value="open_website">Open Website</option>
                    </select>
                    {button.action === 'send_message' && (
                      <div style={{ width: '100%' }}>
                        <input
                          type="text"
                          value={button.message || ''}
                          onChange={(e) =>
                            updateButton(index, { message: e.target.value })
                          }
                          placeholder="Mensagem a ser enviada"
                          maxLength={MESSENGER_LIMITS.BUTTON_PAYLOAD}
                        />
                        <div
                          className={`${styles.charCounter} ${styles.charCounterInline} ${
                            isNearLimit(getCharCount(button.message), MESSENGER_LIMITS.BUTTON_PAYLOAD)
                              ? styles.warning
                              : ''
                          } ${
                            isAtLimit(getCharCount(button.message), MESSENGER_LIMITS.BUTTON_PAYLOAD)
                              ? styles.error
                              : ''
                          }`}
                        >
                          {getCharCount(button.message)}/{MESSENGER_LIMITS.BUTTON_PAYLOAD}
                        </div>
                      </div>
                    )}
                    {button.action === 'open_website' && (
                      <div style={{ width: '100%' }}>
                        <input
                          type="text"
                          value={button.url || ''}
                          onChange={(e) =>
                            updateButton(index, { url: e.target.value })
                          }
                          placeholder="URL do website"
                          maxLength={MESSENGER_LIMITS.BUTTON_URL}
                        />
                        <div
                          className={`${styles.charCounter} ${styles.charCounterInline} ${
                            isNearLimit(getCharCount(button.url), MESSENGER_LIMITS.BUTTON_URL)
                              ? styles.warning
                              : ''
                          } ${
                            isAtLimit(getCharCount(button.url), MESSENGER_LIMITS.BUTTON_URL)
                              ? styles.error
                              : ''
                          }`}
                        >
                          {getCharCount(button.url)}/{MESSENGER_LIMITS.BUTTON_URL}
                        </div>
                        {button.url && (
                          <UtmPreviewSection
                            url={button.url}
                            flowId={flowId || 'new'}
                            flowName={flowName}
                            nodeId={nodeId}
                            nodeName={button.label || 'botao'}
                            utmEnabled={utmEnabled}
                          />
                        )}
                      </div>
                    )}
                  </div>
                ))}
                <button
                  className={styles.addButton}
                  onClick={addButton}
                  disabled={
                    ((editData as CardNodeData).buttons || []).length >=
                    MESSENGER_LIMITS.MAX_BUTTONS
                  }
                >
                  + Adicionar Botão
                  {((editData as CardNodeData).buttons || []).length >= MESSENGER_LIMITS.MAX_BUTTONS && (
                    <span> (Máximo {MESSENGER_LIMITS.MAX_BUTTONS})</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Wait Node Editor */}
        {nodeType === 'wait' && (
          <div className={styles.editForm}>
            <div className={styles.formGroup}>
              <label htmlFor={waitDurationId}>Tempo de espera:</label>
              <div className={styles.inlineInputs}>
                <Input
                  id={waitDurationId}
                  type="number"
                  value={(editData as WaitNodeData).duration}
                  onChange={(e) =>
                    setEditData({
                      ...(editData as WaitNodeData),
                      duration: parseInt(e.target.value) || 1,
                    })
                  }
                  min={1}
                />
                <select
                  value={(editData as WaitNodeData).timeUnit}
                  onChange={(e) =>
                    setEditData({
                      ...(editData as WaitNodeData),
                      timeUnit: e.target.value as TimeUnit,
                    })
                  }
                  aria-label="Unidade de tempo"
                >
                  <option value="seconds">Segundos</option>
                  <option value="minutes">Minutos</option>
                  <option value="hours">Horas</option>
                  <option value="days">Dias</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Traffic Node Editor */}
        {nodeType === 'traffic' && (
          <div className={styles.editForm}>
            <div className={styles.formGroup}>
              <span className={styles.formLabel}>Divisão de Tráfego:</span>
              <div className={styles.trafficEditor}>
                {(editData as TrafficNodeData).branches.map((branch, index) => (
                  <div key={branch.id} className={styles.branchEditor}>
                    <div
                      className={styles.branchColorDot}
                      style={{
                        background: BRANCH_COLORS[index % BRANCH_COLORS.length],
                      }}
                    />
                    <Input
                      value={branch.label}
                      onChange={(e) =>
                        updateBranch(index, { label: e.target.value })
                      }
                      placeholder="Nome da opção"
                    />
                    <Input
                      type="number"
                      value={branch.percentage}
                      onChange={(e) =>
                        updateBranch(index, {
                          percentage: parseInt(e.target.value) || 0,
                        })
                      }
                      min={1}
                      max={100}
                      className={styles.percentageInput}
                    />
                    <span>%</span>
                    <button
                      className={styles.removeBtn}
                      onClick={() => removeBranch(index)}
                    >
                      ×
                    </button>
                  </div>
                ))}
                <div className={styles.trafficActions}>
                  <button className={styles.addButton} onClick={addBranch}>
                    + Adicionar Opção
                  </button>
                  <button
                    className={styles.distributeButton}
                    onClick={distributeEqually}
                    disabled={(editData as TrafficNodeData).branches.length === 0}
                  >
                    Distribuir Igualmente
                  </button>
                </div>
                <div
                  className={`${styles.percentageTotal} ${
                    getTotalPercentage() === 100 ? styles.valid : styles.invalid
                  }`}
                >
                  Total: {getTotalPercentage()}%
                  {getTotalPercentage() === 100 ? (
                    <span className={styles.successBadge}>✓ Válido</span>
                  ) : (
                    <span className={styles.warningBadge}>⚠️ Deve somar 100%</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Call Flow Node Editor */}
        {nodeType === 'call-flow' && (
          <div className={styles.editForm}>
            <div className={styles.formGroup}>
              <label htmlFor={callFlowId}>Selecionar Fluxo:</label>
              <div className={styles.flowSelect}>
                <select
                  id={callFlowId}
                  value={(editData as CallFlowNodeData).selectedFlowId || ''}
                  onChange={(e) =>
                    setEditData({
                      ...(editData as CallFlowNodeData),
                      selectedFlowId: e.target.value || null,
                    })
                  }
                >
                  <option value="">-- Selecione um fluxo --</option>
                  {availableFlows.map((flow) => (
                    <option key={flow.id} value={flow.id}>
                      {flow.name}
                    </option>
                  ))}
                </select>
                {onRefreshFlows && (
                  <button
                    className={styles.refreshBtn}
                    onClick={onRefreshFlows}
                    title="Atualizar lista de fluxos"
                  >
                    <RefreshCw size={16} />
                  </button>
                )}
              </div>
            </div>

            {availableFlows.length === 0 && (
              <div className={styles.emptyWarning}>
                <AlertTriangle size={16} />
                <p>Nenhum fluxo disponível.</p>
              </div>
            )}
          </div>
        )}

        {/* Comment Node Editor */}
        {nodeType === 'comment' && (
          <div className={styles.editForm}>
            <div className={styles.formGroup}>
              <label htmlFor={commentTextId}>Texto do Comentário:</label>
              <textarea
                id={commentTextId}
                value={(editData as CommentNodeData).text}
                onChange={(e) =>
                  setEditData({
                    ...(editData as CommentNodeData),
                    text: e.target.value,
                  })
                }
                placeholder="Digite seu comentário..."
                rows={6}
                className={styles.commentTextarea}
              />
              <small className={styles.hint}>
                Use comentários para documentar a lógica do fluxo ou deixar lembretes.
              </small>
            </div>
          </div>
        )}

        <div className={styles.sidebarActions}>
          <Button onClick={handleSave}>Salvar</Button>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  )
}
