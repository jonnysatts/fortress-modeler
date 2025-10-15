import { Router, Response } from 'express';
import { SyncService } from '../services/sync.service';
import { authenticateToken, AuthRequest, rateLimitByUser } from '../auth/auth.middleware';

const router = Router();

// Apply authentication to all sync routes
router.use(authenticateToken);
router.use(rateLimitByUser(30)); // Lower rate limit for sync operations

// POST /sync - Main sync endpoint
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { last_sync, changes } = req.body;
    
    // Validate sync request
    if (!Array.isArray(changes)) {
      res.status(400).json({
        error: 'Changes must be an array',
        code: 'INVALID_CHANGES_FORMAT'
      });
      return;
    }
    
    // Validate each change
    for (const change of changes) {
      if (!change.type || !['project', 'model'].includes(change.type)) {
        res.status(400).json({
          error: 'Invalid change type. Must be "project" or "model"',
          code: 'INVALID_CHANGE_TYPE'
        });
        return;
      }
      
      if (!change.action || !['create', 'update', 'delete'].includes(change.action)) {
        res.status(400).json({
          error: 'Invalid action. Must be "create", "update", or "delete"',
          code: 'INVALID_ACTION'
        });
        return;
      }
      
      if (!change.timestamp) {
        res.status(400).json({
          error: 'Change timestamp is required',
          code: 'MISSING_TIMESTAMP'
        });
        return;
      }
      
      // Validate timestamp format
      try {
        new Date(change.timestamp);
      } catch {
        res.status(400).json({
          error: 'Invalid timestamp format',
          code: 'INVALID_TIMESTAMP'
        });
        return;
      }
      
      if (change.action !== 'delete' && !change.data) {
        res.status(400).json({
          error: 'Data is required for create and update actions',
          code: 'MISSING_DATA'
        });
        return;
      }
    }
    
    // Process sync
    const syncRequest = {
      last_sync,
      changes
    };
    
    const syncResponse = await SyncService.processSync(req.userId, syncRequest);
    
    res.json(syncResponse);
    
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({
      success: false,
      sync_token: '',
      last_sync: new Date().toISOString(),
      server_changes: [],
      conflicts: [],
      error: 'Sync operation failed',
      code: 'SYNC_ERROR'
    });
  }
});

// GET /sync/status - Get sync status
router.get('/status', async (req: AuthRequest, res: Response) => {
  try {
    const syncStatus = await SyncService.getSyncStatus(req.userId);
    
    if (!syncStatus) {
      // Initialize sync status if it doesn't exist
      await SyncService.initializeSyncStatus(req.userId);
      const newStatus = await SyncService.getSyncStatus(req.userId);
      
      res.json({
        status: newStatus,
        message: 'Sync status initialized'
      });
      return;
    }
    
    res.json({
      status: syncStatus
    });
    
  } catch (error) {
    console.error('Get sync status error:', error);
    res.status(500).json({
      error: 'Failed to get sync status',
      code: 'STATUS_ERROR'
    });
  }
});

// POST /sync/full - Force full sync (download all data)
router.post('/full', async (req: AuthRequest, res: Response) => {
  try {
    const fullSyncData = await SyncService.getFullSyncData(req.userId);
    
    res.json({
      success: true,
      data: fullSyncData,
      message: 'Full sync data retrieved'
    });
    
  } catch (error) {
    console.error('Full sync error:', error);
    res.status(500).json({
      error: 'Failed to perform full sync',
      code: 'FULL_SYNC_ERROR'
    });
  }
});

// GET /sync/events - Get sync events (for debugging)
router.get('/events', async (req: AuthRequest, res: Response) => {
  try {
    const { limit, entity_type, entity_id } = req.query;
    
    const eventLimit = limit ? parseInt(limit as string) : 50;
    const entityType = entity_type as 'project' | 'model' | undefined;
    const entityId = entity_id as string | undefined;
    
    if (eventLimit > 200) {
      res.status(400).json({
        error: 'Limit cannot exceed 200',
        code: 'LIMIT_TOO_HIGH'
      });
      return;
    }
    
    if (entityType && !['project', 'model'].includes(entityType)) {
      res.status(400).json({
        error: 'Invalid entity_type. Must be "project" or "model"',
        code: 'INVALID_ENTITY_TYPE'
      });
      return;
    }
    
    const events = await SyncService.getSyncEvents(
      req.userId,
      eventLimit,
      entityType,
      entityId
    );
    
    res.json({
      events,
      count: events.length,
      limit: eventLimit
    });
    
  } catch (error) {
    console.error('Get sync events error:', error);
    res.status(500).json({
      error: 'Failed to get sync events',
      code: 'EVENTS_ERROR'
    });
  }
});

// POST /sync/resolve-conflict - Resolve sync conflict
router.post('/resolve-conflict', async (req: AuthRequest, res: Response) => {
  try {
    const { conflict_id, resolution, resolved_data } = req.body;
    
    if (!conflict_id) {
      res.status(400).json({
        error: 'Conflict ID is required',
        code: 'MISSING_CONFLICT_ID'
      });
      return;
    }
    
    if (!resolution || !['use_server', 'use_client', 'merge'].includes(resolution)) {
      res.status(400).json({
        error: 'Invalid resolution. Must be "use_server", "use_client", or "merge"',
        code: 'INVALID_RESOLUTION'
      });
      return;
    }
    
    if (resolution === 'merge' && !resolved_data) {
      res.status(400).json({
        error: 'Resolved data is required for merge resolution',
        code: 'MISSING_RESOLVED_DATA'
      });
      return;
    }
    
    const resolved = await SyncService.resolveConflict(
      req.userId,
      conflict_id,
      resolution as 'use_server' | 'use_client' | 'merge',
      resolved_data
    );

    if (!resolved) {
      res.status(404).json({
        error: 'Conflict not found or already resolved',
        code: 'CONFLICT_NOT_FOUND'
      });
      return;
    }

    res.json({
      message: 'Conflict resolved',
      conflict: resolved
    });
    
  } catch (error) {
    console.error('Resolve conflict error:', error);
    res.status(500).json({
      error: 'Failed to resolve conflict',
      code: 'RESOLUTION_ERROR'
    });
  }
});

// DELETE /sync/events - Clear old sync events
router.delete('/events', async (req: AuthRequest, res: Response) => {
  try {
    const { older_than_days } = req.query;
    
    const days = older_than_days ? parseInt(older_than_days as string) : 30;
    
    if (days < 1 || days > 365) {
      res.status(400).json({
        error: 'older_than_days must be between 1 and 365',
        code: 'INVALID_DAYS_RANGE'
      });
      return;
    }
    
    const deletedCount = await SyncService.clearSyncHistory(req.userId, days);
    
    res.json({
      message: 'Sync history cleared',
      deleted_events: deletedCount,
      older_than_days: days
    });
    
  } catch (error) {
    console.error('Clear sync events error:', error);
    res.status(500).json({
      error: 'Failed to clear sync events',
      code: 'CLEAR_ERROR'
    });
  }
});

// POST /sync/reset - Reset sync status (force next sync to be full)
router.post('/reset', async (req: AuthRequest, res: Response) => {
  try {
    const { confirm } = req.body;
    
    if (confirm !== 'RESET_SYNC_STATUS') {
      res.status(400).json({
        error: 'Sync reset requires confirmation',
        code: 'CONFIRMATION_REQUIRED',
        required: 'Send { "confirm": "RESET_SYNC_STATUS" } to confirm reset'
      });
      return;
    }
    
    const updatedStatus = await SyncService.updateSyncStatus(req.userId, {
      last_sync: null,
      sync_token: null,
      pending_changes: [],
      sync_in_progress: false,
      last_error: null
    });
    
    res.json({
      message: 'Sync status reset successfully',
      status: updatedStatus,
      warning: 'Next sync will download all data from server'
    });
    
  } catch (error) {
    console.error('Reset sync error:', error);
    res.status(500).json({
      error: 'Failed to reset sync status',
      code: 'RESET_ERROR'
    });
  }
});

// GET /sync/health - Check sync system health
router.get('/health', async (req: AuthRequest, res: Response) => {
  try {
    const syncStatus = await SyncService.getSyncStatus(req.userId);
    const recentEvents = await SyncService.getSyncEvents(req.userId, 10);
    
    const health = {
      sync_initialized: !!syncStatus,
      last_sync: syncStatus?.last_sync,
      sync_in_progress: syncStatus?.sync_in_progress || false,
      last_error: syncStatus?.last_error,
      recent_events_count: recentEvents.length,
      status: 'healthy'
    };
    
    if (syncStatus?.last_error) {
      health.status = 'error';
    } else if (syncStatus?.sync_in_progress) {
      health.status = 'syncing';
    } else if (!syncStatus?.last_sync) {
      health.status = 'never_synced';
    }
    
    res.json({
      health,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Sync health check error:', error);
    res.status(500).json({
      error: 'Failed to check sync health',
      code: 'HEALTH_CHECK_ERROR'
    });
  }
});

export default router;