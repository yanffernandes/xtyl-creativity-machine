import { useState, useEffect } from 'react'
import { Modal, Button, Input, Textarea, Select } from '@/shared/components'
import styles from './CategoryModal.module.css'
import type { BaseStructureCategory, CreateCategoryInput, UpdateCategoryInput } from '../types'

interface CategoryModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: CreateCategoryInput | UpdateCategoryInput) => void
  category?: BaseStructureCategory | null
  layer: 1 | 2 | 3
  projectId: number
  parentCategories?: BaseStructureCategory[] // For layer 2, list of layer 1 categories
  isLoading?: boolean
}

const layerLabels: Record<1 | 2 | 3, string> = {
  1: 'Categoria',
  2: 'Subcategoria',
  3: 'Tag',
}

export function CategoryModal({
  isOpen,
  onClose,
  onSave,
  category,
  layer,
  projectId,
  parentCategories = [],
  isLoading = false,
}: CategoryModalProps) {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [parentId, setParentId] = useState('')

  const isEditing = !!category

  useEffect(() => {
    if (category) {
      setName(category.name)
      setSlug(category.slug || '')
      setDescription(category.description || '')
      setParentId(category.parent_id || '')
    } else {
      setName('')
      setSlug('')
      setDescription('')
      setParentId('')
    }
  }, [category, isOpen])

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
  }

  const handleNameChange = (value: string) => {
    setName(value)
    if (!isEditing && !slug) {
      setSlug(generateSlug(value))
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) return

    if (isEditing) {
      const updateData: UpdateCategoryInput = {
        name: name.trim(),
        slug: slug || generateSlug(name),
        description: description.trim() || undefined,
      }
      onSave(updateData)
    } else {
      const createData: CreateCategoryInput = {
        project_id: projectId,
        name: name.trim(),
        slug: slug || generateSlug(name),
        description: description.trim() || undefined,
        layer,
        parent_id: layer === 2 ? (parentId || null) : null,
      }
      onSave(createData)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? `Editar ${layerLabels[layer]}` : `Nova ${layerLabels[layer]}`}
      size="lg"
    >
      <form onSubmit={handleSubmit} className={styles.form}>
        <Input
          label="Nome"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder={`Nome da ${layerLabels[layer].toLowerCase()}`}
          required
          autoFocus
        />

        <Input
          label="Slug (URL)"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="nome-da-categoria"
          hint="Usado na URL. Gerado automaticamente se deixar em branco."
        />

        {layer === 2 && parentCategories.length > 0 && (
          <Select
            label="Categoria Pai"
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
            options={[
              { value: '', label: 'Selecione uma categoria' },
              ...parentCategories.map((cat) => ({
                value: cat.id,
                label: cat.name,
              })),
            ]}
            hint="Vincule esta subcategoria a uma categoria principal"
          />
        )}

        <Textarea
          label="Descrição (opcional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={`Descreva esta ${layerLabels[layer].toLowerCase()}...`}
          rows={3}
        />

        <div className={styles.actions}>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" disabled={isLoading || !name.trim()}>
            {isLoading ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Criar'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
