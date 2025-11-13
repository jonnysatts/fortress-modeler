import { http, HttpResponse } from 'msw'
import { projectFixtures } from '../fixtures/projects'
import { modelFixtures } from '../fixtures/models'

export const handlers = [
  // Auth endpoints
  http.get('/api/auth/profile', () => {
    return HttpResponse.json({
      id: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User',
      avatar: null,
      preferences: {}
    })
  }),

  // Projects endpoints
  http.get('/api/projects', () => {
    return HttpResponse.json(projectFixtures)
  }),

  http.get('/api/projects/:id', ({ params }) => {
    const project = projectFixtures.find(p => p.id === params.id)
    if (!project) {
      return new HttpResponse(null, { status: 404 })
    }
    return HttpResponse.json(project)
  }),

  http.post('/api/projects', async ({ request }) => {
    const newProject = await request.json() as any
    const project = {
      id: `test-project-${Date.now()}`,
      ...newProject,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    return HttpResponse.json(project, { status: 201 })
  }),

  http.put('/api/projects/:id', async ({ params, request }) => {
    const updates = await request.json() as any
    const existingProject = projectFixtures.find(p => p.id === params.id)
    if (!existingProject) {
      return new HttpResponse(null, { status: 404 })
    }
    const updatedProject = {
      ...existingProject,
      ...updates,
      updatedAt: new Date().toISOString(),
    }
    return HttpResponse.json(updatedProject)
  }),

  http.delete('/api/projects/:id', ({ params }) => {
    const project = projectFixtures.find(p => p.id === params.id)
    if (!project) {
      return new HttpResponse(null, { status: 404 })
    }
    return new HttpResponse(null, { status: 204 })
  }),

  // Financial Models endpoints
  http.get('/api/projects/:projectId/models', ({ params }) => {
    const projectModels = modelFixtures.filter(m => m.projectId === params.projectId)
    return HttpResponse.json(projectModels)
  }),

  http.get('/api/models/:id', ({ params }) => {
    const model = modelFixtures.find(m => m.id === params.id)
    if (!model) {
      return new HttpResponse(null, { status: 404 })
    }
    return HttpResponse.json(model)
  }),

  http.post('/api/projects/:projectId/models', async ({ params, request }) => {
    const newModel = await request.json() as any
    const model = {
      id: `test-model-${Date.now()}`,
      projectId: params.projectId,
      ...newModel,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    return HttpResponse.json(model, { status: 201 })
  }),

  http.put('/api/models/:id', async ({ params, request }) => {
    const updates = await request.json() as any
    const existingModel = modelFixtures.find(m => m.id === params.id)
    if (!existingModel) {
      return new HttpResponse(null, { status: 404 })
    }
    const updatedModel = {
      ...existingModel,
      ...updates,
      updatedAt: new Date().toISOString(),
    }
    return HttpResponse.json(updatedModel)
  }),

  http.delete('/api/models/:id', ({ params }) => {
    const model = modelFixtures.find(m => m.id === params.id)
    if (!model) {
      return new HttpResponse(null, { status: 404 })
    }
    return new HttpResponse(null, { status: 204 })
  }),

  // Actuals endpoints
  http.get('/api/projects/:projectId/actuals', () => {
    return HttpResponse.json([])
  }),

  http.post('/api/actuals', async ({ request }) => {
    const newActual = await request.json() as any
    const actual = {
      id: `test-actual-${Date.now()}`,
      ...newActual,
    }
    return HttpResponse.json(actual, { status: 201 })
  }),

  // Sync endpoints
  http.post('/api/sync/upload', () => {
    return HttpResponse.json({ message: 'Sync completed successfully' })
  }),

  http.post('/api/sync/download', () => {
    return HttpResponse.json({ 
      projects: projectFixtures,
      models: modelFixtures,
      actuals: []
    })
  }),
]