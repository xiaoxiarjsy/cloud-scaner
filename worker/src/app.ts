import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { AppVariables, Env } from './types/env'
import { handleError } from './middlewares/error.middleware'
import { requestIdMiddleware } from './middlewares/request-id.middleware'
import { requireAuth } from './middlewares/auth.middleware'
import { initRoutes } from './routes/init.routes'
import { authRoutes } from './routes/auth.routes'
import { scansRoutes } from './routes/scans.routes'
import { findingsRoutes } from './routes/findings.routes'
import { rulesRoutes } from './routes/rules.routes'
import { statsRoutes } from './routes/stats.routes'
import { settingsRoutes } from './routes/settings.routes'
import { logsRoutes } from './routes/logs.routes'
import { fail } from './utils/response'

const app = new Hono<{ Bindings: Env; Variables: AppVariables }>()

app.use('*', requestIdMiddleware)
app.use(
  '*',
  cors({
    origin: '*',
    allowHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    maxAge: 86400
  })
)

// Public routes
app.route('/api/init', initRoutes)
app.route('/', authRoutes)

// Protected routes (require auth)
app.use('/api/v1/scans', requireAuth)
app.use('/api/v1/scans/*', requireAuth)
app.use('/api/v1/findings', requireAuth)
app.use('/api/v1/findings/*', requireAuth)
app.use('/api/v1/rules', requireAuth)
app.use('/api/v1/stats', requireAuth)
app.use('/api/v1/settings', requireAuth)
app.use('/api/v1/settings/*', requireAuth)
app.use('/api/v1/logs', requireAuth)
app.use('/api/v1/logs/*', requireAuth)

app.route('/', statsRoutes)
app.route('/', scansRoutes)
app.route('/', findingsRoutes)
app.route('/', rulesRoutes)
app.route('/', settingsRoutes)
app.route('/', logsRoutes)

app.notFound((c) => fail(c, 404, 'NOT_FOUND', '接口不存在'))
app.onError(handleError)

export default app
