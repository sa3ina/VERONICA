'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowRight, BrainCircuit, ShieldCheck, Waves, CheckCircle2, Activity, Globe2, Sparkles } from 'lucide-react';
import { TopNav } from '@/components/layout/top-nav';
import { Footer } from '@/components/layout/footer';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SectionHeading } from '@/components/ui/section-heading';
import { useApp } from '@/components/providers/app-provider';
import { TransitHeroScene } from '@/components/three/transit-hero-scene';
import { apiClient } from '@/services/api-client';

const features = [
  { title: 'Predictive flow intelligence', text: 'Forecast passenger density, occupancy and route delays before peak overload.', icon: BrainCircuit },
  { title: 'Operator command center', text: 'Give admin teams a unified view of routes, alerts, actions and smart resourcing.', icon: ShieldCheck },
  { title: 'Passenger-first recommendations', text: 'Offer lower-risk, lower-crowding route suggestions with AI-ready hooks.', icon: Waves }
];

const trustPoints = [
  'Role-based access for staff, admin, and passengers',
  'WCAG-friendly contrast across five themes',
  'Mock-safe AI fallback when network is offline'
];

const demoAccessByRole = {
  user: { email: 'user@azcon.ai', password: 'User123!', redirect: '/dashboard' },
  staff: { email: 'staff@azcon.ai', password: 'Staff123!', redirect: '/staff' },
  admin: { email: 'admin@azcon.ai', password: 'Admin123!', redirect: '/admin' }
} as const;

type DemoRole = keyof typeof demoAccessByRole;

export default function HomePage() {
  const router = useRouter();
  const { t, setAuth } = useApp();
  const [overview, setOverview] = useState<any>(null);
  const [demoLoadingRole, setDemoLoadingRole] = useState<DemoRole | null>(null);

  useEffect(() => { apiClient.getPublicOverview().then(setOverview).catch(() => undefined); }, []);

  const handleDemoLogin = async (role: DemoRole) => {
    const account = demoAccessByRole[role];
    setDemoLoadingRole(role);
    try {
      const result = await apiClient.login({ email: account.email, password: account.password });
      setAuth(result, { rememberMe: true });
      router.push(account.redirect);
    } catch {
      router.push('/login');
    } finally {
      setDemoLoadingRole(null);
    }
  };

  const stats = overview ? [
    { label: 'Managed entities', value: overview.analytics?.overview?.managedEntities ?? '—' },
    { label: 'Employees', value: overview.analytics?.overview?.employees ? `${overview.analytics.overview.employees}+` : '—' },
    { label: 'Live routes', value: overview.routes?.length ?? '—' }
  ] : null;

  return (
    <div className='relative'>
      <TopNav />

      {/* HERO */}
      <section className='page-shell pb-16 pt-14 md:pt-20'>
        <div className='grid items-start gap-10 lg:grid-cols-[1.05fr_0.95fr]'>
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <h1 className='text-display'>
              <span className='text-gradient'>{t.hero.title}</span>
            </h1>

            <p className='mt-5 max-w-xl text-base leading-7 text-[color:var(--text-soft)] md:text-lg'>{t.hero.subtitle}</p>

            <div className='mt-7 flex flex-wrap gap-3'>
              <Link href='/register'>
                <Button size='lg' rightIcon={<ArrowRight className='h-4 w-4' />}>{t.hero.ctaPrimary}</Button>
              </Link>
              <Link href='/dashboard'>
                <Button variant='secondary' size='lg'>{t.hero.ctaSecondary}</Button>
              </Link>
            </div>

            <div className='mt-4 flex flex-wrap gap-2'>
              <Button variant='outline' onClick={() => handleDemoLogin('user')} loading={demoLoadingRole === 'user'}>
                User kimi daxil ol
              </Button>
              <Button variant='outline' onClick={() => handleDemoLogin('staff')} loading={demoLoadingRole === 'staff'}>
                Staff kimi daxil ol
              </Button>
              <Button variant='outline' onClick={() => handleDemoLogin('admin')} loading={demoLoadingRole === 'admin'}>
                Admin kimi daxil ol
              </Button>
            </div>

            <ul className='mt-8 grid gap-2.5 sm:grid-cols-2'>
              {trustPoints.map((p) => (
                <li key={p} className='flex items-start gap-2 text-sm text-[color:var(--text-soft)]'>
                  <CheckCircle2 className='mt-0.5 h-4 w-4 shrink-0 text-[color:var(--success)]' />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* 3D centerpiece */}
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}>
            <TransitHeroScene />
          </motion.div>
        </div>

        {/* Stat ribbon */}
        {stats ? (
          <div className='mt-14 grid gap-4 md:grid-cols-3'>
            {stats.map((item, idx) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.06 + 0.2 }}
                className='relative overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[var(--surface)] p-5'
              >
                <span className='absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,#ccff00,transparent)] opacity-60 shadow-neon-sm' />
                <p className='text-overline'>{item.label}</p>
                <p className='numeric mt-3 text-3xl font-semibold tracking-tight'>{item.value}</p>
              </motion.div>
            ))}
          </div>
        ) : null}
      </section>

      {/* FEATURES */}
      <section id='features' className='page-shell py-16'>
        <SectionHeading
          overline='Platform capabilities'
          title='Three pillars of intelligent transit'
          description='Operations, intelligence, and passenger experience — unified into a single, themeable workspace.'
        />
        <div className='mt-10 grid gap-5 md:grid-cols-3'>
          {features.map(({ title, text, icon: Icon }, idx) => (
            <motion.div key={title} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.08 + 0.1 }}>
              <Card className='h-full'>
                <div className='flex h-11 w-11 items-center justify-center rounded-xl border border-[#ccff00]/30 bg-[var(--surface-2)] text-[#ccff00] shadow-neon-sm'>
                  <Icon className='h-5 w-5' />
                </div>
                <h3 className='mt-5 text-h3'>{title}</h3>
                <p className='mt-2 text-sm leading-6 text-[color:var(--text-soft)]'>{text}</p>
                <div className='divider mt-5' />
                <p className='mt-4 inline-flex items-center gap-1.5 text-xs text-[color:var(--text-soft)]'>
                  <span className='dot bg-[#ccff00] shadow-neon-sm' /> Module enabled
                </p>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* PLATFORM */}
      <section id='platform' className='page-shell py-12'>
        <Card variant='gradient' className='relative overflow-hidden p-8 md:p-10'>
          <div className='grid items-center gap-8 md:grid-cols-[1.1fr_0.9fr]'>
            <div>
              <p className='text-overline'>Operator console</p>
              <h2 className='mt-2 text-h1'>Run a city‑scale fleet from one cockpit.</h2>
              <p className='mt-4 max-w-xl text-[color:var(--text-soft)]'>
                Live route monitoring, alert triage, deployment planning and AI dispatch — all wired into a single executive surface that scales from a pilot to a national operator.
              </p>
              <div className='mt-6 flex flex-wrap gap-3'>
                <Link href='/admin'><Button>Open admin console</Button></Link>
                <Link href='/staff'><Button variant='outline'>Try operations panel</Button></Link>
              </div>
            </div>
            <div className='grid gap-3 sm:grid-cols-2'>
              {[
                ['Live routes', 'Real-time crowd & risk'],
                ['Smart dispatch', 'Suggested fleet actions'],
                ['Alerts triage', 'Severity-aware queue'],
                ['Site settings', 'Feature toggles & modes']
              ].map(([title, sub]) => (
                <div key={title} className='rounded-xl border border-[color:var(--border)] bg-[var(--surface)] p-4 hover:border-[#ccff00]/30 transition-all duration-300'>
                  <p className='text-sm font-semibold'>{title}</p>
                  <p className='mt-1 text-xs text-[color:var(--text-soft)]'>{sub}</p>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </section>

      <Footer />
    </div>
  );
}
