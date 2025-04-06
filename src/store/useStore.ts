import { create } from 'zustand';
import { Project, FinancialModel, db, deleteProject as dbDeleteProject } from '@/lib/db';
import * as pdfMakeLib from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
// Import type directly from pdfmake library path
import type { TDocumentDefinitions } from 'pdfmake/interfaces';
// No static import for pdfmake needed due to dynamic import

// EXPORT the generic type
export type ExportDataType = Record<string, any>; 

// EXPORT the type for the export function map
export type ExportFunctionMap = {
    [key: string]: () => ExportDataType | Promise<ExportDataType>;
};

interface AppState {
  projects: Project[];
  currentProject: Project | null;
  currentModel: FinancialModel | null;
  isLoading: boolean;
  error: string | null;

  // Export state and actions
  exportFunctions: ExportFunctionMap;
  registerExportFunction: (key: string, func: () => ExportDataType | Promise<ExportDataType>) => void;
  unregisterExportFunction: (key: string) => void;
  triggerExport: (reportKey: string, format: 'json' | 'pdf' | 'xlsx') => Promise<void>;
  triggerFullExport: (format: 'json' | 'pdf' | 'xlsx') => Promise<void>;

  loadProjects: () => Promise<void>;
  loadProjectById: (id: number) => Promise<Project | null>;
  setCurrentProject: (project: Project | null) => void;
  setCurrentModel: (model: FinancialModel | null) => void;
  addProject: (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => Promise<number>;
  updateProject: (id: number, updates: Partial<Project>) => Promise<void>;
  deleteProject: (id: number) => Promise<void>;

  // Financial model methods
  loadModelsForProject: (projectId: number) => Promise<FinancialModel[]>;
  loadModelById: (id: number) => Promise<FinancialModel | null>;
  addFinancialModel: (model: Omit<FinancialModel, 'id' | 'createdAt' | 'updatedAt'>) => Promise<number>;
  updateFinancialModel: (id: number, updates: Partial<FinancialModel>) => Promise<void>;
  deleteFinancialModel: (id: number) => Promise<void>;

  // Actuals methods
  loadActualsForProject: (projectId: number) => Promise<any[]>;
}

// --- Helper function to create basic pdfmake doc definition ---
// This needs significant expansion for proper styling, tables, charts etc.
const createDocDefinition = (data: ExportDataType, reportKey: string): TDocumentDefinitions => {
  console.log("Creating pdfmake doc definition for:", reportKey, data);
  const content: any[] = [];

  // Basic Title
  content.push({ text: `${reportKey} Report`, style: 'header' });
  content.push({ text: `Project: ${data.projectName || 'N/A'}`, style: 'subheader' });
  content.push({ text: `Generated: ${new Date(data.exportDate).toLocaleString()}`, style: 'subheader' });
  content.push({ text: ' ', margin: [0, 10] }); // Spacer

  // Basic Summary Metrics (Example)
  if (data.summaryMetrics) {
    content.push({ text: 'Summary', style: 'subheader' });
    const summaryTableBody = Object.entries(data.summaryMetrics)
        // Filter or format specific metrics as needed
        .map(([key, value]) => [key, typeof value === 'number' ? value.toFixed(2) : String(value)]);
    
    content.push({
        layout: 'lightHorizontalLines', // optional
        table: {
            headerRows: 1,
            widths: ['*', 'auto'],
            body: [
                [{ text: 'Metric', style: 'tableHeader' }, { text: 'Value', style: 'tableHeader' }],
                ...summaryTableBody
            ]
        }
    });
    content.push({ text: ' ', margin: [0, 10] }); // Spacer
  }

  // TODO: Add Trend Data Table (using data.trendData)
  // TODO: Add Assumptions (using data.assumptions)
  // TODO: Add logic to render charts (likely needs converting charts to images first)

  return {
    content: content,
    styles: {
      header: { fontSize: 18, bold: true, margin: [0, 0, 0, 10] },
      subheader: { fontSize: 12, margin: [0, 0, 0, 5] },
      tableHeader: { bold: true, fontSize: 11, color: 'black' }
    }
  };
};

const useStore = create<AppState>((set, get) => ({
  projects: [],
  currentProject: null,
  currentModel: null,
  isLoading: false,
  error: null,

  // --- Export State & Actions ---
  exportFunctions: {},

  registerExportFunction: (key, func) => {
    console.log(`[Store] Registering export function: ${key}`);
    set((state) => ({
      exportFunctions: { ...state.exportFunctions, [key]: func },
    }));
  },

  unregisterExportFunction: (key) => {
    console.log(`[Store] Unregistering export function: ${key}`);
    set((state) => {
      const { [key]: _, ...rest } = state.exportFunctions;
      return { exportFunctions: rest };
    });
  },

  triggerExport: async (reportKey, format) => {
    console.log(`[Store] Triggering export for: ${reportKey} as ${format}`);
    const func = get().exportFunctions[reportKey];
    if (!func) {
      console.error(`Export function for key "${reportKey}" not found.`);
      alert(`Could not export ${reportKey}: Data function not available.`);
      return;
    }
    try {
      const data = await func();
      console.log(`[Store] Data fetched for ${reportKey}:`, data);
      
      const projectName = get().currentProject?.name || 'export';
      const filenameBase = `${reportKey.replace(/\s+/g, '_')}-${projectName.replace(/\s+/g, '_')}`;

      if (format === 'json') {
          const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
              JSON.stringify(data, null, 2)
          )}`;
          const link = document.createElement("a");
          link.href = jsonString;
          link.download = `${filenameBase}.json`;
          link.click();
          console.log(`[Store] JSON export triggered for ${reportKey}`);
      } else if (format === 'pdf') {
          alert(`PDF export for '${reportKey}' starting. Generation may take a moment...`);
          console.log('PDF Export Data:', data);
          try {
              // Font assignment removed earlier
              
              const docDefinition: TDocumentDefinitions = createDocDefinition(data, reportKey);
              pdfMakeLib.createPdf(docDefinition).download(`${filenameBase}.pdf`);
              console.log("[Store] pdfmake PDF download triggered.");

          } catch (pdfError) {
              console.error("Error during PDF generation:", pdfError);
              alert("Failed to generate PDF. Check console and ensure library is installed correctly.");
          }
      } else if (format === 'xlsx') {
          alert(`Excel export for '${reportKey}' requires implementation.\n\nInstall xlsx (SheetJS) or exceljs and add generation logic here using the fetched data object.`);
          console.log('Excel Export Data:', data);
      }
    } catch (error) {
        console.error(`Error during export for ${reportKey}:`, error);
        alert(`Failed to export ${reportKey}.`);
    }
  },

  triggerFullExport: async (format) => {
      console.log(`[Store] Triggering FULL export as ${format}`);
      const state = get();
      const allExportData: Record<string, ExportDataType> = {};
      let errorOccurred = false;

      for (const key in state.exportFunctions) {
          try {
              const func = state.exportFunctions[key];
              allExportData[key] = await func();
              console.log(`[Store] Fetched data for ${key} (Full Report)`);
          } catch (error) {
              console.error(`Error fetching data for ${key} during full export:`, error);
              errorOccurred = true;
              // Optionally skip failed parts or add error info to export
              allExportData[key] = { error: `Failed to fetch data for ${key}` };
          }
      }

      if (errorOccurred) {
          alert("Warning: Some parts of the full report failed to generate. Check console.");
      }
      
      const projectName = state.currentProject?.name || 'full_report';
      const filenameBase = `full_product_report-${projectName.replace(/\s+/g, '_')}`;

       if (format === 'json') {
          const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
              JSON.stringify(allExportData, null, 2)
          )}`;
          const link = document.createElement("a");
          link.href = jsonString;
          link.download = `${filenameBase}.json`;
          link.click();
          console.log(`[Store] FULL JSON export triggered`);
      } else if (format === 'pdf') {
          alert("Full Report PDF export starting. Generation may take a moment...");
          console.log('Full PDF Export Data:', allExportData);
          try {
              // Font assignment removed earlier

              let fullDocDefinitionContent: any[] = [];
              // Add overall title
              fullDocDefinitionContent.push({ text: `Full Product Report - ${projectName}`, style: 'header' });
              fullDocDefinitionContent.push({ text: `Generated: ${new Date().toLocaleString()}`, style: 'subheader', margin: [0, 0, 0, 15] });

              for (const key in allExportData) {
                  const reportData = allExportData[key];
                  if (reportData.error) { // Handle potential errors during data fetching
                       fullDocDefinitionContent.push({ text: `Section: ${key}`, style: 'sectionHeader' });
                       fullDocDefinitionContent.push({ text: `Error: ${reportData.error}`, color: 'red', margin: [0, 5, 0, 15] });
                      continue;
                  }
                  // Generate content for each section using a similar structure
                  fullDocDefinitionContent.push({ text: `Section: ${key}`, style: 'sectionHeader' });
                  // Use parts of createDocDefinition or a similar helper
                  if (reportData.summaryMetrics) {
                      const summaryTableBody = Object.entries(reportData.summaryMetrics)
                          .map(([k, v]) => [k, typeof v === 'number' ? v.toFixed(2) : String(v)]);
                      fullDocDefinitionContent.push({ text: 'Summary', style: 'subheader' });
                      fullDocDefinitionContent.push({
                          layout: 'lightHorizontalLines',
                          table: {
                              headerRows: 1, widths: ['*', 'auto'],
                              body: [[{ text: 'Metric', style: 'tableHeader' }, { text: 'Value', style: 'tableHeader' }], ...summaryTableBody]
                          }
                      });
                  }
                   // TODO: Add Trend Data Table, Assumptions etc. for each section
                   fullDocDefinitionContent.push({ text: ' ', margin: [0, 15] }); // Spacer between sections
              }

              // Use the imported type for the definition
              const fullDocDefinition: TDocumentDefinitions = {
                  content: fullDocDefinitionContent,
                  styles: {
                      header: { fontSize: 18, bold: true, margin: [0, 0, 0, 10] },
                      sectionHeader: { fontSize: 14, bold: true, margin: [0, 10, 0, 5] },
                      subheader: { fontSize: 12, margin: [0, 0, 0, 5] },
                      tableHeader: { bold: true, fontSize: 11, color: 'black' }
                  }
              };

              pdfMakeLib.createPdf(fullDocDefinition).download(`${filenameBase}.pdf`);
              console.log("[Store] pdfmake Full PDF download triggered.");

           } catch (pdfError) {
                console.error("Error during Full PDF generation:", pdfError);
                alert("Failed to generate Full PDF. Check console and ensure library is installed correctly.");
           }
      } else if (format === 'xlsx') {
          alert("Full Report Excel export requires implementation.\n\nInstall xlsx/exceljs and add generation logic to create multiple sheets.");
          console.log('Full Excel Export Data:', allExportData);
      }
  },

  // --- Existing State & Actions ---
  loadProjects: async () => {
    set({ isLoading: true, error: null });
    try {
      const projects = await db.projects.toArray();
      set({ projects, isLoading: false });
    } catch (error) {
      console.error('Error loading projects:', error);
      set({ error: 'Failed to load projects', isLoading: false });
    }
  },

  loadProjectById: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const project = await db.projects.get(id);
      if (project) {
        set({ currentProject: project, isLoading: false });
        return project;
      } else {
        set({ error: 'Project not found', isLoading: false });
        return null;
      }
    } catch (error) {
      console.error('Error loading project:', error);
      set({ error: 'Failed to load project', isLoading: false });
      return null;
    }
  },

  setCurrentProject: (project) => set({ currentProject: project }),

  setCurrentModel: (model) => set({ currentModel: model }),

  addProject: async (project) => {
    set({ isLoading: true, error: null });
    try {
      const id = await db.projects.add({
        ...project,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      await get().loadProjects();
      set({ isLoading: false });
      return id;
    } catch (error) {
      console.error('Error adding project:', error);
      set({ error: 'Failed to add project', isLoading: false });
      return -1;
    }
  },

  updateProject: async (id, updates) => {
    set({ isLoading: true, error: null });
    try {
      await db.projects.update(id, { ...updates, updatedAt: new Date() });
      await get().loadProjects();

      // Update current project if it's the one being edited
      const currentProject = get().currentProject;
      if (currentProject && currentProject.id === id) {
        const updatedProject = await db.projects.get(id);
        if (updatedProject) {
          set({ currentProject: updatedProject });
        }
      }

      set({ isLoading: false });
    } catch (error) {
      console.error('Error updating project:', error);
      set({ error: 'Failed to update project', isLoading: false });
    }
  },

  deleteProject: async (id) => {
    set({ isLoading: true, error: null });
    try {
      console.log(`Store: Deleting project ${id} using dbDeleteProject function`);
      // Use the imported dbDeleteProject function instead of trying to call it as a method on db
      await dbDeleteProject(id);

      // Reset current project if it's the one being deleted
      const currentProject = get().currentProject;
      if (currentProject && currentProject.id === id) {
        set({ currentProject: null });
      }

      await get().loadProjects();
      set({ isLoading: false });
      console.log(`Store: Successfully deleted project ${id}`);
    } catch (error) {
      console.error('Error deleting project:', error);
      set({ error: 'Failed to delete project', isLoading: false });
      // Re-throw the error so the UI can handle it
      throw new Error('Failed to delete project');
    }
  },

  loadModelById: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const model = await db.financialModels.get(id);
      if (model) {
        set({ currentModel: model, isLoading: false });
      } else {
        set({ error: 'Model not found', isLoading: false });
      }
      return model || null;
    } catch (error) {
      console.error('Error loading financial model:', error);
      set({ error: 'Failed to load financial model', isLoading: false });
      return null;
    }
  },

  loadModelsForProject: async (projectId) => {
    set({ isLoading: true, error: null });
    try {
      const models = await db.financialModels
        .where('projectId')
        .equals(projectId)
        .toArray();
      set({ isLoading: false });
      return models;
    } catch (error) {
      console.error('Error loading financial models:', error);
      set({ error: 'Failed to load financial models', isLoading: false });
      return [];
    }
  },

  addFinancialModel: async (model) => {
    set({ isLoading: true, error: null });
    try {
      const id = await db.financialModels.add({
        ...model,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      set({ isLoading: false });
      return id;
    } catch (error) {
      console.error('Error adding financial model:', error);
      set({ error: 'Failed to add financial model', isLoading: false });
      return -1;
    }
  },

  updateFinancialModel: async (id, updates) => {
    set({ isLoading: true, error: null });
    try {
      await db.financialModels.update(id, { ...updates, updatedAt: new Date() });

      // Update current model if it's the one being edited
      const currentModel = get().currentModel;
      if (currentModel && currentModel.id === id) {
        const updatedModel = await db.financialModels.get(id);
        if (updatedModel) {
          set({ currentModel: updatedModel });
        }
      }

      set({ isLoading: false });
    } catch (error) {
      console.error('Error updating financial model:', error);
      set({ error: 'Failed to update financial model', isLoading: false });
    }
  },

  deleteFinancialModel: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await db.financialModels.delete(id);

      // Reset current model if it's the one being deleted
      const currentModel = get().currentModel;
      if (currentModel && currentModel.id === id) {
        set({ currentModel: null });
      }

      set({ isLoading: false });
    } catch (error) {
      console.error('Error deleting financial model:', error);
      set({ error: 'Failed to delete financial model', isLoading: false });
    }
  },

  loadActualsForProject: async (projectId) => {
    set({ error: null });
    try {
      console.log(`[Store] Loading actuals for projectId: ${projectId}`);
      const actuals = await db.actuals.where('projectId').equals(projectId).toArray();
      console.log(`[Store] Found ${actuals.length} actuals entries.`);
      return actuals;
    } catch (error) {
      console.error('Error loading actuals:', error);
      set({ error: 'Failed to load actuals'});
      return [];
    }
  },
}));

export default useStore;
