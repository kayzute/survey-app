import { execSync } from 'node:child_process'
import { writeFile } from 'node:fs/promises'
import { createClient } from '@supabase/supabase-js'

const demoEmail = 'instructor@uconn.edu'
const demoPassword = '123456'
const loopbackHosts = new Set(['localhost', '127.0.0.1', '::1'])

function readStatusValue(status, name) {
  const line = status.split(/\r?\n/).find((item) => item.startsWith(`${name}=`))
  if (!line) throw new Error(`Supabase status did not include ${name}.`)
  const value = line.slice(name.length + 1).trim()
  return value.startsWith('"') ? JSON.parse(value) : value
}

const status = execSync('npx supabase status -o env', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] })
const supabaseUrl = readStatusValue(status, 'API_URL')
const anonKey = readStatusValue(status, 'ANON_KEY')
const serviceRoleKey = readStatusValue(status, 'SERVICE_ROLE_KEY')

if (!loopbackHosts.has(new URL(supabaseUrl).hostname)) {
  throw new Error('Refusing to configure a non-local Supabase URL for the demo account.')
}

await writeFile('.env.local', `VITE_SUPABASE_URL=${supabaseUrl}\nVITE_SUPABASE_ANON_KEY=${anonKey}\n`, 'utf8')

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const { data: { users }, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
if (listError) throw listError

const existing = users.find((user) => user.email?.toLowerCase() === demoEmail)
const result = existing
  ? await admin.auth.admin.updateUserById(existing.id, { password: demoPassword, email_confirm: true })
  : await admin.auth.admin.createUser({ email: demoEmail, password: demoPassword, email_confirm: true })
if (result.error) throw result.error

console.log(`Local Supabase configured in .env.local. Demo instructor is ready: ${demoEmail}`)
