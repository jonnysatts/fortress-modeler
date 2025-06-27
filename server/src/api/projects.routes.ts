import { Router, Request, Response } from 'express';
import { ProjectService } from '../services/project.service';
import { FinancialModelService } from '../services/financial-model.service';
import { authenticateToken, AuthRequest, rateLimitByUser } from '../middleware/auth.middleware';

const router = Router();

// Apply authentication to all project routes
router.use(authenticateToken);
router.use(rateLimitByUser(120)); // 120 requests per minute for authenticated users

// GET /projects - Get all user projects
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { include_deleted, search } = req.query;
    const includeDeleted = include_deleted === 'true';
    
    let projects;
    if (search && typeof search === 'string') {
      projects = await ProjectService.searchProjects(req.userId, search, includeDeleted);
    } else {
      projects = await ProjectService.getUserProjects(req.userId, includeDeleted);
    }
    
    const stats = await ProjectService.getProjectStats(req.userId);
    
    res.json({
      projects,
      stats,
      count: projects.length
    });
    
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({
      error: 'Failed to fetch projects',
      code: 'FETCH_ERROR'
    });
  }
});

// POST /projects - Create new project
// GET /projects/public - Get all public projects
router.get('/public', async (req: AuthRequest, res: Response) => {
  try {
    const projects = await ProjectService.getPublicProjects();
    res.json({ projects, count: projects.length });
  } catch (error) {
    console.error('Get public projects error:', error);
    res.status(500).json({
      error: 'Failed to fetch public projects',
      code: 'FETCH_ERROR'
    });
  }
});

// GET /projects/shared - Get projects shared with the user
router.get('/shared', async (req: AuthRequest, res: Response) => {
  try {
    const projects = await ProjectService.getSharedProjectsForUser(req.userId);
    res.json({ projects, count: projects.length });
  } catch (error) {
    console.error('Get shared projects error:', error);
    res.status(500).json({
      error: 'Failed to fetch shared projects',
      code: 'FETCH_ERROR'
    });
  }
});

// POST /projects - Create new project
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, product_type, target_audience, data, local_id } = req.body;
    
    if (!name || name.trim().length === 0) {
      res.status(400).json({
        error: 'Project name is required',
        code: 'MISSING_NAME'
      });
      return;
    }
    
    const projectData = {
      name: name.trim(),
      description: description?.trim(),
      product_type: product_type?.trim(),
      target_audience: target_audience?.trim(),
      data: data || {},
      local_id: local_id ? parseInt(local_id) : undefined
    };
    
    const project = await ProjectService.createProject(req.userId, projectData);
    
    res.status(201).json({
      project,
      message: 'Project created successfully'
    });
    
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({
      error: 'Failed to create project',
      code: 'CREATE_ERROR'
    });
  }
});

// GET /projects/:id - Get specific project
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { include_models } = req.query;
    
    const project = await ProjectService.getProjectById(req.userId, id);
    
    if (!project) {
      res.status(404).json({
        error: 'Project not found',
        code: 'PROJECT_NOT_FOUND'
      });
      return;
    }
    
    let models = [];
    if (include_models === 'true') {
      models = await FinancialModelService.getProjectModels(req.userId, id);
    }
    
    res.json({
      project,
      models: include_models === 'true' ? models : undefined,
      model_count: models.length
    });
    
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({
      error: 'Failed to fetch project',
      code: 'FETCH_ERROR'
    });
  }
});

// PUT /projects/:id - Update project
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, product_type, target_audience, data } = req.body;
    
    const updateData: any = {};
    
    if (name !== undefined) {
      if (name.trim().length === 0) {
        res.status(400).json({
          error: 'Project name cannot be empty',
          code: 'INVALID_NAME'
        });
        return;
      }
      updateData.name = name.trim();
    }
    
    if (description !== undefined) updateData.description = description?.trim();
    if (product_type !== undefined) updateData.product_type = product_type?.trim();
    if (target_audience !== undefined) updateData.target_audience = target_audience?.trim();
    if (data !== undefined) updateData.data = data;
    
    const project = await ProjectService.updateProject(req.userId, id, updateData);
    
    if (!project) {
      res.status(404).json({
        error: 'Project not found',
        code: 'PROJECT_NOT_FOUND'
      });
      return;
    }
    
    res.json({
      project,
      message: 'Project updated successfully'
    });
    
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({
      error: 'Failed to update project',
      code: 'UPDATE_ERROR'
    });
  }
});

// DELETE /projects/:id - Delete project (soft delete)
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { permanent } = req.query;
    
    if (permanent === 'true') {
      // Hard delete - requires confirmation
      const { confirm } = req.body;
      if (confirm !== 'DELETE_PERMANENTLY') {
        res.status(400).json({
          error: 'Permanent deletion requires confirmation',
          code: 'CONFIRMATION_REQUIRED',
          required: 'Send { "confirm": "DELETE_PERMANENTLY" } to confirm permanent deletion'
        });
        return;
      }
      
      const deleted = await ProjectService.permanentDeleteProject(req.userId, id);
      if (!deleted) {
        res.status(404).json({
          error: 'Project not found',
          code: 'PROJECT_NOT_FOUND'
        });
        return;
      }
      
      res.json({
        message: 'Project permanently deleted',
        warning: 'This action cannot be undone'
      });
    } else {
      // Soft delete
      const deleted = await ProjectService.deleteProject(req.userId, id);
      if (!deleted) {
        res.status(404).json({
          error: 'Project not found',
          code: 'PROJECT_NOT_FOUND'
        });
        return;
      }
      
      res.json({
        message: 'Project deleted successfully',
        note: 'Project can be restored from deleted items'
      });
    }
    
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({
      error: 'Failed to delete project',
      code: 'DELETE_ERROR'
    });
  }
});

// POST /projects/:id/restore - Restore deleted project
router.post('/:id/restore', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    const project = await ProjectService.restoreProject(req.userId, id);
    
    if (!project) {
      res.status(404).json({
        error: 'Deleted project not found',
        code: 'PROJECT_NOT_FOUND'
      });
      return;
    }
    
    res.json({
      project,
      message: 'Project restored successfully'
    });
    
  } catch (error) {
    console.error('Restore project error:', error);
    res.status(500).json({
      error: 'Failed to restore project',
      code: 'RESTORE_ERROR'
    });
  }
});

// GET /projects/:id/models - Get project models
router.get('/:id/models', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { include_deleted } = req.query;
    const includeDeleted = include_deleted === 'true';
    
    // Verify project exists and user has access
    const project = await ProjectService.getProjectById(req.userId, id);
    if (!project) {
      res.status(404).json({
        error: 'Project not found',
        code: 'PROJECT_NOT_FOUND'
      });
      return;
    }
    
    const models = await FinancialModelService.getProjectModels(req.userId, id, includeDeleted);
    
    res.json({
      models,
      project_id: id,
      count: models.length
    });
    
  } catch (error) {
    console.error('Get project models error:', error);
    res.status(500).json({
      error: 'Failed to fetch project models',
      code: 'FETCH_ERROR'
    });
  }
});

// POST /projects/:id/models - Create new model in project
router.post('/:id/models', async (req: AuthRequest, res: Response) => {
  try {
    const { id: projectId } = req.params;
    const { name, assumptions, results_cache, local_id } = req.body;
    
    if (!name || name.trim().length === 0) {
      res.status(400).json({
        error: 'Model name is required',
        code: 'MISSING_NAME'
      });
      return;
    }
    
    const modelData = {
      project_id: projectId,
      name: name.trim(),
      assumptions: assumptions || {},
      results_cache: results_cache || {},
      local_id: local_id ? parseInt(local_id) : undefined
    };
    
    const model = await FinancialModelService.createModel(req.userId, modelData);
    
    res.status(201).json({
      model,
      message: 'Financial model created successfully'
    });
    
  } catch (error) {
    console.error('Create model error:', error);
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({
        error: 'Project not found',
        code: 'PROJECT_NOT_FOUND'
      });
    } else {
      res.status(500).json({
        error: 'Failed to create model',
        code: 'CREATE_ERROR'
      });
    }
  }
});

// GET /projects/:id/actuals - Get project actuals data
router.get('/:id/actuals', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    // Verify project exists and user has access
    const project = await ProjectService.getProjectById(req.userId, id);
    if (!project) {
      res.status(404).json({
        error: 'Project not found',
        code: 'PROJECT_NOT_FOUND'
      });
      return;
    }
    
    // For now, return empty array as actuals functionality is not implemented
    // TODO: Implement actuals service when needed
    res.json([]);
    
  } catch (error) {
    console.error('Get project actuals error:', error);
    res.status(500).json({
      error: 'Failed to fetch project actuals',
      code: 'FETCH_ERROR'
    });
  }
});

// GET /projects/stats - Get detailed project statistics
router.get('/stats/detailed', async (req: AuthRequest, res: Response) => {
  try {
    const projectStats = await ProjectService.getProjectStats(req.userId);
    const modelStats = await FinancialModelService.getModelStats(req.userId);
    
    res.json({
      projects: projectStats,
      models: modelStats,
      summary: {
        total_projects: projectStats.total,
        active_projects: projectStats.active,
        total_models: modelStats.total,
        active_models: modelStats.active,
        avg_models_per_project: projectStats.active > 0 
          ? (modelStats.active / projectStats.active).toFixed(2)
          : 0
      }
    });
    
  } catch (error) {
    console.error('Get detailed stats error:', error);
    res.status(500).json({
      error: 'Failed to fetch statistics',
      code: 'STATS_ERROR'
    });
  }
});

export default router;