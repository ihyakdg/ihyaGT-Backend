const request = require('supertest');
const app = require('../index');

describe('POST /player/growid/login/validate', () => {
    it('returns a success payload with a base64 encoded token', async () => {
        const res = await request(app)
            .post('/player/growid/login/validate')
            .type('form')
            .send({ _token: 'abc', growId: 'SomePlayer', password: 'secret' });

        expect(res.status).toBe(200);
        const body = JSON.parse(res.text);
        expect(body).toMatchObject({
            status: 'success',
            message: 'Account Validated.',
            url: '',
            accountType: 'growtopia',
        });
        expect(Buffer.from(body.token, 'base64').toString()).toBe(
            '_token=abc&growId=SomePlayer&password=secret',
        );
    });

    it('accepts a json body', async () => {
        const res = await request(app)
            .post('/player/growid/login/validate')
            .send({ _token: 't', growId: 'g', password: 'p' });

        const body = JSON.parse(res.text);
        expect(Buffer.from(body.token, 'base64').toString()).toBe(
            '_token=t&growId=g&password=p',
        );
    });

    it('still responds when credentials are missing', async () => {
        const res = await request(app).get('/player/growid/login/validate');

        expect(res.status).toBe(200);
        const body = JSON.parse(res.text);
        expect(body.status).toBe('success');
        expect(Buffer.from(body.token, 'base64').toString()).toBe(
            '_token=undefined&growId=undefined&password=undefined',
        );
    });
});
