import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from './index'; // Import the express app

describe('Server Health Checks', () => {
  it('should return 200 OK for the basic health check', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(response.body.service).toBe('fortress-modeler-server');
  });

  it('should return 200 OK for the detailed health check', async () => {
    const response = await request(app).get('/health/detailed');
    expect(response.status).toBe(200);
    expect(response.body.service.name).toBe('fortress-modeler-server');
    expect(response.body.database.status).toBe('not_initialized'); // Expect not_initialized as we are not running DB in test env
  });

  it('should return a 404 for a non-existent route', async () => {
    const response = await request(app).get('/non-existent-route');
    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Not Found');
  });
});
