const request = require('supertest');
const { app } = require('../src/app');

describe('app', () => {
  it('returns health status', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      message: 'API operativa',
      data: {
        environment: 'test',
      },
    });
  });

  it('returns 404 for unknown API route', async () => {
    const response = await request(app).get('/api/no-existe');

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
  });
});
