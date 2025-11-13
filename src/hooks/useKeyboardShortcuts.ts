import { useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';

interface KeyboardShortcutOptions {
  projectId?: string;
  modelId?: string;
  onNewProject?: () => void;
  onNewModel?: () => void;
  onSearch?: () => void;
}

export const useKeyboardShortcuts = (options: KeyboardShortcutOptions = {}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { projectId, modelId, onNewProject, onNewModel, onSearch } = options;

  const navigateToTab = useCallback((tab: string) => {
    const currentPath = location.pathname;
    
    if (currentPath.includes('/models/') && !currentPath.includes('/edit')) {
      // On model detail page - these shortcuts don't apply to model tabs
      return;
    }
    
    if (currentPath.includes('/projects/') && !currentPath.includes('/models/')) {
      // On project detail page
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tab);
      window.history.pushState({}, '', url.toString());
      
      // Manually trigger tab change if using controlled tabs
      const tabTrigger = document.querySelector(`[data-value="${tab}"]`) as HTMLButtonElement;
      if (tabTrigger) {
        tabTrigger.click();
        toast.success(`Switched to ${tab} tab`);
      }
    }
  }, [location.pathname]);

  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    // Don't trigger shortcuts when typing in inputs
    if (
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement ||
      event.target instanceof HTMLSelectElement ||
      (event.target as HTMLElement)?.contentEditable === 'true'
    ) {
      return;
    }

    const { key, ctrlKey, metaKey, shiftKey } = event;
    const isModKey = ctrlKey || metaKey; // Support both Ctrl (Windows) and Cmd (Mac)

    // Global shortcuts
    if (isModKey) {
      switch (key) {
        case 'k':
          event.preventDefault();
          if (onSearch) {
            onSearch();
          } else {
            toast.info('Search functionality coming soon');
          }
          break;

        case 'h':
          event.preventDefault();
          navigate('/');
          toast.success('Navigated to Dashboard');
          break;

        case 'p':
          if (shiftKey) {
            event.preventDefault();
            navigate('/projects');
            toast.success('Navigated to Projects');
          }
          break;

        case 'n':
          event.preventDefault();
          if (shiftKey) {
            // New project
            if (onNewProject) {
              onNewProject();
            } else {
              navigate('/projects/new');
              toast.success('Creating new project');
            }
          } else if (projectId) {
            // New model (only if in project context)
            if (onNewModel) {
              onNewModel();
            } else {
              navigate(`/projects/${projectId}/models/new`);
              toast.success('Creating new model');
            }
          }
          break;

        case 's':
          event.preventDefault();
          navigate('/settings');
          toast.success('Navigated to Settings');
          break;

        case '?':
          event.preventDefault();
          showShortcutHelp();
          break;
      }
    }

    // Navigation shortcuts (without modifier keys)
    if (!isModKey && !shiftKey) {
      // Only trigger these on specific pages to avoid conflicts
      const isOnProjectOrModel = location.pathname.includes('/projects/');
      
      if (isOnProjectOrModel) {
        switch (key) {
          case '1':
            event.preventDefault();
            navigateToTab('overview');
            break;
          case '2':
            event.preventDefault();
            navigateToTab('models');
            break;
          case '3':
            event.preventDefault();
            navigateToTab('performance');
            break;
          case '4':
            event.preventDefault();
            navigateToTab('analysis');
            break;
          case '5':
            event.preventDefault();
            navigateToTab('risks');
            break;
        }
      }
    }

    // Escape key - go back
    if (key === 'Escape' && !isModKey) {
      event.preventDefault();
      window.history.back();
    }
  }, [navigate, location.pathname, projectId, onNewProject, onNewModel, onSearch, navigateToTab]);

  const showShortcutHelp = () => {
    const shortcuts = [
      'Ctrl/Cmd + K: Search (coming soon)',
      'Ctrl/Cmd + H: Go to Dashboard',
      'Ctrl/Cmd + Shift + P: Go to Projects',
      'Ctrl/Cmd + Shift + N: New Project',
      'Ctrl/Cmd + N: New Model (in project)',
      'Ctrl/Cmd + S: Go to Settings',
      'Ctrl/Cmd + ?: Show this help',
      'Escape: Go back',
      '1-5: Switch tabs (on project pages)',
    ];

    const shortcutList = shortcuts.join('\n');
    toast.info(`Keyboard Shortcuts:\n${shortcutList}`, { 
      duration: 8000,
      style: {
        fontFamily: 'monospace',
        whiteSpace: 'pre-line',
      }
    });
  };

  useEffect(() => {
    document.addEventListener('keydown', handleKeyPress);
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [handleKeyPress]);

  return {
    showShortcutHelp,
  };
};