import Head from 'next/head'
import Dashboard from '../components/reports/Dashboard'

export default function ReportsPage() {
  return (
    <>
      <Head>
        <title>Reportes | CRM</title>
      </Head>

      <Dashboard />
    </>
  )
}
