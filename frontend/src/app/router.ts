import { createRouter, createWebHistory } from 'vue-router'
import { getToken } from '@/services/http'

const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/features/auth/LoginView.vue')
  },
  {
    path: '/',
    name: 'dashboard',
    component: () => import('@/features/dashboard/DashboardView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/scans/create',
    name: 'scan-create',
    component: () => import('@/features/scans/ScanCreateView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/scans/:scanId',
    name: 'scan-detail',
    component: () => import('@/features/scans/ScanDetailView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/findings',
    name: 'findings',
    component: () => import('@/features/findings/FindingsView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/findings/:findingId',
    name: 'finding-detail',
    component: () => import('@/features/findings/FindingDetailView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/rules',
    name: 'rules',
    component: () => import('@/features/rules/RulesView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('@/features/settings/SettingsView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/logs',
    name: 'logs',
    component: () => import('@/features/logs/LogsView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/features/not-found/NotFoundView.vue')
  }
]

export const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to) => {
  const hasToken = !!getToken()
  if (to.meta.requiresAuth && !hasToken) return '/login'
})
