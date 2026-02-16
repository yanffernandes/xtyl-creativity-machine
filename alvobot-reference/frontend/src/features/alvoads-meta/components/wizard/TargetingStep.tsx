import { useState, useEffect, useId, useMemo } from 'react'
import { AlertCircle, Check, X, Globe, Languages, Users, Search, AlertTriangle } from 'lucide-react'
import { Input } from '@/shared/components'
import styles from './WizardSteps.module.css'
import { filterCountries, filterLanguages, META_ALL_COUNTRIES } from '../../constants/targeting'
import { useMetaAdsWizardStore } from '../../stores/metaAdsWizardStore'
import { validateTargeting } from '../../utils/validation'
import type { MetaGender } from '../../types/campaign'

const GENDERS: Array<{ value: MetaGender; label: string }> = [
  { value: 0, label: 'Todos' },
  { value: 1, label: 'Masculino' },
  { value: 2, label: 'Feminino' },
]

export function TargetingStep() {
  const {
    targeting,
    setTargeting,
    markStepCompleted,
    markStepIncomplete,
    specialAdCategories,
  } = useMetaAdsWizardStore()

  const hasSpecialAdCategory = specialAdCategories.length > 0

  const [countrySearch, setCountrySearch] = useState('')
  const [languageSearch, setLanguageSearch] = useState('')
  const ageMinId = useId()
  const ageMaxId = useId()

  // Filter countries and languages locally (all 250 countries, 101 Meta languages)
  // Supports search by Portuguese name, English name, and country code
  const countries = useMemo(() => filterCountries(countrySearch), [countrySearch])
  const languages = useMemo(() => filterLanguages(languageSearch), [languageSearch])

  const handleValidateAndComplete = () => {
    const validation = validateTargeting(targeting)
    if (validation.isValid) {
      markStepCompleted('targeting')
    } else {
      markStepIncomplete('targeting')
    }
  }

  // Validate on mount and when targeting changes
  useEffect(() => {
    const validation = validateTargeting(targeting)
    if (validation.isValid) {
      markStepCompleted('targeting')
    } else {
      markStepIncomplete('targeting')
    }
  }, [targeting, markStepCompleted, markStepIncomplete])

  const handleAgeChange = (field: 'ageMin' | 'ageMax', value: number) => {
    setTargeting({ [field]: value })
    handleValidateAndComplete()
  }

  const handleGenderToggle = (gender: MetaGender) => {
    const currentGenders = targeting.genders
    const isSelected = currentGenders.includes(gender)

    let newGenders: MetaGender[]
    if (isSelected) {
      newGenders = currentGenders.filter(g => g !== gender)
      // Ensure at least one gender is selected
      if (newGenders.length === 0) newGenders = [0] // Default to "All"
    } else if (gender === 0) {
      // If selecting "All" (0), clear other selections
      newGenders = [0]
    } else {
      // Remove "All" if selecting specific genders
      newGenders = [...currentGenders.filter(g => g !== 0), gender]
    }

    setTargeting({ genders: newGenders })
    handleValidateAndComplete()
  }

  const handleAddCountry = (country: { key: string; name: string }) => {
    if (!targeting.countries.includes(country.key)) {
      setTargeting({ countries: [...targeting.countries, country.key] })
      setCountrySearch('')
      handleValidateAndComplete()
    }
  }

  const handleRemoveCountry = (countryCode: string) => {
    setTargeting({ countries: targeting.countries.filter(c => c !== countryCode) })
    handleValidateAndComplete()
  }

  const handleAddLanguage = (language: { key: string; name: string }) => {
    if (!targeting.languages.some(l => l.key === language.key)) {
      setTargeting({ languages: [...targeting.languages, { key: language.key, name: language.name }] })
      setLanguageSearch('')
      handleValidateAndComplete()
    }
  }

  const handleRemoveLanguage = (languageKey: string) => {
    setTargeting({ languages: targeting.languages.filter(l => l.key !== languageKey) })
    handleValidateAndComplete()
  }

  const validation = validateTargeting(targeting)

  return (
    <div className={styles.stepContent}>
      {/* Special Ad Category Restrictions Banner */}
      {hasSpecialAdCategory && (
        <section className={styles.section} style={{
          background: 'var(--color-warning-alpha-10)',
          border: '1px solid var(--color-warning)',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
            <AlertTriangle size={22} style={{ color: 'var(--color-warning)', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <h4 style={{ margin: '0 0 var(--space-1) 0', color: 'var(--color-text-primary)', fontSize: 'var(--font-size-sm)' }}>
                Restrições de Categoria Especial Ativas
              </h4>
              <p style={{ margin: 0, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', lineHeight: '1.5' }}>
                Como você selecionou uma categoria especial de anúncio ({specialAdCategories.join(', ')}),
                as opções de <strong>idade</strong> e <strong>gênero</strong> foram fixadas automaticamente pela Meta.
                A idade é sempre 18-65+ e gênero é sempre "Todos".
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Age Range */}
      <section className={styles.section} style={hasSpecialAdCategory ? { opacity: 0.6, pointerEvents: 'none' } : undefined}>
        <h3 className={styles.sectionTitle}>
          <Users size={20} />
          Faixa Etária
          {hasSpecialAdCategory && (
            <span style={{
              marginLeft: 'var(--space-2)',
              padding: '2px 8px',
              background: 'var(--color-warning-alpha-10)',
              border: '1px solid var(--color-warning)',
              borderRadius: 'var(--radius-full)',
              fontSize: '11px',
              color: 'var(--color-warning)',
              fontWeight: 500,
            }}>
              Fixado (categoria especial)
            </span>
          )}
        </h3>
        <p className={styles.sectionDescription}>
          {hasSpecialAdCategory
            ? 'Faixa etária fixada em 18-65+ devido à categoria especial de anúncio'
            : 'Defina a idade mínima e máxima do seu público-alvo'
          }
        </p>

        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor={ageMinId}>Idade Mínima</label>
            <div className={styles.rangeContainer}>
              <input
                id={ageMinId}
                type="range"
                className={styles.rangeInput}
                min={18}
                max={65}
                value={targeting.ageMin}
                onChange={(e) => handleAgeChange('ageMin', parseInt(e.target.value))}
                disabled={hasSpecialAdCategory}
              />
              <span className={styles.rangeValue}>{targeting.ageMin} anos</span>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor={ageMaxId}>Idade Máxima</label>
            <div className={styles.rangeContainer}>
              <input
                id={ageMaxId}
                type="range"
                className={styles.rangeInput}
                min={18}
                max={65}
                value={targeting.ageMax}
                onChange={(e) => handleAgeChange('ageMax', parseInt(e.target.value))}
                disabled={hasSpecialAdCategory}
              />
              <span className={styles.rangeValue}>{targeting.ageMax === 65 ? '65+' : `${targeting.ageMax} anos`}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Gender */}
      <section className={styles.section} style={hasSpecialAdCategory ? { opacity: 0.6, pointerEvents: 'none' } : undefined}>
        <h3 className={styles.sectionTitle}>
          Gênero
          {hasSpecialAdCategory && (
            <span style={{
              marginLeft: 'var(--space-2)',
              padding: '2px 8px',
              background: 'var(--color-warning-alpha-10)',
              border: '1px solid var(--color-warning)',
              borderRadius: 'var(--radius-full)',
              fontSize: '11px',
              color: 'var(--color-warning)',
              fontWeight: 500,
            }}>
              Fixado (categoria especial)
            </span>
          )}
        </h3>
        <p className={styles.sectionDescription}>
          {hasSpecialAdCategory
            ? 'Gênero fixado em "Todos" devido à categoria especial de anúncio'
            : 'Selecione os gêneros que você deseja alcançar'
          }
        </p>

        <div className={styles.optionsGrid} style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {GENDERS.map((gender) => {
            const isSelected = targeting.genders.includes(gender.value)

            return (
              <button
                key={gender.value}
                type="button"
                className={`${styles.optionCard} ${isSelected ? styles.selected : ''}`}
                onClick={() => handleGenderToggle(gender.value)}
                disabled={hasSpecialAdCategory}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div className={`${styles.checkboxIndicator} ${isSelected ? styles.checked : ''}`}>
                    {isSelected && <Check size={14} />}
                  </div>
                  <span className={styles.optionLabel}>{gender.label}</span>
                </div>
              </button>
            )
          })}
        </div>
      </section>

      {/* Countries */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>
          <Globe size={20} />
          Países
        </h3>
        <p className={styles.sectionDescription}>
          Selecione os países onde seus anúncios serão exibidos
        </p>

        <div className={styles.formGroup}>
          <Input
            className={styles.searchInput}
            placeholder="Buscar países..."
            value={countrySearch}
            onChange={(e) => setCountrySearch(e.target.value)}
            leftIcon={<Search size={16} />}
            size="md"
          />
        </div>

        {/* Selected Countries */}
        {targeting.countries.length > 0 && (
          <div className={styles.selectedItemsList}>
            {targeting.countries.map((code) => {
              const country = META_ALL_COUNTRIES.find((c) => c.key === code)
              return (
                <div key={code} className={styles.selectedItemChip}>
                  <span>{country?.name || code}</span>
                  <button
                    type="button"
                    className={styles.selectedItemChipRemove}
                    onClick={() => handleRemoveCountry(code)}
                    title="Remover país"
                  >
                    <X size={10} />
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {/* Country Search Results */}
        {countrySearch && (
          <div style={{ marginTop: 'var(--space-3)' }}>
            {countries.length === 0 ? (
              <p style={{ color: 'var(--color-text-tertiary)' }}>Nenhum país encontrado</p>
            ) : (
              <div className={styles.optionsGrid}>
                {countries
                  .filter((c) => !targeting.countries.includes(c.key))
                  .slice(0, 8)
                  .map((country) => (
                    <button
                      key={country.key}
                      type="button"
                      className={styles.optionCard}
                      onClick={() => handleAddCountry(country)}
                    >
                      <span className={styles.optionLabel}>{country.name}</span>
                      <span className={styles.optionDescription}>{country.key}</span>
                    </button>
                  ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Languages */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>
          <Languages size={20} />
          Idiomas
        </h3>
        <p className={styles.sectionDescription}>
          Selecione os idiomas do seu público-alvo
        </p>

        <div className={styles.formGroup}>
          <Input
            className={styles.searchInput}
            placeholder="Buscar idiomas..."
            value={languageSearch}
            onChange={(e) => setLanguageSearch(e.target.value)}
            leftIcon={<Search size={16} />}
            size="md"
          />
        </div>

        {/* Selected Languages */}
        {targeting.languages.length > 0 && (
          <div className={styles.selectedItemsList}>
            {targeting.languages.map((lang) => (
              <div key={lang.key} className={styles.selectedItemChip}>
                <span>{lang.name}</span>
                <button
                  type="button"
                  className={styles.selectedItemChipRemove}
                  onClick={() => handleRemoveLanguage(lang.key)}
                  title="Remover idioma"
                >
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Language Search Results */}
        {languageSearch && (
          <div style={{ marginTop: 'var(--space-3)' }}>
            {languages.length === 0 ? (
              <p style={{ color: 'var(--color-text-tertiary)' }}>Nenhum idioma encontrado</p>
            ) : (
              <div className={styles.optionsGrid}>
                {languages
                  .filter((l) => !targeting.languages.some(tl => tl.key === l.key))
                  .slice(0, 8)
                  .map((language) => (
                    <button
                      key={language.key}
                      type="button"
                      className={styles.optionCard}
                      onClick={() => handleAddLanguage(language)}
                    >
                      <span className={styles.optionLabel}>{language.name}</span>
                    </button>
                  ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Validation Errors */}
      {!validation.isValid && validation.errors.length > 0 && (
        <section className={styles.section}>
          <div className={styles.errorState} style={{ flexDirection: 'row', gap: 'var(--space-2)' }}>
            <AlertCircle size={20} />
            <div>
              {validation.errors.map((error, i) => (
                <p key={i}>{error}</p>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
