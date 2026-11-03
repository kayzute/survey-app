const loopbackHosts = new Set(['localhost', '127.0.0.1', '::1'])

export function isDemoLoginAllowed(
  development: boolean,
  appHostname: string,
  supabaseUrl: string | undefined,
  enableDeployedDemoLogin = false,
): boolean {
  if (!supabaseUrl) return false
  try {
    new URL(supabaseUrl)
    if (development && loopbackHosts.has(appHostname)) return true
    return enableDeployedDemoLogin
  } catch {
    return false
  }
}
