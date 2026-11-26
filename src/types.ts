export type EventCategory = 'trabalho' | 'saude' | 'estudos' | 'pessoal' | 'compromissos'
export type Recurrence = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'

export type CalendarEvent = {
  id: string
  user_id: string
  title: string
  description: string | null
  category: EventCategory
  starts_at: string
  ends_at: string | null
  is_completed: boolean
  recurrence: Recurrence
  created_at: string
  updated_at: string
}

export type EventInput = Pick<CalendarEvent, 'title' | 'description' | 'category' | 'starts_at' | 'ends_at' | 'recurrence'>

