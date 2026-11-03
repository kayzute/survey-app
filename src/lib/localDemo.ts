const loopbackHosts = new Set(['localhost', '127.0.0.1', '::1'])

export function isDemoLoginAllowed(
  development: boolean,
  appHostname: string,
  supabaseUrl: string | undefined,
  enableDeployedDemoLogin = false,
): boolean {
  if (!supabaseUrl) return false
  try {
    const backendHostname = new URL(supabaseUrl).hostname
    if (development && loopbackHosts.has(appHostname) && loopbackHosts.has(backendHostname)) return true
    return enableDeployedDemoLogin
  } catch {
    return false
  }
}
