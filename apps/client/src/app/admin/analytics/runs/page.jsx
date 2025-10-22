// apps/client/src/app/admin/analytics/runs/page.jsx
'use client'

import { useQuery } from '@tanstack/react-query'
import { PageHeader, Skeleton, Card, CardHeader, CardTitle, CardContent } from '@/components/shared'
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Pie, PieChart, Cell } from 'recharts'
import { useMemo } from 'react'
import { format } from 'date-fns'

const QUERY_KEY = 'run-analytics'
const API_ENDPOINT = '/api-admin/analytics/runs'
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

async function fetchRunAnalytics() {
  const res = await fetch(API_ENDPOINT)
  if (!res.ok) {
    const errorData = await res.json()
    throw new Error(errorData.error || 'Failed to fetch run analytics')
  }
  return res.json()
}

// Helper to format currency
const formatCurrency = (value) => `$${value.toFixed(4)}`;

// Custom Tooltip for charts
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="p-2 bg-slate-800 border border-slate-700 rounded-md text-sm">
        <p className="label">{`Run: ${label}`}</p>
        {payload.map((p, i) => (
            <p key={i} style={{ color: p.color }}>{`${p.name}: ${p.name === 'Total Cost' ? formatCurrency(p.value) : p.value}`}</p>
        ))}
      </div>
    );
  }
  return null;
};


export default function CostAnalyticsPage() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: [QUERY_KEY],
    queryFn: fetchRunAnalytics,
  })

  const processedData = useMemo(() => {
    if (!data?.data) return null;

    const chartData = data.data.map(run => ({
      name: format(new Date(run.createdAt), 'MM/dd HH:mm'),
      'Total Cost': run.cost_summary?.totalCost || 0,
      'Events Created': run.runStats?.eventsSynthesized || 0,
      'Cost per Event': (run.runStats?.eventsSynthesized > 0)
        ? (run.cost_summary?.totalCost || 0) / run.runStats.eventsSynthesized
        : 0,
    })).reverse(); // Reverse to show chronological order

    const modelUsage = data.data.reduce((acc, run) => {
        const tokens = run.cost_summary?.tokens || {};
        for(const model in tokens) {
            if (!acc[model]) acc[model] = { name: model, value: 0 };
            acc[model].value += tokens[model].cost;
        }
        return acc;
    }, {});

    const apiUsage = data.data.reduce((acc, run) => {
        const apis = run.cost_summary?.apis || {};
        for(const api in apis) {
            if (!acc[api]) acc[api] = { name: api, value: 0 };
            acc[api].value += apis[api].cost;
        }
        return acc;
    }, {});

    return {
        chartData,
        modelUsage: Object.values(modelUsage),
        apiUsage: Object.values(apiUsage),
    }

  }, [data])

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Cost & Usage Dashboard" description="Analyzing historical run data..." />
        <div className="mt-8 grid gap-4 md:grid-cols-2">
            <Skeleton className="h-80 w-full" />
            <Skeleton className="h-80 w-full" />
            <Skeleton className="h-80 w-full" />
            <Skeleton className="h-80 w-full" />
        </div>
      </div>
    )
  }

  if (isError) {
    return <div className="text-red-500 bg-red-500/10 p-4 rounded-md">Error loading data: {error.message}</div>
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Cost & Usage Dashboard"
        description="Visualize operational costs and AI model usage over time."
      />
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Total Run Cost Over Time</CardTitle></CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={processedData.chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                <XAxis dataKey="name" stroke="#888" fontSize={12} />
                <YAxis stroke="#888" fontSize={12} tickFormatter={formatCurrency} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line type="monotone" dataKey="Total Cost" stroke="#8884d8" activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Cost Per Synthesized Event</CardTitle></CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={processedData.chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                <XAxis dataKey="name" stroke="#888" fontSize={12} />
                <YAxis stroke="#888" fontSize={12} tickFormatter={formatCurrency}/>
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="Cost per Event" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Total Cost by AI Model</CardTitle></CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie data={processedData.modelUsage} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} fill="#8884d8" label={(entry) => `${entry.name}: ${formatCurrency(entry.value)}`}>
                        {processedData.modelUsage.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                    </Pie>
                    <Tooltip formatter={formatCurrency} />
                </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Total Cost by 3rd Party API</CardTitle></CardHeader>
          <CardContent className="h-80">
             <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie data={processedData.apiUsage} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} fill="#82ca9d" label={(entry) => `${entry.name}: ${formatCurrency(entry.value)}`}>
                        {processedData.apiUsage.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                    </Pie>
                    <Tooltip formatter={formatCurrency} />
                </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}