import { useCallback, useEffect, useState } from 'react'
import { CalendarDays, CalendarHeart, Check, ChevronDown, CircleUserRound, Clock3, LogOut, Plus, Sparkles, Trash2 } from 'lucide-react'
import AuthScreen from './components/AuthScreen'
import EventDialog from './components/EventDialog'
import { formatBahiaDate, formatBahiaTime, isTodayInBahia } from './lib/dates'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import type { CalendarEvent, EventInput } from './types'

const categoryLabels: Record<string, string> = { pessoal: 'Pessoal', trabalho: 'Trabalho', saude: 'Saúde', estudos: 'Estudos', compromissos: 'Compromissos' }

export default function App() {
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loadingEvents, setLoadingEvents] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<CalendarEvent | null>(null)
  const [toast, setToast] = useState('')

  useEffect(() => {
    if (!supabase) { setAuthReady(true); return }
    supabase.auth.getSession().then(({ data }) => { setUser(data.session?.user ? { id: data.session.user.id, email: data.session.user.email } : null); setAuthReady(true) })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ? { id: session.user.id, email: session.user.email } : null
      setUser(nextUser)
      if (!nextUser) setEvents([])
    })
    return () => subscription.unsubscribe()
  }, [])

  const loadEvents = useCallback(async () => {
    if (!supabase || !user) return
    setLoadingEvents(true)
    setLoadError('')
    const { data, error } = await supabase.from('events').select('*').order('starts_at', { ascending: true }).limit(100)
    if (error) setLoadError(error.message)
    else setEvents((data ?? []) as CalendarEvent[])
    setLoadingEvents(false)
  }, [user])

  useEffect(() => { void loadEvents() }, [loadEvents])

  const name = 'Anna'
  const today = events.filter((event) => isTodayInBahia(event.starts_at))
  const upcoming = events.filter((event) => new Date(event.starts_at).getTime() > Date.now() && !event.is_completed).slice(0, 3)
  const openNew = () => { setEditing(null); setDialogOpen(true) }

  const saveEvent = async (input: EventInput) => {
    if (!supabase || !user) throw new Error('Entre na sua conta para guardar um compromisso.')
    const result = editing
      ? await supabase.from('events').update(input).eq('id', editing.id).select().single()
      : await supabase.from('events').insert({ ...input, user_id: user.id }).select().single()
    if (result.error) throw result.error
    await loadEvents()
    setToast(editing ? 'Seu compromisso foi atualizado.' : 'Compromisso guardado com carinho.')
  }

  const toggleComplete = async (event: CalendarEvent) => {
    if (!supabase) return
    const { error } = await supabase.from('events').update({ is_completed: !event.is_completed }).eq('id', event.id)
    if (error) setToast('Não foi possível atualizar. Tente novamente.')
    else { await loadEvents(); setToast(event.is_completed ? 'Compromisso reaberto.' : 'Mais uma coisa resolvida. Muito bem!') }
  }

  const deleteEvent = async (event: CalendarEvent) => {
    if (!supabase || !window.confirm(`Excluir “${event.title}” da agenda?`)) return
    const { error } = await supabase.from('events').delete().eq('id', event.id)
    if (error) setToast('Não foi possível excluir. Tente novamente.')
    else { await loadEvents(); setToast('Compromisso removido da agenda.') }
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
      <section className="day-card"><div className="day-card-head"><div><span className="section-kicker">SUA AGENDA</span><h2>Hoje, com carinho</h2></div><span className="today-count">{today.length} {today.length === 1 ? 'lembrete' : 'lembretes'}</span></div>
        {loadingEvents ? <div className="empty-state"><div className="loading-spinner" />Carregando sua agenda…</div> : loadError ? <div className="notice error-notice">Não foi possível carregar seus compromissos: {loadError}<button className="text-button strong-link" onClick={() => void loadEvents()}>Tentar de novo</button></div> : today.length ? <div className="event-list">{today.map((event) => <EventRow key={event.id} event={event} onToggle={() => void toggleComplete(event)} onEdit={() => { setEditing(event); setDialogOpen(true) }} onDelete={() => void deleteEvent(event)} />)}</div> : <div className="empty-state"><div className="empty-illustration"><CalendarDays size={26} /><span>✿</span></div><strong>Seu dia está com espaço para respirar</strong><span>Nenhum compromisso por aqui. Quer adicionar algo?</span><button className="soft-button" onClick={openNew}><Plus size={16} />Adicionar lembrete</button></div>}
        <button className="add-event-button" onClick={openNew}><span className="add-circle"><Plus size={20} /></span><span><strong>Adicionar compromisso</strong><small>Uma ideia, um plano, um lembrete</small></span><span className="add-arrow">→</span></button>
      </section>
      {upcoming.length > 0 && <section className="upcoming-section"><div className="section-title-row"><div><span className="section-kicker">UM OLHAR ADIANTE</span><h2>Vem por aí</h2></div><span className="upcoming-flower">✿</span></div><div className="upcoming-list">{upcoming.map((event) => <div className="upcoming-item" key={event.id}><div className="upcoming-date"><strong>{formatBahiaDate(event.starts_at, { day: '2-digit' })}</strong><span>{formatBahiaDate(event.starts_at, { month: 'short' }).replace('.', '')}</span></div><div className={`event-color-dot category-${event.category}`} /><div className="upcoming-info"><strong>{event.title}</strong><span>{formatBahiaDate(event.starts_at, { weekday: 'long' })} · {formatBahiaTime(event.starts_at)}</span></div><button className="icon-button" aria-label={`Editar ${event.title}`} onClick={() => { setEditing(event); setDialogOpen(true) }}>···</button></div>)}</div></section>}
      <div className="gentle-note"><span>♡</span> Você não precisa fazer tudo de uma vez. Só o próximo passo.</div>
    </main><nav className="mobile-nav" aria-label="Navegação principal"><button className="nav-item active"><CalendarHeart size={19} /><span>Hoje</span></button><button className="nav-item" onClick={openNew}><Plus size={19} /><span>Adicionar</span></button><button className="nav-item" onClick={() => setToast('A visualização de calendário chega na próxima fase!')}><CalendarDays size={19} /><span>Calendário</span></button><button className="nav-item" onClick={() => setToast(`Conta: ${user.email ?? ''}`)}><CircleUserRound size={19} /><span>Conta</span></button></nav>
    {dialogOpen && <EventDialog event={editing} onClose={() => setDialogOpen(false)} onSave={saveEvent} />}{toast && <div className="toast"><Check size={16} />{toast}</div>}</div>
}

function EventRow({ event, onToggle, onEdit, onDelete }: { event: CalendarEvent; onToggle: () => void; onEdit: () => void; onDelete: () => void }) {
  return <article className={`event-row ${event.is_completed ? 'is-completed' : ''}`}><button className={`complete-button ${event.is_completed ? 'checked' : ''}`} type="button" aria-label={event.is_completed ? 'Marcar como pendente' : 'Marcar como concluído'} onClick={onToggle}>{event.is_completed && <Check size={14} strokeWidth={3} />}</button><div className={`event-color-dot category-${event.category}`} /><div className="event-main"><div className="event-title-line"><strong>{event.title}</strong><span className={`category-tag category-${event.category}`}>{categoryLabels[event.category] ?? 'Pessoal'}</span></div><div className="event-meta"><Clock3 size={13} />{formatBahiaTime(event.starts_at)}{event.description && <><span className="meta-separator">·</span><span className="event-description">{event.description}</span></>}</div></div><div className="row-actions"><button className="icon-button" aria-label={`Editar ${event.title}`} onClick={onEdit}>✎</button><button className="icon-button delete-action" aria-label={`Excluir ${event.title}`} onClick={onDelete}><Trash2 size={15} /></button></div></article>
}

