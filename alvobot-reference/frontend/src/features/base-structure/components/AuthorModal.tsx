import { useState, useEffect } from 'react'
import { Modal, Button, Input, Textarea, Spinner } from '@/shared/components'
import styles from './AuthorModal.module.css'
import { useAuthorProfileImages } from '../api/useBaseStructure'
import type { BaseStructureAuthor, CreateAuthorInput, UpdateAuthorInput } from '../types'

interface AuthorModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: CreateAuthorInput | UpdateAuthorInput) => void
  author?: BaseStructureAuthor | null
  projectId: number
  isLoading?: boolean
}

export function AuthorModal({
  isOpen,
  onClose,
  onSave,
  author,
  projectId,
  isLoading = false,
}: AuthorModalProps) {
  const [name, setName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [role, setRole] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')

  const { data: profileImages, isLoading: imagesLoading } = useAuthorProfileImages()

  const isEditing = !!author

  useEffect(() => {
    if (author) {
      setName(author.name)
      setDisplayName(author.display_name)
      setBio(author.bio || '')
      setRole(author.role || '')
      setAvatarUrl(author.avatar_url || '')
    } else {
      setName('')
      setDisplayName('')
      setBio('')
      setRole('')
      setAvatarUrl('')
    }
  }, [author, isOpen])

  const handleNameChange = (value: string) => {
    setName(value)
    if (!isEditing && !displayName) {
      setDisplayName(value)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim() || !displayName.trim()) return

    if (isEditing) {
      const updateData: UpdateAuthorInput = {
        name: name.trim(),
        display_name: displayName.trim(),
        bio: bio.trim() || undefined,
        role: role.trim() || undefined,
        avatar_url: avatarUrl || undefined,
      }
      onSave(updateData)
    } else {
      const createData: CreateAuthorInput = {
        project_id: projectId,
        name: name.trim(),
        display_name: displayName.trim(),
        bio: bio.trim() || undefined,
        role: role.trim() || undefined,
        avatar_url: avatarUrl || undefined,
      }
      onSave(createData)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Editar Autor' : 'Novo Autor'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.columns}>
          <div className={styles.leftColumn}>
            <Input
              label="Nome interno"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Nome para identificação"
              required
              autoFocus
            />

            <Input
              label="Nome de exibição"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Nome que aparece nos artigos"
              required
            />

            <Input
              label="Função/Cargo"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="Ex: Redator, Editor, Especialista..."
            />

            <Textarea
              label="Biografia"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Uma breve biografia do autor..."
              rows={4}
            />
          </div>

          <div className={styles.rightColumn}>
            <div className={styles.avatarSection}>
              <span className={styles.avatarLabel}>Foto de Perfil</span>

              {avatarUrl && (
                <div className={styles.selectedAvatar}>
                  <img src={avatarUrl} alt="Avatar selecionado" />
                  <button
                    type="button"
                    className={styles.removeAvatar}
                    onClick={() => setAvatarUrl('')}
                  >
                    Remover
                  </button>
                </div>
              )}

              <div className={styles.avatarGrid}>
                {imagesLoading ? (
                  <div className={styles.loadingImages}>
                    <Spinner size="sm" />
                    <span>Carregando imagens...</span>
                  </div>
                ) : profileImages && profileImages.length > 0 ? (
                  profileImages.map((img) => (
                    <button
                      key={img.id}
                      type="button"
                      className={`${styles.avatarOption} ${avatarUrl === img.path ? styles.selected : ''}`}
                      onClick={() => setAvatarUrl(img.path)}
                      title={`${img.age} - ${img.sex}`}
                    >
                      <img src={img.path} alt={`Avatar ${img.age} ${img.sex}`} />
                    </button>
                  ))
                ) : (
                  <p className={styles.noImages}>
                    Nenhuma imagem disponível. Você pode inserir uma URL abaixo.
                  </p>
                )}
              </div>

              <Input
                label="Ou insira URL da imagem"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://..."
                className={styles.urlInput}
              />
            </div>
          </div>
        </div>

        <div className={styles.actions}>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isLoading || !name.trim() || !displayName.trim()}
          >
            {isLoading ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Criar Autor'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
