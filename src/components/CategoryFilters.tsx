import { useState, type FormEvent } from 'react'
import { Filter, Plus, X } from 'lucide-react'

export type CategoryOption = { value: string; label: string }
export type SavedCategoryFilter = { name: string; categories: string[] }

type Props = {
  categories: CategoryOption[]
  activeCategories: string[] | null
  savedFilters: SavedCategoryFilter[]
  onSelect: (categories: string[] | null) => void
  onAddCategory: (label: string) => void
  onSaveFilter: (filter: SavedCategoryFilter) => void
  onDeleteFilter: (name: string) => void
}

export default function CategoryFilters({ categories, activeCategories, savedFilters, onSelect, onAddCategory, onSaveFilter, onDeleteFilter }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [categoryName, setCategoryName] = useState('')
  const [filterName, setFilterName] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const activeFilter = savedFilters.find((filter) => activeCategories && filter.categories.length === activeCategories.length && filter.categories.every((category) => activeCategories.includes(category)))

  const createCategory = (event: FormEvent) => {
    event.preventDefault()
    onAddCategory(categoryName)
    setCategoryName('')
  }
  const createFilter = (event: FormEvent) => {
    event.preventDefault()
    if (!selected.length) return
    onSaveFilter({ name: filterName.trim(), categories: selected })
    setFilterName('')
  }

  return <section className="category-filter-box" aria-label="Filtros da agenda">
    <div className="filter-topline"><div className="filter-heading"><Filter size={14} /><span>Filtrar por categoria</span></div><button className="text-button filter-manage-toggle" type="button" onClick={() => setExpanded((value) => !value)}>{expanded ? 'Concluir' : 'Personalizar'}</button></div>
    <div className="category-filter-chips" role="group" aria-label="Categorias para exibir">
      <button type="button" className={`filter-chip ${activeCategories === null ? 'selected' : ''}`} onClick={() => onSelect(null)}>Todas</button>
      {categories.map((category) => <button type="button" key={category.value} className={`filter-chip ${activeCategories?.length === 1 && activeCategories[0] === category.value ? 'selected' : ''}`} onClick={() => onSelect(activeCategories?.length === 1 && activeCategories[0] === category.value ? null : [category.value])}><span className={`filter-chip-dot category-${category.value}`} />{category.label}</button>)}
    </div>
    {(savedFilters.length > 0 || activeFilter) && <div className="saved-filter-line"><label htmlFor="saved-category-filter">Meus filtros</label><select id="saved-category-filter" className="filter-select" value={activeFilter?.name ?? ''} onChange={(event) => { const filter = savedFilters.find((item) => item.name === event.target.value); onSelect(filter?.categories ?? null) }}><option value="">Escolher filtro salvo…</option>{savedFilters.map((filter) => <option key={filter.name} value={filter.name}>{filter.name}</option>)}</select>{activeFilter && <button className="icon-button filter-delete" type="button" aria-label={`Excluir filtro ${activeFilter.name}`} onClick={() => { onDeleteFilter(activeFilter.name); onSelect(null) }}><X size={14} /></button>}</div>}
    {expanded && <div className="filter-customize"><form className="filter-create-row" onSubmit={createCategory}><label htmlFor="new-category">Nova categoria</label><div><input id="new-category" className="text-input" maxLength={32} placeholder="Ex.: Família" value={categoryName} onChange={(event) => setCategoryName(event.target.value)} required /><button className="filter-add-button" type="submit" aria-label="Criar categoria"><Plus size={16} /></button></div></form>
      <form className="filter-create-row" onSubmit={createFilter}><label htmlFor="new-filter">Criar filtro com categorias</label><input id="new-filter" className="text-input" maxLength={32} placeholder="Ex.: Minha rotina" value={filterName} onChange={(event) => setFilterName(event.target.value)} required /><div className="filter-category-checks">{categories.map((category) => <label key={category.value}><input type="checkbox" checked={selected.includes(category.value)} onChange={(event) => setSelected((current) => event.target.checked ? [...current, category.value] : current.filter((value) => value !== category.value))} />{category.label}</label>)}</div><button className="secondary-button filter-save-button" type="submit" disabled={!filterName.trim() || !selected.length}>Salvar filtro</button></form>
      {savedFilters.length > 0 && <div className="filter-saved-list"><span>Filtros salvos neste dispositivo</span>{savedFilters.map((filter) => <button key={filter.name} type="button" onClick={() => onDeleteFilter(filter.name)}>{filter.name}<X size={13} /></button>)}</div>}
    </div>}
  </section>
}

