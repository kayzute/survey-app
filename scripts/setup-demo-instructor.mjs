import { readFile } from 'node:fs/promises'
import { createClient } from '@supabase/supabase-js'

const demoEmail = 'instructor@uconn.edu'
const demoPassword = '123456'

function parseEnv(text) {
  return Object.fromEntries(text.split(/\r?\n/).flatMap((line) => {
    const value = line.trim()
    if (!value || value.startsWith('#')) return []
    const separator = value.indexOf('=')
    if (separator < 1) return []
    return [[value.slice(0, separator).trim(), value.slice(separator + 1).trim().replace(/^['"]|['"]$/g, '')]]
  }))
}

let config
try {
  config = parseEnv(await readFile('.env.demo.local', 'utf8'))
} catch {
  throw new Error('Create an ignored .env.demo.local with SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and CONFIRM_DISPOSABLE_DEMO_PROJECT.')
}

const supabaseUrl = config.SUPABASE_URL
const serviceRoleKey = config.SUPABASE_SERVICE_ROLE_KEY
if (!supabaseUrl || !serviceRoleKey) throw new Error('The demo setup file must include SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.')

const parsedUrl = new URL(supabaseUrl)
const projectRef = parsedUrl.hostname.endsWith('.supabase.co') ? parsedUrl.hostname.split('.')[0] : ''
if (parsedUrl.protocol !== 'https:' || !projectRef) {
  throw new Error('Refusing setup: the demo project URL must be an HTTPS Supabase cloud URL.')
}
if (config.CONFIRM_DISPOSABLE_DEMO_PROJECT !== projectRef) {
  throw new Error(`Refusing setup: set CONFIRM_DISPOSABLE_DEMO_PROJECT to this disposable project's ref (${projectRef}) after verifying it contains no private data.`)
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const { data: { users }, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
if (listError) throw new Error('Unable to list demo project users; check the URL and service-role key.')

const existing = users.find((user) => user.email?.toLowerCase() === demoEmail)
const result = existing
  ? await admin.auth.admin.updateUserById(existing.id, { password: demoPassword, email_confirm: true })
  : await admin.auth.admin.createUser({ email: demoEmail, password: demoPassword, email_confirm: true })
if (result.error) throw new Error('Unable to provision the demo instructor in the selected Supabase project.')

console.log(`Demo instructor is ready in Supabase project ${projectRef}: ${demoEmail}`)
