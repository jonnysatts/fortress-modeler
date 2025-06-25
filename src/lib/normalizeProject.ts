export const camelCaseKeys = <T = any>(input: any): T => {
  if (Array.isArray(input)) {
    return input.map((v) => camelCaseKeys(v)) as T;
  }
  if (input && typeof input === 'object') {
    const result: any = {};
    for (const [key, value] of Object.entries(input)) {
      const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      result[camelKey] = camelCaseKeys(value);
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
