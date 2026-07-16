import Head from 'next/head'
import Link from 'next/link'

export default function PrivacidadPage() {
  const updated = '30 de abril de 2026'

  return (
    <>
      <Head>
        <title>Aviso de Privacidad | Hittek CRM</title>
        <meta name="description" content="Aviso de privacidad de Hittek CRM conforme a la LFPDPPP." />
      </Head>

      <div className="min-h-screen bg-white font-sans">
        {/* Nav */}
        <header className="border-b border-gray-100 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">H</div>
              <span className="font-bold text-gray-900">Hittek CRM</span>
            </Link>
            <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
              Iniciar sesión
            </Link>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-6 py-16">
          <div className="mb-10">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Aviso de Privacidad</h1>
            <p className="text-sm text-gray-400">Última actualización: {updated}</p>
          </div>

          <div className="prose prose-gray max-w-none space-y-8 text-gray-700 leading-relaxed">

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Responsable del tratamiento</h2>
              <p>
                <strong>Hittek</strong> (en adelante "el Responsable") con domicilio en México, es responsable del tratamiento de sus datos personales conforme a lo establecido en la <em>Ley Federal de Protección de Datos Personales en Posesión de los Particulares</em> (LFPDPPP) y su Reglamento.
              </p>
              <p className="mt-2">
                Contacto de privacidad: <a href="mailto:privacidad@hittek.mx" className="text-indigo-600 hover:underline">privacidad@hittek.mx</a>
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Datos personales que recabamos</h2>
              <p>Al registrarse y utilizar Hittek CRM, recabamos los siguientes datos:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li><strong>Identificación y contacto:</strong> nombre completo, correo electrónico, número telefónico, nombre de la empresa.</li>
                <li><strong>Datos de la organización:</strong> nombre, logotipo, dominio personalizado, preferencias de configuración.</li>
                <li><strong>Datos financieros:</strong> para suscripciones se usa Stripe como procesador de pagos; Hittek no almacena datos de tarjetas bancarias.</li>
                <li><strong>Datos de uso:</strong> actividad dentro de la plataforma, registros de acceso (IP, timestamp), preferencias de idioma y zona horaria.</li>
                <li><strong>Datos de clientes finales:</strong> la información que usted ingrese sobre sus propios contactos, tratos y actividades comerciales.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Finalidades del tratamiento</h2>
              <p><strong>Finalidades primarias (necesarias para la prestación del servicio):</strong></p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Crear y administrar su cuenta de usuario y organización.</li>
                <li>Proveer las funcionalidades de CRM contratadas.</li>
                <li>Procesar pagos y gestionar su suscripción.</li>
                <li>Enviar notificaciones relacionadas con el servicio (alertas, facturas, cambios de plan).</li>
                <li>Brindar soporte técnico y atención al cliente.</li>
                <li>Dar cumplimiento a obligaciones legales.</li>
              </ul>
              <p className="mt-4"><strong>Finalidades secundarias (puede oponerse):</strong></p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Envío de comunicaciones comerciales sobre nuevas funcionalidades o planes.</li>
                <li>Análisis estadísticos agregados y anónimos de uso de la plataforma.</li>
              </ul>
              <p className="mt-2 text-sm text-gray-500">
                Para oponerse a las finalidades secundarias envíe un correo a <a href="mailto:privacidad@hittek.mx" className="text-indigo-600 hover:underline">privacidad@hittek.mx</a>.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Transferencia de datos</h2>
              <p>Sus datos podrán ser transferidos a los siguientes terceros:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li><strong>Stripe Inc.</strong> — procesamiento de pagos (EUA; cuenta con Cláusulas Contractuales Estándar).</li>
                <li><strong>Vercel Inc.</strong> — infraestructura de hosting en la nube (EUA; Privacy Shield / DPA vigente).</li>
                <li><strong>Neon / PostgreSQL</strong> — base de datos (datos almacenados en región de su elección).</li>
                <li><strong>Autoridades competentes</strong> — cuando sea requerido por ley o mandato judicial.</li>
              </ul>
              <p className="mt-2 text-sm text-gray-500">
                No vendemos ni cedemos sus datos personales a terceros con fines de marketing sin su consentimiento expreso.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Derechos ARCO</h2>
              <p>
                Usted tiene derecho a <strong>Acceder, Rectificar, Cancelar u Oponerse</strong> al tratamiento de sus datos personales (derechos ARCO), así como a revocar su consentimiento y a la portabilidad de sus datos, en los términos de la LFPDPPP.
              </p>
              <p className="mt-2">Para ejercer sus derechos envíe una solicitud a:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Correo: <a href="mailto:privacidad@hittek.mx" className="text-indigo-600 hover:underline">privacidad@hittek.mx</a></li>
                <li>Asunto: "Solicitud ARCO"</li>
                <li>Incluya: nombre completo, correo de la cuenta, tipo de solicitud y descripción.</li>
              </ul>
              <p className="mt-2 text-sm text-gray-500">
                Responderemos en un plazo máximo de 20 días hábiles conforme a la LFPDPPP.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Uso de cookies y tecnologías de seguimiento</h2>
              <p>
                Hittek CRM utiliza cookies de sesión estrictamente necesarias para mantener su autenticación. No usamos cookies de rastreo publicitario de terceros. Puede desactivar las cookies en su navegador, aunque esto impedirá el funcionamiento de la plataforma.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Seguridad de los datos</h2>
              <p>
                Implementamos medidas técnicas y organizativas para proteger sus datos: cifrado en tránsito (TLS 1.2+), cifrado de contraseñas con bcrypt, aislamiento de datos por organización (multi-tenancy), acceso basado en roles, y registros de auditoría.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Retención de datos</h2>
              <p>
                Conservamos sus datos mientras su cuenta esté activa. Al cancelar su suscripción, sus datos se conservan por un período de 30 días para facilitar recuperación accidental, tras lo cual son eliminados de manera definitiva, salvo obligación legal de conservación.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Cambios a este aviso</h2>
              <p>
                Podemos actualizar este aviso de privacidad. Le notificaremos los cambios materiales mediante correo electrónico o aviso dentro de la plataforma. El uso continuado del servicio tras la notificación constituye su aceptación.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">10. INAI</h2>
              <p>
                Si considera que sus derechos no han sido atendidos correctamente, puede acudir al Instituto Nacional de Transparencia, Acceso a la Información y Protección de Datos Personales (INAI): <a href="https://www.inai.org.mx" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">www.inai.org.mx</a>.
              </p>
            </section>

          </div>
        </main>

        <footer className="border-t border-gray-100 py-8 mt-8">
          <div className="max-w-4xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-400">
            <span>© {new Date().getFullYear()} Hittek. Todos los derechos reservados.</span>
            <Link href="/" className="hover:text-gray-600 transition-colors">Ir al inicio</Link>
          </div>
        </footer>
      </div>
    </>
  )
}

PrivacidadPage.getLayout = (page) => page
