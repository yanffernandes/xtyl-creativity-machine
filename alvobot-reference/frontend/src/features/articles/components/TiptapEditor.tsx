import { useState } from 'react'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import { Table } from '@tiptap/extension-table'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import TableRow from '@tiptap/extension-table-row'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Minus,
  Undo,
  Redo,
  Link as LinkIcon,
  Image as ImageIcon,
  Table as TableIcon,
} from 'lucide-react'
import { Button, Input, Modal } from '@/shared/components'
import styles from './TiptapEditor.module.css'

interface TiptapEditorProps {
  content: string
  onChange: (content: string) => void
  placeholder?: string
}

export function TiptapEditor({ content, onChange, placeholder = 'Comece a escrever...' }: TiptapEditorProps) {
  const [promptType, setPromptType] = useState<'link' | 'image' | null>(null)
  const [promptValue, setPromptValue] = useState('')
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'editor-link',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'editor-image',
        },
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableCell,
      TableHeader,
      Placeholder.configure({
        placeholder,
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
  })

  if (!editor) {
    return null
  }

  const openPrompt = (type: 'link' | 'image') => {
    setPromptType(type)
    setPromptValue('')
  }

  const handlePromptConfirm = () => {
    const url = promptValue.trim()
    if (!url) return
    if (promptType === 'link') {
      editor.chain().focus().setLink({ href: url }).run()
    }
    if (promptType === 'image') {
      editor.chain().focus().setImage({ src: url }).run()
    }
    setPromptType(null)
    setPromptValue('')
  }

  const handlePromptClose = () => {
    setPromptType(null)
    setPromptValue('')
  }

  const addLink = () => {
    openPrompt('link')
  }

  const addImage = () => {
    openPrompt('image')
  }

  const addTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
  }

  return (
    <div className={styles.editor}>
      <div className={styles.toolbar}>
        <div className={styles.toolbarGroup}>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`${styles.toolbarButton} ${editor.isActive('bold') ? styles.active : ''}`}
            title="Negrito"
          >
            <Bold size={16} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`${styles.toolbarButton} ${editor.isActive('italic') ? styles.active : ''}`}
            title="Itálico"
          >
            <Italic size={16} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={`${styles.toolbarButton} ${editor.isActive('strike') ? styles.active : ''}`}
            title="Riscado"
          >
            <Strikethrough size={16} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleCode().run()}
            className={`${styles.toolbarButton} ${editor.isActive('code') ? styles.active : ''}`}
            title="Código"
          >
            <Code size={16} />
          </button>
        </div>

        <div className={styles.divider} />

        <div className={styles.toolbarGroup}>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={`${styles.toolbarButton} ${editor.isActive('heading', { level: 1 }) ? styles.active : ''}`}
            title="Título 1"
          >
            <Heading1 size={16} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`${styles.toolbarButton} ${editor.isActive('heading', { level: 2 }) ? styles.active : ''}`}
            title="Título 2"
          >
            <Heading2 size={16} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={`${styles.toolbarButton} ${editor.isActive('heading', { level: 3 }) ? styles.active : ''}`}
            title="Título 3"
          >
            <Heading3 size={16} />
          </button>
        </div>

        <div className={styles.divider} />

        <div className={styles.toolbarGroup}>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`${styles.toolbarButton} ${editor.isActive('bulletList') ? styles.active : ''}`}
            title="Lista"
          >
            <List size={16} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`${styles.toolbarButton} ${editor.isActive('orderedList') ? styles.active : ''}`}
            title="Lista numerada"
          >
            <ListOrdered size={16} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={`${styles.toolbarButton} ${editor.isActive('blockquote') ? styles.active : ''}`}
            title="Citação"
          >
            <Quote size={16} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            className={styles.toolbarButton}
            title="Linha horizontal"
          >
            <Minus size={16} />
          </button>
        </div>

        <div className={styles.divider} />

        <div className={styles.toolbarGroup}>
          <button
            type="button"
            onClick={addLink}
            className={`${styles.toolbarButton} ${editor.isActive('link') ? styles.active : ''}`}
            title="Link"
          >
            <LinkIcon size={16} />
          </button>
          <button
            type="button"
            onClick={addImage}
            className={styles.toolbarButton}
            title="Imagem"
          >
            <ImageIcon size={16} />
          </button>
          <button
            type="button"
            onClick={addTable}
            className={styles.toolbarButton}
            title="Tabela"
          >
            <TableIcon size={16} />
          </button>
        </div>

        <div className={styles.spacer} />

        <div className={styles.toolbarGroup}>
          <button
            type="button"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            className={styles.toolbarButton}
            title="Desfazer"
          >
            <Undo size={16} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            className={styles.toolbarButton}
            title="Refazer"
          >
            <Redo size={16} />
          </button>
        </div>
      </div>

      <EditorContent editor={editor} className={styles.content} />
      <Modal
        isOpen={promptType !== null}
        onClose={handlePromptClose}
        title={promptType === 'link' ? 'Inserir link' : 'Inserir imagem'}
        size="sm"
      >
        <div className={styles.promptContent}>
          <Input
            label={promptType === 'link' ? 'URL do link' : 'URL da imagem'}
            placeholder={promptType === 'link' ? 'https://exemplo.com' : 'https://exemplo.com/imagem.jpg'}
            value={promptValue}
            onChange={(e) => setPromptValue(e.target.value)}
            fullWidth
            autoFocus
          />
          <div className={styles.promptActions}>
            <Button variant="outline" onClick={handlePromptClose}>
              Cancelar
            </Button>
            <Button onClick={handlePromptConfirm}>
              Inserir
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
