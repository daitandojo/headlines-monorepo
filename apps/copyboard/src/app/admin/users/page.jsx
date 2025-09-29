'use server'

import { PageHeader } from '@/components/shared'
import { getAllSubscribers, getAllCountries } from '@headlines/data-access'
import UsersClientPage from './UsersClientPage'
import dbConnect from '@headlines/data-access/dbConnect.js'

export default async function UsersPage() {
  // Establish the database connection ONCE at the start of the page render.
  await dbConnect()

  const [usersResult, countriesResult] = await Promise.all([
    getAllSubscribers({}),
    getAllCountries(),
  ])

  if (!usersResult.success || !countriesResult.success) {
    return (
      <div>
        <h1>Error loading data</h1>
        <p>{usersResult.error || countriesResult.error}</p>
      </div>
    )
  }

  const users = usersResult.data
  const totalUsers = usersResult.total
  const allCountries = countriesResult.data
    .filter((c) => c.status === 'active')
    .map((c) => c.name)

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="User Management"
        description={`Manage all ${totalUsers.toLocaleString()} system users.`}
      />
      <UsersClientPage
        initialUsers={JSON.parse(JSON.stringify(users))}
        initialTotal={totalUsers}
        allCountries={allCountries}
      />
    </div>
  )
}
