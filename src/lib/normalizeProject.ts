export const camelCaseKeys = <T = any>(input: any): T => {
  if (Array.isArray(input)) {
    return input.map((v) => camelCaseKeys(v)) as T;
  }
  if (input && typeof input === 'object') {
    if (input instanceof Date) {
      return input as T;
    }
    const result: any = {};
    for (const [key, value] of Object.entries(input)) {
      const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      result[camelKey] = camelCaseKeys(value);
    }
    return result;
  }
  return input as T;
};

export const snakeCaseKeys = <T = any>(input: any): T => {
  if (Array.isArray(input)) {
    return input.map((v) => snakeCaseKeys(v)) as T;
  }
  if (input && typeof input === 'object') {
    if (input instanceof Date) {
      return input as T;
    }
    const result: any = {};
    for (const [key, value] of Object.entries(input)) {
      const snakeKey = key
        .replace(/([A-Z])/g, '_$1')
        .toLowerCase();
      result[snakeKey] = snakeCaseKeys(value);
    }
    return result;
  }
  return input as T;
};

export interface ServerProject {
  [key: string]: any;
}

export type NormalizedProject = ReturnType<typeof camelCaseKeys>;

export const normalizeProject = (project: ServerProject): NormalizedProject => {
  return camelCaseKeys(project);
};

export const normalizeProjects = (projects: ServerProject[]): NormalizedProject[] =>
  projects.map(normalizeProject);

export interface ServerModel {
  [key: string]: any;
  model_data?: any;
}

export const normalizeModel = (model: ServerModel): any => {
  const camelModel = camelCaseKeys(model);
  
  // If the model has model_data, extract its contents to the root level
  if (camelModel.modelData) {
    const { modelData, ...rest } = camelModel;
    return {
      ...rest,
      ...modelData,
    };
  }
  
  return camelModel;
};

export const normalizeModels = (models: ServerModel[]): any[] =>
  models.map(normalizeModel);
