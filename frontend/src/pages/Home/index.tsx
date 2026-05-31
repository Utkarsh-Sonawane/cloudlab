import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Terminal, Server, GitBranch, Zap, Users, BookOpen,
  FlaskConical, ChevronRight, Check, ArrowRight
} from 'lucide-react'
import { Button } from '@/components/common/Button'
import { Logo } from '@/components/common/Logo'
import { BackgroundSymbols } from './components/BackgroundSymbols'

const FEATURES = [
  {
    icon: <Terminal size={24} className="text-sky-400" />,
    title: 'Docker Labs',
    desc: 'Real containers in your browser. Learn by running actual Docker commands.',
    color: 'bg-sky-500/10 border-sky-500/20',
  },
  {
    icon: <Server size={24} className="text-violet-400" />,
    title: 'Kubernetes Labs',
    desc: 'Deploy, scale, and manage pods hands-on in an isolated K8s cluster.',
    color: 'bg-violet-500/10 border-violet-500/20',
  },
  {
    icon: <GitBranch size={24} className="text-orange-400" />,
    title: 'Git & CI/CD',
    desc: 'Master branching, merging, rebasing, and GitHub Actions pipelines.',
    color: 'bg-orange-500/10 border-orange-500/20',
  },
]

const STATS = [
  { value: '50+', label: 'Lab Scenarios', icon: <FlaskConical size={20} /> },
  { value: '10K+', label: 'Learners', icon: <Users size={20} /> },
  { value: '20+', label: 'Courses', icon: <BookOpen size={20} /> },
  { value: '98%', label: 'Satisfaction', icon: <Zap size={20} /> },
]

const PLANS = [
  {
    name: 'Free', price: '$0', period: '/month',
    features: ['5 labs/month', 'Basic Docker & Linux', 'Community support', '30-min lab sessions'],
    cta: 'Get started free', to: '/register', highlight: false,
  },
  {
    name: 'Pro', price: '$19', period: '/month',
    features: ['Unlimited labs', 'All environments', 'Playground sandbox', '4-hour sessions', 'Priority support', 'Certificates'],
    cta: 'Start Pro trial', to: '/register?plan=pro', highlight: true,
  },
]

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } }),
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-dark overflow-x-hidden relative">
      <BackgroundSymbols />
      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section className="relative pt-12 pb-16 px-6 text-center overflow-hidden">
        {/* Background grid */}
        <div className="absolute inset-0 bg-hero-grid opacity-40 pointer-events-none" />
        {/* Glow orbs */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-40 left-1/4 w-[300px] h-[300px] bg-accent-cyan/5 rounded-full blur-3xl pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10 max-w-4xl mx-auto"
        >
          <div className="flex justify-center mb-4">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Logo className="h-24 md:h-32" />
            </motion.div>
          </div>

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-500/15 border border-brand-500/30 text-brand-300 text-sm font-medium mb-6">
            <Zap size={14} className="text-brand-400" />
            Real containers, real learning
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-none mb-4">
            <span className="text-white">Learn DevOps</span>
            <br />
            <span className="text-gradient">by Doing</span>
          </h1>

          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-8 leading-relaxed">
            CloudLab gives you a real terminal in your browser, connected to isolated Docker containers.
            Follow structured labs, validate your work, and level up.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/register">
              <Button variant="brand" size="lg" rightIcon={<ArrowRight size={18} />}>
                Start for free
              </Button>
            </Link>
            <Link to="/labs">
              <Button variant="secondary" size="lg">Browse labs</Button>
            </Link>
          </div>

          {/* Terminal preview */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="mt-16 terminal-container max-w-3xl mx-auto text-left"
          >
            <div className="flex items-center gap-1.5 px-4 py-3 border-b border-dark-border bg-dark-100">
              <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
              <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
              <div className="w-3 h-3 rounded-full bg-[#28c840]" />
              <span className="ml-3 text-xs text-gray-500 font-mono">cloudlab — bash</span>
            </div>
            <div className="p-6 font-mono text-sm">
              <p className="text-brand-400">$ docker run -d --name webserver -p 8080:80 nginx</p>
              <p className="text-gray-400 mt-1">a3f8e2c1b9d7...</p>
              <p className="text-brand-400 mt-3">$ docker ps</p>
              <p className="text-gray-400 mt-1">CONTAINER ID  IMAGE  STATUS   PORTS</p>
              <p className="text-emerald-400 mt-1">a3f8e2c1b9d7  nginx  Up 2s    0.0.0.0:8080→80/tcp  webserver</p>
              <p className="text-brand-400 mt-3">$ <span className="animate-pulse">▌</span></p>
            </div>
            <div className="border-t border-dark-border px-4 py-3 bg-emerald-500/10 flex items-center gap-2">
              <Check size={14} className="text-emerald-400" />
              <span className="text-xs text-emerald-400 font-medium">Task 2 validated! nginx container running on port 8080 ✓</span>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* ── Stats ───────────────────────────────────────────────────────────── */}
      <section className="py-16 px-6 border-y border-dark-border bg-dark-surface/50">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map((s, i) => (
            <motion.div key={s.label} custom={i} initial="hidden" whileInView="show" variants={fadeUp} viewport={{ once: true }}
              className="text-center">
              <div className="flex justify-center text-brand-400 mb-2">{s.icon}</div>
              <div className="text-3xl font-black text-white">{s.value}</div>
              <div className="text-sm text-gray-500 mt-1">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              Everything you need to <span className="text-gradient">master DevOps</span>
            </h2>
            <p className="text-gray-400 text-lg">Hands-on labs across the full cloud-native stack</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <motion.div key={f.title} custom={i} initial="hidden" whileInView="show" variants={fadeUp} viewport={{ once: true }}
                className={`glass-card p-6 border ${f.color} hover:scale-105 transition-transform duration-200`}>
                <div className="mb-4">{f.icon}</div>
                <h3 className="text-lg font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ─────────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-dark-surface/30">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-4xl font-bold text-white mb-4">Simple, transparent pricing</h2>
          <p className="text-gray-400">Start free. Upgrade when you're ready.</p>
        </div>
        <div className="max-w-3xl mx-auto grid md:grid-cols-2 gap-6">
          {PLANS.map((plan) => (
            <motion.div key={plan.name} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              className={`glass-card p-8 ${plan.highlight ? 'border-brand-500/50 shadow-glow' : ''}`}>
              {plan.highlight && (
                <div className="text-xs font-bold text-brand-400 uppercase tracking-widest mb-3">Most Popular</div>
              )}
              <div className="text-3xl font-black text-white">{plan.price}
                <span className="text-base font-normal text-gray-500">{plan.period}</span>
              </div>
              <div className="text-xl font-semibold text-gray-300 mt-1 mb-6">{plan.name}</div>
              <ul className="space-y-3 mb-8">
                {plan.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-400">
                    <Check size={14} className="text-emerald-400 shrink-0" />{f}
                  </li>
                ))}
              </ul>
              <Link to={plan.to}>
                <Button variant={plan.highlight ? 'brand' : 'secondary'} className="w-full justify-center">
                  {plan.cta}
                </Button>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <h2 className="text-4xl font-bold text-white mb-4">Ready to start your journey?</h2>
          <p className="text-gray-400 mb-8">Join thousands of engineers learning DevOps the right way.</p>
          <Link to="/register">
            <Button variant="brand" size="lg" rightIcon={<ArrowRight size={18} />}>
              Create free account
            </Button>
          </Link>
        </motion.div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="py-12 px-6 border-t border-dark-border bg-dark-surface/30">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex flex-col items-center md:items-start gap-4">
            <Logo className="h-8" />
            <p className="text-gray-500 text-sm max-w-xs text-center md:text-left">
              The premier hands-on platform for mastering DevOps and Cloud Native engineering.
            </p>
          </div>
          
          <div className="flex items-center gap-8 text-sm text-gray-400">
            <Link to="/labs" className="hover:text-white transition-colors">Labs</Link>
            <Link to="/courses" className="hover:text-white transition-colors">Courses</Link>
            <a href="#" className="hover:text-white transition-colors">Documentation</a>
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
          </div>

          <div className="text-xs text-gray-600">
            © {new Date().getFullYear()} CloudLab. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}
