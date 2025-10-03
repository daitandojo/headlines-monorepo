// apps/client/src/app/(public)/_components/SignUpFlow.jsx
'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Card,
  CardContent,
  Input,
  Label,
  Button,
  Checkbox,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/shared'
import { useAuth } from '@/lib/auth/client'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

// Dummy data for now
const allCountries = [
  'Denmark',
  'Sweden',
  'Norway',
  'Finland',
  'Germany',
  'United Kingdom',
  'United States',
  'France',
  'Italy',
  'Spain',
  'Switzerland',
  'Netherlands',
].sort()
const allSectors = [
  'Technology',
  'Healthcare',
  'Industrials',
  'Real Estate',
  'Consumer Goods',
  'Financial Services',
]

export function SignUpFlow() {
  const { signup } = useAuth()
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    countries: ['Denmark', 'Sweden', 'Norway'],
    sectors: ['Technology'],
    plan: 'trial',
  })

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value })
  }

  const handleCreateAccount = async (e) => {
    e.preventDefault()
    setIsLoading(true)

    const result = await signup({
      name: formData.name,
      email: formData.email,
      password: formData.password,
      countries: formData.countries,
      plan: formData.plan,
    })

    // On success, the AuthProvider will handle the redirect.
    // We only need to handle the loading state here.
    if (!result.success) {
      setIsLoading(false) // Stop loading on failure
    }
  }

  const countryCount = formData.countries.length
  const sectorCount = formData.sectors.length

  return (
    <section id="signup-flow" className="w-full py-24">
      <div className="text-center mb-12">
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tighter">
          Build Your Intelligence Engine in 60 Seconds
        </h2>
        <p className="mt-4 max-w-2xl mx-auto text-lg text-slate-400">
          Start your 30-day free trial. No credit card required. Cancel anytime.
        </p>
      </div>

      <Card className="max-w-4xl mx-auto bg-slate-900/50 border-slate-800">
        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Form Side */}
          <div className="p-8">
            <form onSubmit={handleCreateAccount} className="space-y-6">
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  required
                  onChange={handleChange}
                  value={formData.name}
                />
              </div>
              <div>
                <Label htmlFor="email">Work Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john.doe@wealth.com"
                  required
                  onChange={handleChange}
                  value={formData.email}
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={8}
                  onChange={handleChange}
                  value={formData.password}
                />
              </div>

              <div className="space-y-2">
                <Label>Focus Areas</Label>
                <Tabs defaultValue="countries">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="countries">
                      Countries ({countryCount})
                    </TabsTrigger>
                    <TabsTrigger value="sectors">Sectors ({sectorCount})</TabsTrigger>
                  </TabsList>
                  <TabsContent
                    value="countries"
                    className="h-40 overflow-y-auto custom-scrollbar p-2 border border-slate-700 rounded-md"
                  >
                    <div className="space-y-2">
                      {allCountries.map((country) => (
                        <div key={country} className="flex items-center gap-2">
                          <Checkbox
                            id={`country-${country}`}
                            checked={formData.countries.includes(country)}
                            onCheckedChange={(checked) => {
                              const newCountries = checked
                                ? [...formData.countries, country]
                                : formData.countries.filter((c) => c !== country)
                              setFormData({ ...formData, countries: newCountries.sort() })
                            }}
                          />
                          <Label htmlFor={`country-${country}`} className="font-normal">
                            {country}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                  <TabsContent
                    value="sectors"
                    className="h-40 overflow-y-auto custom-scrollbar p-2 border border-slate-700 rounded-md"
                  >
                    <div className="space-y-2">
                      {allSectors.map((sector) => (
                        <div key={sector} className="flex items-center gap-2">
                          <Checkbox
                            id={`sector-${sector}`}
                            checked={formData.sectors.includes(sector)}
                            onCheckedChange={(checked) => {
                              const newSectors = checked
                                ? [...formData.sectors, sector]
                                : formData.sectors.filter((s) => s !== sector)
                              setFormData({ ...formData, sectors: newSectors.sort() })
                            }}
                          />
                          <Label htmlFor={`sector-${sector}`} className="font-normal">
                            {sector}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

              <div>
                <Button
                  type="submit"
                  size="lg"
                  className="w-full text-lg h-12 bg-blue-600 hover:bg-blue-700"
                  disabled={isLoading}
                >
                  {isLoading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                  Create My Account
                </Button>
              </div>
            </form>
          </div>
          {/* Summary Side */}
          <div className="hidden md:block bg-slate-900 p-8 rounded-r-lg">
            <h3 className="text-xl font-bold text-slate-100">
              Your Personalized Briefing
            </h3>
            <p className="mt-2 text-slate-400">
              Your daily intelligence digest will be configured to monitor:
            </p>
            <div className="mt-6 space-y-4">
              <div>
                <h4 className="font-semibold text-slate-300">Geographic Focus</h4>
                <p className="text-blue-300">
                  {countryCount > 0 ? formData.countries.join(', ') : 'None selected'}
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-slate-300">Sector Focus</h4>
                <p className="text-purple-300">
                  {sectorCount > 0 ? formData.sectors.join(', ') : 'None selected'}
                </p>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-700">
              <h4 className="font-semibold text-slate-300">Plan: 30-Day Free Trial</h4>
              <ul className="mt-2 space-y-2 text-sm text-slate-400 list-disc list-inside">
                <li>Unlimited event access</li>
                <li>Daily email summaries</li>
                <li>Push notifications</li>
                <li>Full access to AI Chat</li>
              </ul>
            </div>
          </div>
        </div>
      </Card>
    </section>
  )
}
