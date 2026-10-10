import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

describe('Health & Metadata Endpoints', () => {
  it('GET /api/v1 should return API metadata and endpoints map', async () => {
    const res = await request(app).get('/api/v1');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('endpoints');
    expect(res.body.endpoints).toHaveProperty('health', '/api/v1/health');
  });

  it('GET /api/v1/health should respond with valid subsystem telemetry', async () => {
    const res = await request(app).get('/api/v1/health');
    // Status is either 200 (if MongoDB running) or 503 (if MongoDB is disconnected in standalone test environment)
    expect([200, 503]).toContain(res.statusCode);
    expect(res.body).toHaveProperty('data');
    expect(res.body.data).toHaveProperty('service', 'Everest Textile OS API');
    expect(res.body.data).toHaveProperty('database');
    expect(res.body.data.database).toHaveProperty('state');
    expect(res.body.data).toHaveProperty('system');
    expect(res.body.data.system).toHaveProperty('nodeVersion');
  });

  it('GET /health probe should return matching health payload', async () => {
    const res = await request(app).get('/health');
    expect([200, 503]).toContain(res.statusCode);
    expect(res.body).toHaveProperty('data');
    expect(res.body.data.service).toBe('Everest Textile OS API');
  });

  it('GET /api/v1/non-existent-route should return structured 404 response', async () => {
    const res = await request(app).get('/api/v1/non-existent-route');
    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body.error).toHaveProperty('code', 'NOT_FOUND');
  });
});

