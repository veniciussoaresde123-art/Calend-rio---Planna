import { useState, type FormEvent } from 'react'
import { ArrowRight, CalendarHeart, Check, Eye, EyeOff, Heart, Sparkles } from 'lucide-react'
import { supabase } from '../lib/supabase'

type Props = { configured: boolean }

export default function AuthScreen({ configured }: Props) {
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setMessage('')
    if (!supabase || !configured) return setError('Configure as variáveis do Supabase para começar.')
    setLoading(true)
    try {
      if (mode === 'signup') {
        const { data, error: authError } = await supabase.auth.signUp({ email: email.trim(), password })
        if (authError) throw authError
        if (!data.session) setMessage('Quase lá! Confira seu e-mail para confirmar a conta.')
      } else if (mode === 'reset') {
        const { error: authError } = await supabase.auth.resetPasswordForEmail(email.trim())
        if (authError) throw authError
        setMessage('Enviamos um link de recuperação para o seu e-mail.')
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (authError) throw authError
      }
    } catch (cause) {
      const authMessage = cause instanceof Error ? cause.message : ''
      if (/invalid login credentials/i.test(authMessage)) {
        setError('E-mail ou senha incorretos. Se ainda não criou sua conta, toque em “Criar conta”.')
      } else if (/email not confirmed/i.test(authMessage)) {
        setError('Confirme seu e-mail pelo link que enviamos antes de entrar.')
      } else if (/user already registered/i.test(authMessage)) {
        setError('Este e-mail já tem uma conta. Toque em “Fazer login” e entre com sua senha.')
      } else {
        setError(authMessage || 'Não foi possível entrar. Tente novamente.')
      }
    } finally {
      setLoading(false)
    }
  }

  const google = async () => {
    if (!supabase) return
    const { error: authError } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })
    if (authError) setError(authError.message)
  }

  const heading = mode === 'signup' ? 'Seu cantinho começa aqui' : mode === 'reset' ? 'Vamos recuperar o acesso' : 'Que bom ter você de volta'

  return (
    <main className="auth-page">
      <section className="auth-art" aria-label="Bem-vinda ao Planna">
        <div className="art-topline"><span className="brand brand-light"><span className="brand-mark"><CalendarHeart size={21} /></span> planna</span><span className="art-note">feito com amor para Anna <Heart size={13} fill="currentColor" /></span></div>
        <div className="art-copy"><span className="eyebrow"><Sparkles size={15} /> UM DIA DE CADA VEZ</span><h1>Seu dia pode ser leve.<br /><em>A gente cuida dos detalhes.</em></h1><p>Um lugarzinho só seu para lembrar do que importa e deixar a cabeça respirar.</p></div>
        <div className="art-card"><div className="art-card-icon"><Heart size={17} fill="currentColor" /></div><div><strong>Bom dia, Anna!</strong><span>Seu dia está florescendo 🌷</span></div><span className="art-card-sparkle"><Sparkles size={18} /></span></div>
        <div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" /><span className="art-flower flower-one">✿</span><span className="art-flower flower-two">✿</span>
      </section>
      <section className="auth-panel">
        <div className="auth-brand brand"><span className="brand-mark"><CalendarHeart size={20} /></span> planna</div>
        <div className="auth-form-wrap">
          <span className="form-kicker">UM PRESENTE PARA VOCÊ</span><h2>{heading}</h2><p className="form-intro">{mode === 'signup' ? 'Crie sua conta e comece a organizar tudo com carinho.' : mode === 'reset' ? 'Digite seu e-mail e enviaremos um link para você.' : 'Entre na sua agenda e siga no seu ritmo.'}</p>
          {message && <div className="notice success-notice"><Check size={17} />{message}</div>}
          {error && <div className="notice error-notice">{error}</div>}
          {!configured && <div className="notice config-notice">Falta configurar a conexão do Supabase. Veja o arquivo README para os próximos passos.</div>}
          <form onSubmit={submit} className="auth-form">
            <label className="field-label" htmlFor="email">Seu e-mail</label><input id="email" className="text-input" type="email" autoComplete="email" required placeholder="voce@exemplo.com" value={email} onChange={(event) => setEmail(event.target.value)} />
            {mode !== 'reset' && <><div className="password-label"><label className="field-label" htmlFor="password">Senha</label>{mode === 'login' && <button className="text-button" type="button" onClick={() => { setMode('reset'); setError(''); setMessage('') }}>Esqueci a senha</button>}</div><div className="password-wrap"><input id="password" className="text-input" type={showPassword ? 'text' : 'password'} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} minLength={6} required placeholder="Pelo menos 6 caracteres" value={password} onChange={(event) => setPassword(event.target.value)} /><button type="button" className="icon-button password-toggle" aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></>}
            <button className="primary-button auth-submit" type="submit" disabled={loading || !configured}>{loading ? 'Só um instante…' : mode === 'signup' ? 'Criar minha conta' : mode === 'reset' ? 'Enviar link' : 'Entrar na minha agenda'}<ArrowRight size={17} /></button>
          </form>
          {mode !== 'reset' && <><div className="divider"><span>ou continue com</span></div><button className="google-button" type="button" onClick={google} disabled={!configured}><span className="google-g">G</span>Google</button></>}
          <p className="switch-mode">{mode === 'login' ? 'Ainda não tem uma conta?' : mode === 'reset' ? 'Lembrou a senha?' : 'Já tem uma conta?'} <button type="button" className="text-button strong-link" onClick={() => { setMode(mode === 'signup' ? 'login' : 'login'); setError(''); setMessage('') }}>{mode === 'login' ? 'Criar conta' : 'Fazer login'}</button></p>
          <div className="privacy-note"><span className="privacy-dot" /><span>Seus compromissos ficam protegidos e só você pode vê-los.</span></div>
        </div>
        <footer className="auth-footer">um lembrete gentil de que você está indo bem <Heart size={12} fill="currentColor" /></footer>
      </section>
    </main>
  )
}
