/**
 * Store (Refactored)
 * 
 * This module integrates the refactored scenario store with the existing store.
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { db, FinancialModel } from '@/lib/db';
import { createScenarioSlice, ScenarioState } from '@/features/scenarios/store';

// Define the store state
interface StoreState extends ScenarioState {
  // Project state
  projects: any[];
  currentProject: any | null;
  projectsLoading: boolean;
  
  // Financial model state
  financialModels: FinancialModel[];
  currentModel: FinancialModel | null;
  modelsLoading: boolean;
  
  // Project actions
  loadProjects: () => Promise<any[]>;
  createProject: (name: string, description?: string) => Promise<any>;
  updateProject: (project: any) => Promise<any>;
  deleteProject: (projectId: number) => Promise<void>;
  setCurrentProject: (project: any | null) => void;
  
  // Financial model actions
  loadFinancialModels: (projectId: number) => Promise<FinancialModel[]>;
  loadFinancialModel: (modelId: number) => Promise<FinancialModel | null>;
  createFinancialModel: (projectId: number, name: string, description?: string) => Promise<FinancialModel>;
  updateFinancialModel: (model: FinancialModel) => Promise<FinancialModel>;
  deleteFinancialModel: (modelId: number) => Promise<void>;
  setCurrentModel: (model: FinancialModel | null) => void;
}

// Create the store
const useStore = create<StoreState>()(
  devtools(
    persist(
      (set, get) => ({
        // Include the scenario slice
        ...createScenarioSlice(set, get),
        
        // Project state
        projects: [],
        currentProject: null,
        projectsLoading: false,
        
        // Financial model state
        financialModels: [],
        currentModel: null,
        modelsLoading: false,
        
        // Project actions
        loadProjects: async () => {
          try {
            set({ projectsLoading: true });
            const projects = await db.projects.toArray();
            set({ projects, projectsLoading: false });
            return projects;
          } catch (error) {
            console.error('Error loading projects:', error);
            set({ projectsLoading: false });
            return [];
          }
        },
        
        createProject: async (name, description) => {
          try {
            const newProject = {
              name,
              description,
              createdAt: new Date(),
              updatedAt: new Date()
            };
            
            const id = await db.projects.add(newProject);
            const createdProject = { ...newProject, id };
            
            set(state => ({
              projects: [...state.projects, createdProject]
            }));
            
            return createdProject;
          } catch (error) {
            console.error('Error creating project:', error);
            throw error;
          }
        },
        
        updateProject: async (project) => {
          try {
            const updatedProject = {
              ...project,
              updatedAt: new Date()
            };
            
            await db.projects.update(project.id, updatedProject);
            
            set(state => ({
              projects: state.projects.map(p => 
                p.id === project.id ? updatedProject : p
              ),
              currentProject: state.currentProject?.id === project.id 
                ? updatedProject 
                : state.currentProject
            }));
            
            return updatedProject;
          } catch (error) {
            console.error('Error updating project:', error);
            throw error;
          }
        },
        
        deleteProject: async (projectId) => {
          try {
            await db.projects.delete(projectId);
            
            set(state => ({
              projects: state.projects.filter(p => p.id !== projectId),
              currentProject: state.currentProject?.id === projectId 
                ? null 
                : state.currentProject
            }));
          } catch (error) {
            console.error('Error deleting project:', error);
            throw error;
          }
        },
        
        setCurrentProject: (project) => {
          set({ currentProject: project });
        },
        
        // Financial model actions
        loadFinancialModels: async (projectId) => {
          try {
            set({ modelsLoading: true });
            const models = await db.financialModels
              .where('projectId')
              .equals(projectId)
              .toArray();
            
            set({ financialModels: models, modelsLoading: false });
            return models;
          } catch (error) {
            console.error('Error loading financial models:', error);
            set({ modelsLoading: false });
            return [];
          }
        },
        
        loadFinancialModel: async (modelId) => {
          try {
            const model = await db.financialModels.get(modelId);
            return model || null;
          } catch (error) {
            console.error(`Error loading financial model ${modelId}:`, error);
            return null;
          }
        },
        
        createFinancialModel: async (projectId, name, description) => {
          try {
            const newModel: FinancialModel = {
              projectId,
              name,
              description,
              assumptions: {
                revenue: [],
                costs: [],
                growthModel: {
                  type: 'exponential',
                  rate: 0.05
                }
              },
              createdAt: new Date(),
              updatedAt: new Date()
            };
            
            const id = await db.financialModels.add(newModel);
            const createdModel = { ...newModel, id };
            
            set(state => ({
              financialModels: [...state.financialModels, createdModel]
            }));
            
            return createdModel;
          } catch (error) {
            console.error('Error creating financial model:', error);
            throw error;
          }
        },
        
        updateFinancialModel: async (model) => {
          try {
            const updatedModel = {
              ...model,
              updatedAt: new Date()
            };
            
            await db.financialModels.update(model.id!, updatedModel);
            
            set(state => ({
              financialModels: state.financialModels.map(m => 
                m.id === model.id ? updatedModel : m
              ),
              currentModel: state.currentModel?.id === model.id 
                ? updatedModel 
                : state.currentModel
            }));
            
            return updatedModel;
          } catch (error) {
            console.error('Error updating financial model:', error);
            throw error;
          }
        },
        
        deleteFinancialModel: async (modelId) => {
          try {
            await db.financialModels.delete(modelId);
            
            set(state => ({
              financialModels: state.financialModels.filter(m => m.id !== modelId),
              currentModel: state.currentModel?.id === modelId 
                ? null 
                : state.currentModel
            }));
          } catch (error) {
            console.error('Error deleting financial model:', error);
            throw error;
          }
        },
        
        setCurrentModel: (model) => {
          set({ currentModel: model });
        }
      }),
      {
        name: 'fortress-modeler-store',
        partialize: (state) => ({
          // Only persist these parts of the state
          currentProject: state.currentProject,
          currentModel: state.currentModel
        })
      }
    )
  )
);

export default useStore;
