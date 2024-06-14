const request = require('supertest');
const app = require('../server');

describe('Login Tests', () => {
  it('responds with a redirect to /admin-dashboard when admin logs in', async () => {
    const response = await request(app)
      .post('/login')
      .send({ username: 'hari1811', password: 'harikesh' });

    expect(response.status).toBe(200); // Ensure the status is 302 for redirection
    expect(response.headers['location']).toBe('/admin-dashboard'); // Check the redirection target
  });

  it('responds with a redirect to /player-dashboard when player logs in', async () => {
    const response = await request(app)
      .post('/login')
      .send({ username: 'abhi1811', password: 'harikesh' });

    expect(response.status).toBe(200); // Ensure the status is 302 for redirection
    expect(response.headers['location']).toBe('/player-dashboard'); // Check the redirection target
  });

  it('responds with 200 status and shows error message for invalid credentials', async () => {
    const response = await request(app)
      .post('/login')
      .send({ username: 'invaliduser', password: 'invalidpassword' });

    expect(response.status).toBe(200); // Expecting a 200 status for invalid credentials
    expect(response.text).toContain('Invalid username or password'); // Check for error message in response
  });
});