import { Router, Request, Response } from 'express';
import { FinancialModelService } from '../services/financial-model.service';
import { ProjectService } from '../services/project.service';
import { authenticateToken, AuthRequest, rateLimitByUser } from '../middleware/auth.middleware';
import { ModelAssumptions, ResultsCache } from '../types/models';

const router = Router();

// Apply authentication to all model routes
router.use(authenticateToken);
router.use(rateLimitByUser(100)); // 100 requests per minute for model operations

// GET /models - Get all user models
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { include_deleted, search, project_id } = req.query;
    const includeDeleted = include_deleted === 'true';
    
    let models;
    if (search && typeof search === 'string') {
      models = await FinancialModelService.searchModels(
        req.userId, 
        search, 
        project_id as string, 
        includeDeleted
      );
    } else if (project_id) {
      models = await FinancialModelService.getProjectModels(
        req.userId, 
        project_id as string, 
        includeDeleted
      );
    } else {
      models = await FinancialModelService.getUserModels(req.userId, includeDeleted);
    }
    
    const stats = await FinancialModelService.getModelStats(req.userId);
    
    res.json({
      models,
      stats,
      count: models.length,
      filters: {
        include_deleted: includeDeleted,
        search: search || null,
        project_id: project_id || null
      }
    });
    
  } catch (error) {
    console.error('Get models error:', error);
    res.status(500).json({
      error: 'Failed to fetch models',
      code: 'FETCH_ERROR'
    });
  }
});

// POST /models - Create new model
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { project_id, name, assumptions, results_cache, local_id } = req.body;
    
    if (!project_id) {
      res.status(400).json({
        error: 'Project ID is required',
        code: 'MISSING_PROJECT_ID'
      });
      return;
    }
    
    if (!name || name.trim().length === 0) {
      res.status(400).json({
        error: 'Model name is required',
        code: 'MISSING_NAME'
      });
      return;
    }
    
    const modelData = {
      project_id,
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
        error: 'Project not found or access denied',
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

// GET /models/:id - Get specific model
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { include_project } = req.query;
    
    const model = await FinancialModelService.getModelById(req.userId, id);
    
    if (!model) {
      res.status(404).json({
        error: 'Model not found',
        code: 'MODEL_NOT_FOUND'
      });
      return;
    }
    
    let project = null;
    if (include_project === 'true') {
      project = await ProjectService.getProjectById(req.userId, model.project_id);
    }
    
    res.json({
      model,
      project: include_project === 'true' ? project : undefined
    });
    
  } catch (error) {
    console.error('Get model error:', error);
    res.status(500).json({
      error: 'Failed to fetch model',
      code: 'FETCH_ERROR'
    });
  }
});

interface UpdateModelData {
  name?: string;
  assumptions?: ModelAssumptions;
  results_cache?: ResultsCache;
}

// PUT /models/:id - Update model
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, assumptions, results_cache } = req.body;
    
    const updateData: UpdateModelData = {};
    
    if (name !== undefined) {
      if (name.trim().length === 0) {
        res.status(400).json({
          error: 'Model name cannot be empty',
          code: 'INVALID_NAME'
        });
        return;
      }
      updateData.name = name.trim();
    }
    
    if (assumptions !== undefined) updateData.assumptions = assumptions;
    if (results_cache !== undefined) updateData.results_cache = results_cache;
    
    const model = await FinancialModelService.updateModel(req.userId, id, updateData);
    
    if (!model) {
      res.status(404).json({
        error: 'Model not found',
        code: 'MODEL_NOT_FOUND'
      });
      return;
    }
    
    res.json({
      model,
      message: 'Model updated successfully'
    });
    
  } catch (error) {
    console.error('Update model error:', error);
    res.status(500).json({
      error: 'Failed to update model',
      code: 'UPDATE_ERROR'
    });
  }
});

// PATCH /models/:id/assumptions - Update only assumptions
router.patch('/:id/assumptions', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { assumptions } = req.body;
    
    if (!assumptions || typeof assumptions !== 'object') {
      res.status(400).json({
        error: 'Valid assumptions object is required',
        code: 'INVALID_ASSUMPTIONS'
      });
      return;
    }
    
    const model = await FinancialModelService.updateModel(req.userId, id, { assumptions });
    
    if (!model) {
      res.status(404).json({
        error: 'Model not found',
        code: 'MODEL_NOT_FOUND'
      });
      return;
    }
    
    res.json({
      model,
      message: 'Model assumptions updated successfully'
    });
    
  } catch (error) {
    console.error('Update assumptions error:', error);
    res.status(500).json({
      error: 'Failed to update assumptions',
      code: 'UPDATE_ERROR'
    });
  }
});

// PATCH /models/:id/results - Update only results cache
router.patch('/:id/results', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { results_cache } = req.body;
    
    if (!results_cache || typeof results_cache !== 'object') {
      res.status(400).json({
        error: 'Valid results_cache object is required',
        code: 'INVALID_RESULTS'
      });
      return;
    }
    
    const model = await FinancialModelService.updateModel(req.userId, id, { results_cache });
    
    if (!model) {
      res.status(404).json({
        error: 'Model not found',
        code: 'MODEL_NOT_FOUND'
      });
      return;
    }
    
    res.json({
      model,
      message: 'Model results updated successfully'
    });
    
  } catch (error) {
    console.error('Update results error:', error);
    res.status(500).json({
      error: 'Failed to update results',
      code: 'UPDATE_ERROR'
    });
  }
});

// DELETE /models/:id - Delete model (soft delete)
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
      
      const deleted = await FinancialModelService.permanentDeleteModel(req.userId, id);
      if (!deleted) {
        res.status(404).json({
          error: 'Model not found',
          code: 'MODEL_NOT_FOUND'
        });
        return;
      }
      
      res.json({
        message: 'Model permanently deleted',
        warning: 'This action cannot be undone'
      });
    } else {
      // Soft delete
      const deleted = await FinancialModelService.deleteModel(req.userId, id);
      if (!deleted) {
        res.status(404).json({
          error: 'Model not found',
          code: 'MODEL_NOT_FOUND'
        });
        return;
      }
      
      res.json({
        message: 'Model deleted successfully',
        note: 'Model can be restored from deleted items'
      });
    }
    
  } catch (error) {
    console.error('Delete model error:', error);
    res.status(500).json({
      error: 'Failed to delete model',
      code: 'DELETE_ERROR'
    });
  }
});

// POST /models/:id/restore - Restore deleted model
router.post('/:id/restore', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    const model = await FinancialModelService.restoreModel(req.userId, id);
    
    if (!model) {
      res.status(404).json({
        error: 'Deleted model not found',
        code: 'MODEL_NOT_FOUND'
      });
      return;
    }
    
    res.json({
      model,
      message: 'Model restored successfully'
    });
    
  } catch (error) {
    console.error('Restore model error:', error);
    res.status(500).json({
      error: 'Failed to restore model',
      code: 'RESTORE_ERROR'
    });
  }
});

// POST /models/:id/duplicate - Duplicate model
router.post('/:id/duplicate', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, project_id } = req.body;
    
    // Get original model
    const originalModel = await FinancialModelService.getModelById(req.userId, id);
    if (!originalModel) {
      res.status(404).json({
        error: 'Model not found',
        code: 'MODEL_NOT_FOUND'
      });
      return;
    }
    
    // Create duplicate
    const duplicateData = {
      project_id: project_id || originalModel.project_id,
      name: name || `${originalModel.name} (Copy)`,
      assumptions: originalModel.assumptions,
      results_cache: originalModel.results_cache
    };
    
    const duplicateModel = await FinancialModelService.createModel(req.userId, duplicateData);
    
    res.status(201).json({
      model: duplicateModel,
      original_model: originalModel,
      message: 'Model duplicated successfully'
    });
    
  } catch (error) {
    console.error('Duplicate model error:', error);
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({
        error: 'Target project not found or access denied',
        code: 'PROJECT_NOT_FOUND'
      });
    } else {
      res.status(500).json({
        error: 'Failed to duplicate model',
        code: 'DUPLICATE_ERROR'
      });
    }
  }
});

// GET /models/stats/detailed - Get detailed model statistics
router.get('/stats/detailed', async (req: AuthRequest, res: Response) => {
  try {
    const stats = await FinancialModelService.getModelStats(req.userId);
    
    res.json({
      stats,
      summary: {
        total_models: stats.total,
        active_models: stats.active,
        deleted_models: stats.deleted,
        projects_with_models: Object.keys(stats.byProject).length,
        avg_models_per_project: Object.keys(stats.byProject).length > 0
          ? (stats.active / Object.keys(stats.byProject).length).toFixed(2)
          : 0
      }
    });
    
  } catch (error) {
    console.error('Get detailed model stats error:', error);
    res.status(500).json({
      error: 'Failed to fetch model statistics',
      code: 'STATS_ERROR'
    });
  }
});

// GET /models/local/:local_id - Get model by local ID (for sync)
router.get('/local/:local_id', async (req: AuthRequest, res: Response) => {
  try {
    const { local_id } = req.params;
    const localId = parseInt(local_id);
    
    if (isNaN(localId)) {
      res.status(400).json({
        error: 'Invalid local ID',
        code: 'INVALID_LOCAL_ID'
      });
      return;
    }
    
    const model = await FinancialModelService.getModelByLocalId(req.userId, localId);
    
    if (!model) {
      res.status(404).json({
        error: 'Model not found',
        code: 'MODEL_NOT_FOUND'
      });
      return;
    }
    
    res.json({
      model
    });
    
  } catch (error) {
    console.error('Get model by local ID error:', error);
    res.status(500).json({
      error: 'Failed to fetch model',
      code: 'FETCH_ERROR'
    });
  }
});

export default router;