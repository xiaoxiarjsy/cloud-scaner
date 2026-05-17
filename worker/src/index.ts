import app from './app'
import type { Env } from './types/env'

export default {
  async fetch(request, env, executionContext) {
    const url = new URL(request.url)

    if (url.pathname === '/api' || url.pathname.startsWith('/api/')) {
      return app.fetch(request, env, executionContext)
    }

    return env.ASSETS.fetch(request)
  }
} satisfies ExportedHandler<Env>
