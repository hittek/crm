import Head from 'next/head'
import Link from 'next/link'
import { useState } from 'react'
import { FiCheck, FiArrowRight, FiUsers, FiBriefcase, FiCheckSquare, FiPieChart, FiZap, FiShield } from 'react-icons/fi'

const PLANS = [
  {
    id: 'trial',
    name: 'Prueba gratis',
    price: 'Gratis',
    period: '14 días',
    description: 'Para explorar la plataforma sin compromiso.',
    features: ['50 contactos', '50 negocios', '3 usuarios', 'Soporte por email'],
    cta: 'Empezar gratis',
    highlight: false,
  },
  {
    id: 'starter',
    name: 'Starter',
    price: '$499',
    period: '/mes MXN',
    description: 'Para equipos pequeños que quieren crecer.',
    features: ['500 contactos', '500 negocios', '5 usuarios', '1 chatbot IA', 'Soporte prioritario'],
    cta: 'Empezar con Starter',
    highlight: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$1,299',
    period: '/mes MXN',
    description: 'Para equipos que escalan y necesitan potencia.',
    features: ['5,000 contactos', '5,000 negocios', '20 usuarios', '3 chatbots IA', 'Soporte dedicado', 'White-label'],
    cta: 'Empezar con Pro',
    highlight: false,
  },
]

const FEATURES = [
  { icon: FiUsers, title: 'Gestión de contactos', desc: 'Centraliza clientes, prospectos y partners en un solo lugar.' },
  { icon: FiBriefcase, title: 'Pipeline visual', desc: 'Kanban de oportunidades con arrastrar y soltar.' },
  { icon: FiCheckSquare, title: 'Tareas y seguimiento', desc: 'Asigna actividades a tu equipo con fechas y prioridades.' },
  { icon: FiPieChart, title: 'Reportes en tiempo real', desc: 'KPIs de ventas, conversión y pipeline en un dashboard.' },
  { icon: FiZap, title: 'IA integrada', desc: 'Chatbots y asistente IA entrenados con tus datos (planes pagados).' },
  { icon: FiShield, title: 'Multi-tenancy seguro', desc: 'Cada organización completamente aislada. Tus datos, solo tuyos.' },
]

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <>
      <Head>
        <title>Hittek CRM — El CRM diseñado para México</title>
        <meta name="description" content="CRM con pipeline de ventas, gestión de contactos, tareas e IA. Diseñado para equipos mexicanos." />
      </Head>

      <div className="min-h-screen bg-white font-sans">

        {/* Nav */}
        <header className="border-b border-gray-100 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">H</div>
              <span className="font-bold text-gray-900">Hittek CRM</span>
            </Link>

            <nav className="hidden md:flex items-center gap-8 text-sm text-gray-600">
              <a href="#features" className="hover:text-gray-900 transition-colors">Características</a>
              <a href="#pricing" className="hover:text-gray-900 transition-colors">Precios</a>
              <Link href="/privacidad" className="hover:text-gray-900 transition-colors">Privacidad</Link>
            </nav>

            <div className="flex items-center gap-3">
              <Link href="/login" className="hidden sm:block text-sm text-gray-600 hover:text-gray-900 transition-colors px-3 py-1.5">
                Iniciar sesión
              </Link>
              <Link href="/signup" className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors font-medium">
                Registrarse gratis
              </Link>
            </div>
          </div>
        </header>

        {/* Hero */}
        <section className="max-w-6xl mx-auto px-6 pt-24 pb-20 text-center">
          <div className="inline-flex items-center gap-2 text-xs font-medium text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full mb-6">
            <FiZap className="w-3 h-3" />
            IA nativa en todos los planes pagados
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 leading-tight mb-6 tracking-tight">
            El CRM diseñado<br className="hidden md:block" />
            <span className="text-indigo-600"> para México</span>
          </h1>
          <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            Pipeline de ventas, contactos, tareas e inteligencia artificial. Todo en uno, sin complicaciones.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/signup" className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl hover:bg-indigo-700 transition-colors font-semibold text-base shadow-sm">
              Empieza gratis — 14 días
              <FiArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/login" className="text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium px-4 py-3">
              Ya tengo cuenta →
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 max-w-md mx-auto mt-16 pt-16 border-t border-gray-100">
            {[
              { value: '14 días', label: 'Prueba gratuita' },
              { value: '100%', label: 'Datos en México' },
              { value: 'LFPDPPP', label: 'Cumplimiento' },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-2xl font-bold text-gray-900">{s.value}</div>
                <div className="text-xs text-gray-400 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section id="features" className="bg-gray-50 py-24">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Todo lo que necesita tu equipo de ventas</h2>
              <p className="text-gray-500 max-w-xl mx-auto">Sin curva de aprendizaje. Sin módulos de más. Solo las herramientas que usas todos los días.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {FEATURES.map((f) => (
                <div key={f.title} className="bg-white rounded-2xl p-6 border border-gray-100 hover:border-indigo-100 hover:shadow-sm transition-all">
                  <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center mb-4">
                    <f.icon className="w-5 h-5 text-indigo-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="py-24">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Precios transparentes, en pesos</h2>
              <p className="text-gray-500">Sin sorpresas. Sin conversión de divisas. Cancela cuando quieras.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              {PLANS.map((plan) => (
                <div
                  key={plan.id}
                  className={`relative rounded-2xl border p-7 flex flex-col ${
                    plan.highlight
                      ? 'border-indigo-500 shadow-lg shadow-indigo-100 bg-white ring-1 ring-indigo-500'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  {plan.highlight && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-semibold text-white bg-indigo-600 px-3 py-1 rounded-full">
                      Más popular
                    </span>
                  )}
                  <div className="mb-6">
                    <p className="font-semibold text-gray-900 mb-1">{plan.name}</p>
                    <p className="text-xs text-gray-400 mb-4">{plan.description}</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-gray-900">{plan.price}</span>
                      <span className="text-sm text-gray-400">{plan.period}</span>
                    </div>
                  </div>
                  <ul className="space-y-2.5 mb-8 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                        <FiCheck className="w-4 h-4 text-indigo-500 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={`/signup?plan=${plan.id}`}
                    className={`block text-center py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                      plan.highlight
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                        : 'border border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50'
                    }`}
                  >
                    {plan.cta}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA footer */}
        <section className="bg-indigo-600 py-20">
          <div className="max-w-2xl mx-auto px-6 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">Listo para empezar</h2>
            <p className="text-indigo-200 mb-8">14 días gratis. Sin tarjeta de crédito. Cancela cuando quieras.</p>
            <Link href="/signup" className="inline-flex items-center gap-2 bg-white text-indigo-600 px-6 py-3 rounded-xl font-semibold hover:bg-indigo-50 transition-colors text-sm shadow-sm">
              Crear cuenta gratis
              <FiArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-gray-100 py-8">
          <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-400">
            <span>© {new Date().getFullYear()} Hittek. Todos los derechos reservados.</span>
            <div className="flex items-center gap-6">
              <Link href="/privacidad" className="hover:text-gray-600 transition-colors">Aviso de Privacidad</Link>
              <Link href="/login" className="hover:text-gray-600 transition-colors">Iniciar sesión</Link>
            </div>
          </div>
        </footer>
      </div>
    </>
  )
}

// No CRM layout — this is a public page
LandingPage.getLayout = (page) => page
