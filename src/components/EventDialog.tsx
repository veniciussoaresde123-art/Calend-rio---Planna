import { useEffect, useState, type FormEvent } from 'react'
import { Sparkles, X } from 'lucide-react'
import { bahiaInputToIso, bahiaInputValue } from '../lib/dates'
import type { AIInterpretation, CalendarEvent, EventCategory, EventInput, Recurrence } from '../types'
import type { CategoryOption } from './CategoryFilters'

type Props = {
  event: CalendarEvent | null
  categories: CategoryOption[]
  onClose: () => void
  onSave: (input: EventInput) => Promise<void>
  onInterpret: (text: string) => Promise<AIInterpretation>
}
const recurrence: { value: Recurrence; label: string }[] = [
  { value: 'none', label: 'Não se repete' }, { value: 'daily', label: 'Todos os dias' },
  { value: 'weekly', label: 'Toda semana' }, { value: 'monthly', label: 'Todo mês' }, { value: 'yearly', label: 'Todo ano' },
]

function defaultDate() {
  const date = new Date(Date.now() + 60 * 60 * 1000)
  date.setMinutes(0, 0, 0)
  return bahiaInputValue(date)
}

export default function EventDialog({ event, categories, onClose, onSave, onInterpret }: Props) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<EventCategory>('pessoal')
  const [startsAt, setStartsAt] = useState(defaultDate)
  const [recurs, setRecurs] = useState<Recurrence>('none')
  const [saving, setSaving] = useState(false)
  const [interpreting, setInterpreting] = useState(false)
  const [naturalText, setNaturalText] = useState('')
  const [aiReady, setAiReady] = useState(false)
  const [aiClarification, setAiClarification] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    setTitle(event?.title ?? '')
    setDescription(event?.description ?? '')
    setCategory(event?.category ?? 'pessoal')
    setStartsAt(event ? bahiaInputValue(new Date(event.starts_at)) : defaultDate())
    setRecurs(event?.recurrence ?? 'none')
    setNaturalText('')
    setAiReady(false)
    setAiClarification('')
    setError('')
  }, [event])

  const interpret = async () => {
    if (!naturalText.trim()) return setError('Escreva o compromisso do jeito que você falaria.')
    setInterpreting(true)
    setError('')
    setAiClarification('')
    setAiReady(false)
    try {
      const result = await onInterpret(naturalText.trim())
      if (result.clarification || !result.date || !result.time) {
        setAiClarification(result.clarification || 'Qual data e horário você quer?')
        return
      }
      setTitle(result.title)
      setCategory(result.category)
      setStartsAt(`${result.date}T${result.time}`)
      setRecurs(result.recurrence)
      setAiReady(true)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível interpretar agora. Tente novamente.')
    } finally {
      setInterpreting(false)
    }
  }

  const submit = async (formEvent: FormEvent) => {
    formEvent.preventDefault()
    if (!startsAt) return setError('Escolha a data e o horário.')
    setSaving(true)
    setError('')
    try {
      await onSave({ title: title.trim(), description: description.trim() || null, category, starts_at: bahiaInputToIso(startsAt), ends_at: null, recurrence: recurs })
      onClose()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível salvar. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  const categoryName = categories.find((item) => item.value === category)?.label ?? category

  return <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section className="event-dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><div className="dialog-heading"><div><span className="form-kicker">CUIDANDO DOS SEUS PLANOS</span><h2 id="dialog-title">{event ? 'Editar compromisso' : 'Um novo compromisso'}</h2></div><button className="icon-button dialog-close" type="button" onClick={onClose} aria-label="Fechar"><X size={20} /></button></div>
    {!event && <div className="ai-entry"><label className="field-label" htmlFor="ai-event-text">Conte do seu jeito, e a IA organiza</label><textarea id="ai-event-text" className="text-input text-area ai-prompt-input" rows={2} maxLength={500} placeholder="Ex.: dentista amanhã às 15h" value={naturalText} onChange={(e) => setNaturalText(e.target.value)} /><button className="secondary-button ai-interpret-button" type="button" onClick={() => void interpret()} disabled={interpreting || !naturalText.trim()}><Sparkles size={15} />{interpreting ? 'Organizando…' : aiReady ? 'Interpretar outra frase' : 'Interpretar com IA'}</button>{aiClarification && <div className="ai-clarification" role="status"><Sparkles size={15} /><span>{aiClarification}<small>Inclua essa informação na frase e tente novamente.</small></span></div>}{aiReady && <div className="ai-confirmation" role="status"><span className="ai-confirmation-title"><Sparkles size={14} />Entendi assim — confira e ajuste se quiser</span><strong>{title}</strong><span>{startsAt.slice(0, 10)} · {startsAt.slice(11, 16)} · {categoryName}{recurs !== 'none' ? ` · ${recurrence.find((item) => item.value === recurs)?.label.toLocaleLowerCase()}` : ''}</span></div>}</div>}
    <form onSubmit={submit} className="event-form"><label className="field-label" htmlFor="event-title">O que você precisa lembrar?</label><input id="event-title" className="text-input" autoFocus required maxLength={160} placeholder="Ex.: Consulta com a dentista" value={title} onChange={(e) => setTitle(e.target.value)} /><label className="field-label" htmlFor="event-date">Quando?</label><input id="event-date" className="text-input" type="datetime-local" required value={startsAt} onChange={(e) => setStartsAt(e.target.value)} /><div className="form-row"><div><label className="field-label" htmlFor="event-category">Categoria</label><select id="event-category" className="text-input" value={category} onChange={(e) => setCategory(e.target.value as EventCategory)}>{categories.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}</select></div><div><label className="field-label" htmlFor="event-repeat">Repetição</label><select id="event-repeat" className="text-input" value={recurs} onChange={(e) => setRecurs(e.target.value as Recurrence)}>{recurrence.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}</select></div></div><label className="field-label" htmlFor="event-description">Uma observação <span className="optional-label">(opcional)</span></label><textarea id="event-description" className="text-input text-area" rows={3} placeholder="Algum detalhe que você queira guardar…" value={description} onChange={(e) => setDescription(e.target.value)} />{error && <div className="notice error-notice">{error}</div>}<div className="dialog-actions"><button className="secondary-button" type="button" onClick={onClose}>Cancelar</button><button className="primary-button" type="submit" disabled={saving}>{saving ? 'Salvando…' : aiReady ? 'Confirmar e guardar' : event ? 'Salvar alterações' : 'Guardar na agenda'}</button></div></form></section></div>
}

