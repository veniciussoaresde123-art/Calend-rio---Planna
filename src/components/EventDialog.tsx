import { useEffect, useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
import { bahiaInputToIso, bahiaInputValue } from '../lib/dates'
import type { CalendarEvent, EventCategory, EventInput, Recurrence } from '../types'
import type { CategoryOption } from './CategoryFilters'

type Props = { event: CalendarEvent | null; categories: CategoryOption[]; onClose: () => void; onSave: (input: EventInput) => Promise<void> }
const recurrence: { value: Recurrence; label: string }[] = [
  { value: 'none', label: 'Não se repete' }, { value: 'daily', label: 'Todos os dias' },
  { value: 'weekly', label: 'Toda semana' }, { value: 'monthly', label: 'Todo mês' }, { value: 'yearly', label: 'Todo ano' },
]

function defaultDate() {
  const date = new Date(Date.now() + 60 * 60 * 1000)
  date.setMinutes(0, 0, 0)
  return bahiaInputValue(date)
}

export default function EventDialog({ event, categories, onClose, onSave }: Props) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<EventCategory>('pessoal')
  const [startsAt, setStartsAt] = useState(defaultDate)
  const [recurs, setRecurs] = useState<Recurrence>('none')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setTitle(event?.title ?? '')
    setDescription(event?.description ?? '')
    setCategory(event?.category ?? 'pessoal')
    setStartsAt(event ? bahiaInputValue(new Date(event.starts_at)) : defaultDate())
    setRecurs(event?.recurrence ?? 'none')
    setError('')
  }, [event])

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

  return <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section className="event-dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><div className="dialog-heading"><div><span className="form-kicker">CUIDANDO DOS SEUS PLANOS</span><h2 id="dialog-title">{event ? 'Editar compromisso' : 'Um novo compromisso'}</h2></div><button className="icon-button dialog-close" type="button" onClick={onClose} aria-label="Fechar"><X size={20} /></button></div><form onSubmit={submit} className="event-form"><label className="field-label" htmlFor="event-title">O que você precisa lembrar?</label><input id="event-title" className="text-input" autoFocus required maxLength={160} placeholder="Ex.: Consulta com a dentista" value={title} onChange={(e) => setTitle(e.target.value)} /><label className="field-label" htmlFor="event-date">Quando?</label><input id="event-date" className="text-input" type="datetime-local" required value={startsAt} onChange={(e) => setStartsAt(e.target.value)} /><div className="form-row"><div><label className="field-label" htmlFor="event-category">Categoria</label><select id="event-category" className="text-input" value={category} onChange={(e) => setCategory(e.target.value as EventCategory)}>{categories.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}</select></div><div><label className="field-label" htmlFor="event-repeat">Repetição</label><select id="event-repeat" className="text-input" value={recurs} onChange={(e) => setRecurs(e.target.value as Recurrence)}>{recurrence.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}</select></div></div><label className="field-label" htmlFor="event-description">Uma observação <span className="optional-label">(opcional)</span></label><textarea id="event-description" className="text-input text-area" rows={3} placeholder="Algum detalhe que você queira guardar…" value={description} onChange={(e) => setDescription(e.target.value)} />{error && <div className="notice error-notice">{error}</div>}<div className="dialog-actions"><button className="secondary-button" type="button" onClick={onClose}>Cancelar</button><button className="primary-button" type="submit" disabled={saving}>{saving ? 'Salvando…' : event ? 'Salvar alterações' : 'Guardar na agenda'}</button></div></form></section></div>
}

