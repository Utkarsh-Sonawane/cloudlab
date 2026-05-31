import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Terminal, GitBranch, Mail, Lock, User, Eye, EyeOff, ArrowRight } from 'lucide-react'
import { Button } from '@/components/common/Button'
import { useAuth } from '@/hooks/useAuth'
import toast from 'react-hot-toast'
import { Logo } from '@/components/common/Logo'

import { useGoogleLogin } from '@react-oauth/google'

interface LoginFormProps { onSwitch: () => void }
interface RegisterFormProps { onSwitch: () => void }
interface SocialButtonsProps { 
  onGoogleSuccess: (token: string) => void;
  onGithubClick: () => void;
}

function SocialButtons({ onGoogleSuccess, onGithubClick }: SocialButtonsProps) {
  const login = useGoogleLogin({
    onSuccess: (tokenResponse) => onGoogleSuccess(tokenResponse.access_token),
    onError: () => toast.error('Google Login Failed'),
  })

  return (
    <div className="grid grid-cols-2 gap-3 mb-6">
      <button 
        type="button" 
        onClick={onGithubClick} 
        className="btn-secondary justify-center text-sm"
      >
        <GitBranch size={16} /> GitHub
      </button>
      <button 
        type="button" 
        onClick={() => login()} 
        className="btn-secondary justify-center text-sm"
      >
        <Mail size={16} /> Google
      </button>
    </div>
  )
}

function LoginForm({ onSwitch }: LoginFormProps) {
  const { signIn, isLoading } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPw, setShowPw] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await signIn(form.email, form.password)
    if ((res as any).error) {
      toast.error((res as any).payload as string || 'Login failed')
    } else {
      toast.success('Welcome back!')
      navigate('/dashboard')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-xs font-medium text-gray-400 mb-1.5 block">Email</label>
        <div className="relative">
          <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
          <input type="email" placeholder="you@example.com" required
            value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            className="input-field pl-10" />
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-gray-400 mb-1.5 block">Password</label>
        <div className="relative">
          <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
          <input type={showPw ? 'text' : 'password'} placeholder="••••••••" required
            value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            className="input-field pl-10 pr-10" />
          <button type="button" onClick={() => setShowPw(!showPw)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
            {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
      </div>
      <Button type="submit" variant="brand" className="w-full justify-center" loading={isLoading}>
        Sign in
      </Button>
      <p className="text-center text-xs text-gray-500">
        Don't have an account?{' '}
        <button type="button" onClick={onSwitch} className="text-brand-400 hover:text-brand-300 font-medium">
          Create one
        </button>
      </p>
    </form>
  )
}

function RegisterForm({ onSwitch }: RegisterFormProps) {
  const { signUp, isLoading } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', username: '', full_name: '', password: '', password2: '' })
  const [showPw, setShowPw] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.password !== form.password2) { toast.error('Passwords do not match'); return }
    const res = await signUp(form)
    if ((res as any).error) {
      toast.error((res as any).payload as string || 'Registration failed')
    } else {
      toast.success('Account created! Welcome to CloudLab 🚀')
      navigate('/dashboard')
    }
  }

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {[
        { key: 'full_name', label: 'Full Name', type: 'text', placeholder: 'Jane Doe', icon: <User size={16} /> },
        { key: 'username', label: 'Username', type: 'text', placeholder: 'janed0e', icon: <User size={16} /> },
        { key: 'email', label: 'Email', type: 'email', placeholder: 'jane@example.com', icon: <Mail size={16} /> },
      ].map(({ key, label, type, placeholder, icon }) => (
        <div key={key}>
          <label className="text-xs font-medium text-gray-400 mb-1.5 block">{label}</label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500">{icon}</span>
            <input type={type} placeholder={placeholder} required
              value={(form as any)[key]} onChange={e => set(key, e.target.value)}
              className="input-field pl-10" />
          </div>
        </div>
      ))}
      <div>
        <label className="text-xs font-medium text-gray-400 mb-1.5 block">Password</label>
        <div className="relative">
          <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
          <input type={showPw ? 'text' : 'password'} placeholder="Min 8 characters" required minLength={8}
            value={form.password} onChange={e => set('password', e.target.value)}
            className="input-field pl-10 pr-10" />
          <button type="button" onClick={() => setShowPw(!showPw)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
            {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-gray-400 mb-1.5 block">Confirm Password</label>
        <div className="relative">
          <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
          <input type="password" placeholder="Repeat password" required
            value={form.password2} onChange={e => set('password2', e.target.value)}
            className="input-field pl-10" />
        </div>
      </div>
      <Button type="submit" variant="brand" className="w-full justify-center" loading={isLoading}>
        Create account
      </Button>
      <p className="text-center text-xs text-gray-500">
        Already have an account?{' '}
        <button type="button" onClick={onSwitch} className="text-brand-400 hover:text-brand-300 font-medium">
          Sign in
        </button>
      </p>
    </form>
  )
}

// Module-level guard: persists across StrictMode's double mount/unmount cycle.
// Prevents the single-use GitHub OAuth code from being sent twice.
const _githubCodesInFlight = new Set<string>()

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true)
  const { socialSignIn } = useAuth()
  const navigate = useNavigate()

  const handleSocialSuccess = async (token: string, provider = 'google-oauth2') => {
    const res = await socialSignIn(provider, token) as any
    if (res.meta?.requestStatus === 'rejected' || res.error) {
      toast.error('Social login failed')
    } else {
      const providerName = provider.split('-')[0]
      toast.success(`Signed in with ${providerName.charAt(0).toUpperCase() + providerName.slice(1)}!`)
      navigate('/dashboard')
    }
  }

  const handleGithubLogin = () => {
    const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID
    const scope = 'user:email'
    window.location.href = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=${scope}`
  }

  // Handle GitHub OAuth callback — guarded at module level so StrictMode's
  // double-mount cannot send the single-use code to GitHub twice.
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const code = urlParams.get('code')
    if (code && !_githubCodesInFlight.has(code)) {
      _githubCodesInFlight.add(code)
      // Remove code from URL immediately
      window.history.replaceState({}, document.title, window.location.pathname)

      const loginViaGithub = async () => {
        const res = await socialSignIn('github', undefined, code) as any
        if (res.meta?.requestStatus === 'rejected' || res.error) {
          toast.error(`GitHub authentication failed: ${res.payload || 'Unknown error'}`)
          _githubCodesInFlight.delete(code) // allow retry with a new code
        } else {
          toast.success('Signed in with GitHub!')
          navigate('/dashboard')
        }
      }
      loginViaGithub()
    }
  }, [socialSignIn, navigate])

  return (
    <div className="min-h-screen bg-dark flex">
      {/* Left: decorative panel */}
      <div className="hidden lg:flex flex-col flex-1 bg-dark-surface border-r border-dark-border relative overflow-hidden">
        {/* ... (lines 189-212) ... */}
        <div className="absolute inset-0 bg-hero-grid opacity-30" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-brand-500/10 rounded-full blur-3xl" />
        <div className="flex flex-col items-center justify-center h-full relative z-10 px-12 text-center">
          <Link to="/" className="mb-12 transition-all duration-300 hover:drop-shadow-[0_0_20px_rgba(99,102,241,0.4)]">
            <Logo className="h-16" />
          </Link>
          <h2 className="text-4xl font-black text-white mb-4">Learn DevOps<br/>the right way</h2>
          <p className="text-gray-400 text-lg leading-relaxed max-w-sm">
            Real containers. Real commands. Real skills. All in your browser.
          </p>
          <div className="mt-12 terminal-container w-full text-left">
            <div className="flex gap-1.5 px-4 py-3 border-b border-dark-border">
              {['#ff5f57','#febc2e','#28c840'].map(c => <div key={c} className="w-3 h-3 rounded-full" style={{background:c}} />)}
            </div>
            <div className="p-4 font-mono text-sm space-y-1">
              <p className="text-brand-400">$ kubectl get pods -n production</p>
              <p className="text-gray-400">NAME                READY  STATUS   RESTARTS</p>
              <p className="text-emerald-400">api-deployment-xyz  1/1    Running  0</p>
              <p className="text-brand-400 mt-2">$ <span className="animate-pulse">▌</span></p>
            </div>
          </div>
        </div>
      </div>

      {/* Right: auth form */}
      <div className="flex-1 lg:max-w-md flex items-center justify-center p-8">
        <motion.div
          key={isLogin ? 'login' : 'register'}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-sm"
        >
          <div className="mb-8">
            <div className="lg:hidden flex items-center mb-8">
              <Link to="/">
                <Logo className="h-10" />
              </Link>
            </div>
            <h1 className="text-2xl font-bold text-white">{isLogin ? 'Welcome back' : 'Create account'}</h1>
            <p className="text-gray-400 text-sm mt-1">
              {isLogin ? 'Sign in to continue your learning journey' : 'Start learning DevOps for free'}
            </p>
          </div>

          {/* OAuth Buttons */}
          <SocialButtons 
            onGoogleSuccess={handleSocialSuccess} 
            onGithubClick={handleGithubLogin}
          />

          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-dark-border" />
            <span className="text-xs text-gray-600">or continue with email</span>
            <div className="flex-1 h-px bg-dark-border" />
          </div>

          {isLogin
            ? <LoginForm onSwitch={() => setIsLogin(false)} />
            : <RegisterForm onSwitch={() => setIsLogin(true)} />
          }
        </motion.div>
      </div>
    </div>
  )
}
