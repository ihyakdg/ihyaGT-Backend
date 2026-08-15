const request = require('supertest');
const app = require('../index');

describe('POST /player/login/dashboard', () => {
    it('renders the dashboard when the body is empty', async () => {
        const res = await request(app).post('/player/login/dashboard').send('');

        expect(res.status).toBe(200);
        expect(res.text).toContain('Growtopia - Dashboard');
        expect(res.text).toContain('action="/player/growid/login/validate"');
    });

    it('embeds the parsed growtopia payload into the _token field', async () => {
        const payload = 'requestedName|SomePlayer\n';

        const res = await request(app)
            .post('/player/login/dashboard')
            .set('Content-Type', 'application/x-www-form-urlencoded')
            .send(payload);

        expect(res.status).toBe(200);
        const token = res.text.match(/name="_token" value="([^"]*)"/)[1];
        const data = JSON.parse(token.replace(/&#34;/g, '"'));
        expect(data).toEqual({ requestedName: 'SomePlayer' });
    });

    it('redirects to the validate endpoint when credentials are present', async () => {
        const payload = 'user|SomePlayer\npassword|secret\n';

        const res = await request(app)
            .post('/player/login/dashboard')
            .set('Content-Type', 'application/x-www-form-urlencoded')
            .send(payload);

        expect(res.status).toBe(302);
        expect(res.headers.location).toBe('/player/growid/login/validate');
    });

    it('does not redirect when the password value is missing', async () => {
        const payload = 'user|SomePlayer\npassword|\n';

        const res = await request(app)
            .post('/player/login/dashboard')
            .set('Content-Type', 'application/x-www-form-urlencoded')
            .send(payload);

        expect(res.status).toBe(200);
        expect(res.headers.location).toBeUndefined();
    });

    it('is reachable with any http method', async () => {
        const res = await request(app).get('/player/login/dashboard');

        expect(res.status).toBe(200);
        expect(res.text).toContain('Growtopia - Dashboard');
    });
});
