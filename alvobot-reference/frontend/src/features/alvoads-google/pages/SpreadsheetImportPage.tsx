import { useState, useRef } from 'react'
import { ArrowLeft, FileSpreadsheet, Upload, Download, FileText } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/shared/components'
import styles from './SpreadsheetImportPage.module.css'

export function SpreadsheetImportPage() {
  const navigate = useNavigate()
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && (droppedFile.name.endsWith('.csv') || droppedFile.name.endsWith('.xlsx'))) {
      setFile(droppedFile)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
    }
  }

  const handleDownloadTemplate = () => {
    // Create and download CSV template
    const template = `Nome da Campanha,Orçamento Diário,Palavras-chave,Headlines,Descrições,URL Final,Localização
"Campanha Exemplo 1",50,"keyword1, keyword2, keyword3","Headline 1 | Headline 2 | Headline 3","Descrição 1 | Descrição 2",https://exemplo.com,"São Paulo, SP"
"Campanha Exemplo 2",30,"keyword4, keyword5","Headline A | Headline B","Descrição A",https://exemplo.com/2,"Rio de Janeiro, RJ"`

    const blob = new Blob([template], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'template_campanhas_google.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <button type="button" className={styles.backButton} onClick={() => navigate('/alvoads-google')}>
            <ArrowLeft size={20} />
          </button>
          <div className={styles.headerTitle}>
            <FileSpreadsheet size={20} className={styles.headerIcon} />
            <h1>Importar Planilha</h1>
          </div>
        </div>
        <div className={styles.headerRight}>
          {file && (
            <Button variant="primary">
              Processar Arquivo
            </Button>
          )}
        </div>
      </header>

      <main className={styles.content}>
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Importar Campanhas via Planilha</h2>
          <p className={styles.sectionDescription}>
            Faça upload de um arquivo CSV ou Excel com suas campanhas.
            Use nosso template para garantir o formato correto.
          </p>

          <div className={styles.templateSection}>
            <Button
              variant="outline"
              leftIcon={<Download size={16} />}
              onClick={handleDownloadTemplate}
            >
              Baixar Template CSV
            </Button>
          </div>

          <div
            className={`${styles.dropzone} ${isDragging ? styles.dragging : ''} ${file ? styles.hasFile : ''}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                fileInputRef.current?.click()
              }
            }}
            role="button"
            tabIndex={0}
            aria-label="Enviar planilha"
          >
            {file ? (
              <div className={styles.filePreview}>
                <FileText size={40} className={styles.fileIcon} />
                <span className={styles.fileName}>{file.name}</span>
                <span className={styles.fileSize}>
                  {(file.size / 1024).toFixed(1)} KB
                </span>
                <button
                  type="button"
                  className={styles.removeFile}
                  onClick={() => setFile(null)}
                >
                  Remover
                </button>
              </div>
            ) : (
              <>
                <Upload size={40} className={styles.uploadIcon} />
                <p className={styles.dropzoneText}>
                  Arraste seu arquivo aqui ou
                </p>
                <label className={styles.fileInputLabel}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileChange}
                    className={styles.fileInput}
                  />
                  Selecione um arquivo
                </label>
                <span className={styles.dropzoneHint}>
                  Formatos aceitos: CSV, XLSX
                </span>
              </>
            )}
          </div>

          <div className={styles.instructions}>
            <h3 className={styles.instructionsTitle}>Formato esperado</h3>
            <ul className={styles.instructionsList}>
              <li>Cada linha representa uma campanha</li>
              <li>Separe múltiplas keywords com vírgula</li>
              <li>Separe headlines com o caractere |</li>
              <li>Mínimo de 3 headlines e 2 descrições por campanha</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  )
}
