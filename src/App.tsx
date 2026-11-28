import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { CalendarDays, CalendarHeart, Check, ChevronDown, CircleUserRound, Clock3, LogOut, Plus, Sparkles, Trash2 } from 'lucide-react'
import AuthScreen from './components/AuthScreen'
import CategoryFilters, { type CategoryOption, type SavedCategoryFilter } from './components/CategoryFilters'
import EventDialog from './components/EventDialog'
import { formatBahiaDate, formatBahiaTime, isTodayInBahia } from './lib/dates'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import type { CalendarEvent, EventInput } from './types'

const categoryLabels: Record<string, string> = { pessoal: 'Pessoal', trabalho: 'Trabalho', saude: 'Saúde', estudos: 'Estudos', compromissos: 'Compromissos' }
const builtInCategories: CategoryOption[] = [
  { value: 'pessoal', label: 'Pessoal' }, { value: 'trabalho', label: 'Trabalho' }, { value: 'saude', label: 'Saúde' },
  { value: 'estudos', label: 'Estudos' }, { value: 'compromissos', label: 'Compromissos' },
]

export default function App() {
  const [user, setUser] = useState<{ id: string; email?: string; fullName?: string } | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [customCategories, setCustomCategories] = useState<CategoryOption[]>([])
  const [savedFilters, setSavedFilters] = useState<SavedCategoryFilter[]>([])
  const [activeCategories, setActiveCategories] = useState<string[] | null>(null)
  const [settingsReadyFor, setSettingsReadyFor] = useState<string | null>(null)
  const [loadingEvents, setLoadingEvents] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [saveStatus, setSaveStatus] = useState<'loading' | 'saved' | 'saving' | 'error'>('loading')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<CalendarEvent | null>(null)
  const [toast, setToast] = useState('')
  const [nameInput, setNameInput] = useState('')
  const [nameSaving, setNameSaving] = useState(false)
  const [nameError, setNameError] = useState('')

  useEffect(() => {
    if (!supabase) { setAuthReady(true); return }
    supabase.auth.getSession().then(({ data }) => { const authUser = data.session?.user; setUser(authUser ? { id: authUser.id, email: authUser.email, fullName: typeof authUser.user_metadata?.full_name === 'string' ? authUser.user_metadata.full_name : undefined } : null); setAuthReady(true) })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const authUser = session?.user
      const nextUser = authUser ? { id: authUser.id, email: authUser.email, fullName: typeof authUser.user_metadata?.full_name === 'string' ? authUser.user_metadata.full_name : undefined } : null
      setUser(nextUser)
      if (!nextUser) setEvents([])
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const userId = user?.id
    if (!supabase || !userId) return
    let cancelled = false
    setSettingsReadyFor(null)
    void (async () => {
      const { error: createError } = await supabase.from('user_settings').upsert(
        { user_id: userId },
        { onConflict: 'user_id', ignoreDuplicates: true },
      )
      const { data, error } = await supabase.from('user_settings').select('custom_categories,saved_filters').eq('user_id', userId).maybeSingle()
      if (cancelled) return
      if (createError || error) setToast('Não foi possível carregar suas categorias e filtros salvos.')
      if (data?.custom_categories) setCustomCategories(data.custom_categories as CategoryOption[])
      if (data?.saved_filters) setSavedFilters(data.saved_filters as SavedCategoryFilter[])
      setSettingsReadyFor(userId)
    })()
    return () => { cancelled = true }
  }, [user?.id])

  useEffect(() => {
    const userId = user?.id
    if (!supabase || !userId || settingsReadyFor !== userId) return
    void supabase.from('user_settings').update({ custom_categories: customCategories, saved_filters: savedFilters }).eq('user_id', userId).then(({ error }) => {
      if (error) setToast('Não foi possível sincronizar suas categorias e filtros.')
    })
  }, [customCategories, savedFilters, settingsReadyFor, user?.id])

  const loadEvents = useCallback(async () => {
    if (!supabase || !user) return
    setLoadingEvents(true)
    setLoadError('')
    setSaveStatus('loading')
    try {
      const { data, error } = await supabase.from('events').select('*').order('starts_at', { ascending: true }).limit(100)
      if (error) throw error
      setEvents((data ?? []) as CalendarEvent[])
      setSaveStatus('saved')
    } catch {
      setLoadError('Não foi possível carregar seus compromissos. Confira sua conexão e tente novamente.')
      setSaveStatus('error')
    } finally {
      setLoadingEvents(false)
    }
  }, [user])

  useEffect(() => { void loadEvents() }, [loadEvents])

  useEffect(() => {
    const handleOffline = () => {
      setSaveStatus('error')
      setToast('Você está sem conexão. Suas alterações não foram sincronizadas.')
    }
    const handleOnline = () => {
      setToast('Conexão restaurada. Atualizando sua agenda…')
      void loadEvents()
    }
    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)
    return () => {
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
    }
  }, [loadEvents])

  const name = user?.fullName?.trim().split(/\s+/)[0] ?? ''
  const needsName = Boolean(user && !user.fullName?.trim())
  const categories = [...builtInCategories, ...customCategories]

  useEffect(() => { setActiveCategories(null) }, [user?.id])

  const addCategory = (label: string) => {
    const cleanLabel = label.trim().replace(/\s+/g, ' ')
    if (!cleanLabel) return
    const normalized = cleanLabel.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase()
    if (categories.some((item) => item.label.toLocaleLowerCase() === cleanLabel.toLocaleLowerCase())) {
      setToast('Essa categoria já está na sua lista.')
      return
    }
    const baseValue = normalized.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'categoria'
    const value = categories.some((item) => item.value === baseValue) ? `${baseValue}-${Date.now().toString(36)}` : baseValue
    setCustomCategories((current) => [...current, { value, label: cleanLabel }])
    setToast(`Categoria “${cleanLabel}” criada e salva na sua conta.`)
  }
  const saveCategoryFilter = (filter: SavedCategoryFilter) => {
    setSavedFilters((current) => [...current.filter((item) => item.name.toLocaleLowerCase() !== filter.name.toLocaleLowerCase()), filter])
    setActiveCategories(filter.categories)
    setToast(`Filtro “${filter.name}” salvo na sua conta.`)
  }
  const deleteCategoryFilter = (name: string) => setSavedFilters((current) => current.filter((filter) => filter.name !== name))

  const saveName = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const fullName = nameInput.trim().replace(/\s+/g, ' ')
    if (!supabase || !user || !fullName) return
    setNameSaving(true)
    setNameError('')
    const { data, error } = await supabase.auth.updateUser({ data: { full_name: fullName } })
    if (error) setNameError('Não conseguimos salvar seu nome. Tente novamente.')
    else setUser({ id: data.user.id, email: data.user.email, fullName })
    setNameSaving(false)
  }
  const today = events.filter((event) => isTodayInBahia(event.starts_at) && (!activeCategories || activeCategories.includes(event.category)))
  const upcoming = events.filter((event) => new Date(event.starts_at).getTime() > Date.now() && !event.is_completed && (!activeCategories || activeCategories.includes(event.category))).slice(0, 3)
  const openNew = () => { setEditing(null); setDialogOpen(true) }

  const saveEvent = async (input: EventInput) => {
    if (!supabase || !user) throw new Error('Entre na sua conta para guardar um compromisso.')
    setSaveStatus('saving')
    try {
      const result = editing
        ? await supabase.from('events').update(input).eq('id', editing.id).select().single()
        : await supabase.from('events').insert({ ...input, user_id: user.id }).select().single()
      if (result.error) throw result.error
      setSaveStatus('saved')
      await loadEvents()
      setToast(editing ? 'Seu compromisso foi atualizado.' : 'Compromisso guardado com carinho.')
    } catch {
      setSaveStatus('error')
      throw new Error('Não foi possível guardar o compromisso. Confira sua conexão e tente novamente.')
    }
  }

  const toggleComplete = async (event: CalendarEvent) => {
    if (!supabase) return
    setSaveStatus('saving')
    try {
      const { error } = await supabase.from('events').update({ is_completed: !event.is_completed }).eq('id', event.id)
      if (error) throw error
      setSaveStatus('saved')
      await loadEvents()
      setToast(event.is_completed ? 'Compromisso reaberto.' : 'Mais uma coisa resolvida. Muito bem!')
    } catch {
      setSaveStatus('error')
      setToast('Não foi possível atualizar. Confira sua conexão e tente novamente.')
    }
  }

  const deleteEvent = async (event: CalendarEvent) => {
    if (!supabase || !window.confirm(`Excluir “${event.title}” da agenda?`)) return
    setSaveStatus('saving')
    try {
      const { error } = await supabase.from('events').delete().eq('id', event.id)
      if (error) throw error
      setSaveStatus('saved')
      await loadEvents()
      setToast('Compromisso removido da agenda.')
    } catch {
      setSaveStatus('error')
      setToast('Não foi possível excluir. Confira sua conexão e tente novamente.')
    }
  }

  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(''), 3200); return () => window.clearTimeout(timer) }, [toast])

  if (!authReady) return <div className="boot-screen"><div className="brand"><span className="brand-mark"><CalendarHeart size={20} /></span> planna</div><span className="boot-dots">Preparando seu cantinho…</span></div>
  if (!user) return <AuthScreen configured={isSupabaseConfigured} />

  const now = new Date().toISOString()
  const dateHeading = formatBahiaDate(now, { weekday: 'long', day: 'numeric', month: 'long' })
  const hour = Number(formatBahiaDate(now, { hour: '2-digit', hourCycle: 'h23' }))
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'

  return <div className="app-shell"><header className="topbar"><a className="brand" href="#inicio" aria-label="Planna, início"><span className="brand-mark"><CalendarHeart size={19} /></span> planna</a><div className="topbar-right"><button className="user-pill" type="button" title={user.email}><span className="user-avatar">{name.charAt(0)}</span><span>{name}</span><ChevronDown size={14} /></button><button className="icon-button logout-button" type="button" aria-label="Sair da conta" title="Sair" onClick={() => void supabase?.auth.signOut()}><LogOut size={17} /></button></div></header>
    <main className="dashboard" id="inicio"><div className="welcome-row"><div><span className="date-overline">{dateHeading}</span><h1>{greeting}, {name}<span className="wave"> ✿</span></h1><p>Vamos deixar seu dia mais leve?</p></div><div className="welcome-sparkle"><Sparkles size={19} /></div></div>
      <section className="day-card"><div className="day-card-head"><div><span className="section-kicker">SUA AGENDA</span><h2>Hoje, com carinho</h2></div><div className="day-card-actions"><span className="today-count">{today.length} {today.length === 1 ? 'lembrete' : 'lembretes'}</span><span className={`save-status save-status-${saveStatus}`} role="status" aria-live="polite"><span className="save-status-dot" />{saveStatus === 'saving' ? 'Salvando…' : saveStatus === 'loading' ? 'Carregando…' : saveStatus === 'error' ? 'Não sincronizado' : 'Salvo'}</span></div></div>
        <CategoryFilters categories={categories} activeCategories={activeCategories} savedFilters={savedFilters} onSelect={setActiveCategories} onAddCategory={addCategory} onSaveFilter={saveCategoryFilter} onDeleteFilter={deleteCategoryFilter} />
        {loadingEvents ? <div className="empty-state"><div className="loading-spinner" />Carregando sua agenda…</div> : loadError ? <div className="notice error-notice">Não foi possível carregar seus compromissos: {loadError}<button className="text-button strong-link" onClick={() => void loadEvents()}>Tentar de novo</button></div> : today.length ? <div className="event-list">{today.map((event) => <EventRow key={event.id} event={event} categories={categories} onToggle={() => void toggleComplete(event)} onEdit={() => { setEditing(event); setDialogOpen(true) }} onDelete={() => void deleteEvent(event)} />)}</div> : <div className="empty-state"><div className="empty-illustration"><CalendarDays size={26} /><span>✿</span></div><strong>{activeCategories ? 'Nenhum compromisso nesta categoria' : 'Seu dia está com espaço para respirar'}</strong><span>{activeCategories ? 'Tente outra categoria ou veja todos os compromissos.' : 'Nenhum compromisso por aqui. Quer adicionar algo?'}</span>{!activeCategories && <button className="soft-button" onClick={openNew}><Plus size={16} />Adicionar lembrete</button>}</div>}
        <button className="add-event-button" onClick={openNew}><span className="add-circle"><Plus size={20} /></span><span><strong>Adicionar compromisso</strong><small>Uma ideia, um plano, um lembrete</small></span><span className="add-arrow">→</span></button>
      </section>
      {upcoming.length > 0 && <section className="upcoming-section"><div className="section-title-row"><div><span className="section-kicker">UM OLHAR ADIANTE</span><h2>Vem por aí</h2></div><span className="upcoming-flower">✿</span></div><div className="upcoming-list">{upcoming.map((event) => <div className="upcoming-item" key={event.id}><div className="upcoming-date"><strong>{formatBahiaDate(event.starts_at, { day: '2-digit' })}</strong><span>{formatBahiaDate(event.starts_at, { month: 'short' }).replace('.', '')}</span></div><div className={`event-color-dot category-${event.category}`} /><div className="upcoming-info"><strong>{event.title}</strong><span>{formatBahiaDate(event.starts_at, { weekday: 'long' })} · {formatBahiaTime(event.starts_at)}</span></div><button className="icon-button" aria-label={`Editar ${event.title}`} onClick={() => { setEditing(event); setDialogOpen(true) }}>···</button></div>)}</div></section>}
      <div className="gentle-note"><span>♡</span> Você não precisa fazer tudo de uma vez. Só o próximo passo.</div>
    </main><nav className="mobile-nav" aria-label="Navegação principal"><button className="nav-item active"><CalendarHeart size={19} /><span>Hoje</span></button><button className="nav-item" onClick={openNew}><Plus size={19} /><span>Adicionar</span></button><button className="nav-item" onClick={() => setToast('A visualização de calendário chega na próxima fase!')}><CalendarDays size={19} /><span>Calendário</span></button><button className="nav-item" onClick={() => setToast(`Conta: ${user.email ?? ''}`)}><CircleUserRound size={19} /><span>Conta</span></button></nav>
    {dialogOpen && <EventDialog event={editing} categories={categories} onClose={() => setDialogOpen(false)} onSave={saveEvent} />}{needsName && <div className="dialog-backdrop"><section className="event-dialog" role="dialog" aria-modal="true" aria-labelledby="name-dialog-title"><div className="dialog-heading"><div><span className="form-kicker">UM POUCO SOBRE VOCÊ</span><h2 id="name-dialog-title">Como podemos te chamar?</h2></div></div><p className="form-intro">Seu nome aparece na sua agenda e deixa tudo mais pessoal.</p><form className="event-form" onSubmit={saveName}><label className="field-label" htmlFor="profile-name">Seu nome</label><input id="profile-name" className="text-input" autoFocus autoComplete="name" maxLength={80} required placeholder="Ex.: Maria Clara" value={nameInput} onChange={(event) => setNameInput(event.target.value)} />{nameError && <div className="notice error-notice">{nameError}</div>}<div className="dialog-actions"><button className="primary-button" type="submit" disabled={nameSaving || !nameInput.trim()}>{nameSaving ? 'Salvando…' : 'Continuar'}</button></div></form></section></div>}{toast && <div className="toast"><Check size={16} />{toast}</div>}</div>
}

function EventRow({ event, categories, onToggle, onEdit, onDelete }: { event: CalendarEvent; categories: CategoryOption[]; onToggle: () => void; onEdit: () => void; onDelete: () => void }) {
  const categoryLabel = categories.find((item) => item.value === event.category)?.label ?? categoryLabels[event.category] ?? event.category
  return <article className={`event-row ${event.is_completed ? 'is-completed' : ''}`}><button className={`complete-button ${event.is_completed ? 'checked' : ''}`} type="button" aria-label={event.is_completed ? 'Marcar como pendente' : 'Marcar como concluído'} onClick={onToggle}>{event.is_completed && <Check size={14} strokeWidth={3} />}</button><div className={`event-color-dot category-${event.category}`} /><div className="event-main"><div className="event-title-line"><strong>{event.title}</strong><span className={`category-tag category-${event.category}`}>{categoryLabel}</span></div><div className="event-meta"><Clock3 size={13} />{formatBahiaTime(event.starts_at)}{event.description && <><span className="meta-separator">·</span><span className="event-description">{event.description}</span></>}</div></div><div className="row-actions"><button className="icon-button" aria-label={`Editar ${event.title}`} onClick={onEdit}>✎</button><button className="icon-button delete-action" aria-label={`Excluir ${event.title}`} onClick={onDelete}><Trash2 size={15} /></button></div></article>
}


