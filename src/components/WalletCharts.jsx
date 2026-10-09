import { Activity, MapPin } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { classifyStatus } from '../lib/format'

const STATUS_COLORS = ['#4f7d42', '#b28b36']

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="wallet-chart-tooltip">
      {label ? <strong>{label}</strong> : null}
      {payload.map((item) => <span key={item.name}>{item.name}: {item.value}</span>)}
    </div>
  )
}

export function WalletCharts({ clients, statusByClient }) {
  const active = clients.filter((client) => classifyStatus(statusByClient[String(client.CODCLI)]?.status).key === 'ativo').length
  const statusData = [
    { name: 'Ativos', value: active },
    { name: 'Inativos', value: clients.length - active },
  ]

  const cityCounts = clients.reduce((counts, client) => {
    const city = String(client.MUNICENT || 'Não informada').trim()
    counts.set(city, (counts.get(city) ?? 0) + 1)
    return counts
  }, new Map())
  const cityData = [...cityCounts]
    .map(([cidade, clientes]) => ({ cidade, clientes }))
    .sort((a, b) => b.clientes - a.clientes || a.cidade.localeCompare(b.cidade, 'pt-BR'))
    .slice(0, 7)

  if (!clients.length) return null

  return (
    <section className="wallet-charts" aria-label="Gráficos da página atual">
      <article className="wallet-chart-card">
        <header><Activity size={17} aria-hidden="true" /><div><h2>Situação dos clientes</h2><p>Distribuição nesta página</p></div></header>
        <div className="wallet-chart-body" role="img" aria-label={`${active} clientes ativos e ${clients.length - active} inativos nesta página`}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={48} outerRadius={72} paddingAngle={3} stroke="none">
                {statusData.map((item, index) => <Cell key={item.name} fill={STATUS_COLORS[index]} />)}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="wallet-chart-center"><strong>{clients.length}</strong><span>clientes</span></div>
        </div>
        <div className="wallet-chart-legend">
          {statusData.map((item, index) => <span key={item.name}><i style={{ background: STATUS_COLORS[index] }} />{item.name} <strong>{item.value}</strong></span>)}
        </div>
      </article>

      <article className="wallet-chart-card wallet-city-chart">
        <header><MapPin size={17} aria-hidden="true" /><div><h2>Clientes por cidade</h2><p>As 7 cidades mais presentes nesta página</p></div></header>
        <div className="wallet-chart-body" role="img" aria-label="Gráfico de clientes por cidade na página atual">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={cityData} margin={{ top: 8, right: 8, bottom: 4, left: -18 }}>
              <CartesianGrid stroke="#e5dfc9" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="cidade" tick={{ fontSize: 10, fill: '#6d7468' }} tickLine={false} axisLine={false} interval={0} tickFormatter={(value) => value.length > 12 ? `${value.slice(0, 11)}…` : value} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#6d7468' }} tickLine={false} axisLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="clientes" name="Clientes" fill="#4f7d42" radius={[5, 5, 0, 0]} maxBarSize={38} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </article>
    </section>
  )
}
