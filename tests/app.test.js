const request = require('supertest');
const app = require('../index');

describe('index route', () => {
    it('responds with Hello World!', async () => {
        const res = await request(app).get('/');

        expect(res.status).toBe(200);
        expect(res.text).toBe('Hello World!');
    });
});

describe('middleware', () => {
    it('sets the CORS headers on every response', async () => {
        const res = await request(app).get('/');

        expect(res.headers['access-control-allow-origin']).toBe('*');
        expect(res.headers['access-control-allow-headers']).toBe(
            'Origin, X-Requested-With, Content-Type, Accept',
        );
    });

    it('exposes rate limit headers', async () => {
        const res = await request(app).get('/');

        expect(res.headers['x-ratelimit-limit']).toBe('100');
        expect(Number(res.headers['x-ratelimit-remaining'])).toBeLessThanOrEqual(100);
    });

    it('compresses responses when the client accepts gzip', async () => {
        const res = await request(app)
            .post('/player/login/dashboard')
            .set('Accept-Encoding', 'gzip')
            .send('');

        expect(res.headers['content-encoding']).toBe('gzip');
    });

    it('skips compression when x-no-compression is set', async () => {
        const res = await request(app)
            .post('/player/login/dashboard')
            .set('Accept-Encoding', 'gzip')
            .set('x-no-compression', 'true')
            .send('');

        expect(res.headers['content-encoding']).toBeUndefined();
    });
});

describe('player fallback route', () => {
    it('redirects unknown player paths to the upstream api', async () => {
        const res = await request(app).get('/player/growid/checkToken');

        expect(res.status).toBe(302);
        expect(res.headers.location).toBe(
            'https://ihya-gt-backend-ql89.vercel.app/player/growid/checkToken',
        );
    });

    it('redirects with an empty suffix for the bare player path', async () => {
        const res = await request(app).get('/player/');

        expect(res.status).toBe(302);
        expect(res.headers.location).toBe(
            'https://ihya-gt-backend-ql89.vercel.app/player/',
        );
    });

    it('returns 404 for paths outside the player namespace', async () => {
        const res = await request(app).get('/does-not-exist');

        expect(res.status).toBe(404);
    });
});
