// File: apps/pipeline/scripts/reset-admin-password.cjs

// THIS SCRIPT IS NOW DEPRECATED.
// The functionality has been fully integrated into `scripts/seed/seed-admin-user.js`.
// Using the seed script is now the correct and robust way to create or reset the admin user.

console.log('--------------------------------------------------------------------------')
console.log('DEPRECATION WARNING:')
console.log('This script (reset-admin-password.cjs) is deprecated.')
console.log('Please use the following command instead to create or reset the admin user:')
console.log('\n  pnpm --filter @headlines/pipeline db:seed:admin\n')
console.log(
  'This ensures password hashing is handled correctly by the data-access layer.'
)
console.log('--------------------------------------------------------------------------')
