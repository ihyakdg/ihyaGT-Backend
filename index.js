const path = require('path');
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const rateLimiter = require('express-rate-limit');
const compression = require('compression');

const PORT = process.env.PORT || 5000;
const BODY_LIMIT = '16kb';
const MAX_FIELDS = 32;
const MAX_FIELD_LENGTH = 128;
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);
const PLAYER_REDIRECT_BASE = process.env.PLAYER_REDIRECT_BASE || 'https://ihya-gt-backend-ql89.vercel.app';

app.use(compression({
    level: 5,
    threshold: 0,
    filter: (req, res) => {
        if (req.headers['x-no-compression']) {
            return false;
        }
        return compression.filter(req, res);
    }
}));
app.set('view engine', 'ejs');
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(function (req, res, next) {
    const origin = req.headers.origin;
    if (origin && ALLOWED_ORIGINS.includes(origin)) {
        res.header('Access-Control-Allow-Origin', origin);
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
        res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.header('Vary', 'Origin');
    }
    res.header('X-Content-Type-Options', 'nosniff');
    res.header('X-Frame-Options', 'DENY');
    res.header('Referrer-Policy', 'no-referrer');
    console.log(`[${new Date().toLocaleString()}] ${req.method} ${req.path}`);
    next();
});
app.use(bodyParser.urlencoded({ extended: false, limit: BODY_LIMIT }));
app.use(express.json({ limit: BODY_LIMIT }));
app.use(rateLimiter({ windowMs: 15 * 60 * 1000, max: 100, headers: true }));

function isSafeField(value) {
    return typeof value === 'string' && value.length > 0 && value.length <= MAX_FIELD_LENGTH;
}

// The Growtopia client posts its login payload as a single urlencoded key
// holding newline separated `key|value` pairs.
function parseLoginPayload(body) {
    const data = Object.create(null);
    const raw = Object.keys(body || {})[0];
    if (typeof raw !== 'string') return data;

    for (const line of raw.split('\n').slice(0, MAX_FIELDS)) {
        const separator = line.indexOf('|');
        if (separator <= 0) continue;
        const key = line.slice(0, separator).slice(0, MAX_FIELD_LENGTH);
        const value = line.slice(separator + 1).slice(0, MAX_FIELD_LENGTH);
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
        data[key] = value;
    }
    return data;
}

app.all('/player/login/dashboard', function (req, res) {
    const data = parseLoginPayload(req.body);

    if (isSafeField(data.growId) && isSafeField(data.password)) {
        return res.redirect('/player/growid/login/validate');
    }

    res.render(path.join(__dirname, 'public', 'html', 'dashboard.ejs'), { data });
});

app.all('/player/growid/login/validate', (req, res) => {
    const { _token: rawToken, growId, password } = req.body || {};
    const _token = rawToken === undefined ? '' : rawToken;

    if (typeof _token !== 'string' || _token.length > 4096 || !isSafeField(growId) || !isSafeField(password)) {
        return res.status(400).json({ status: 'error', message: 'Invalid login request.' });
    }

    const token = Buffer.from(
        `_token=${_token}&growId=${growId}&password=${password}`,
    ).toString('base64');

    res.json({
        status: 'success',
        message: 'Account Validated.',
        token,
        url: '',
        accountType: 'growtopia',
    });
});

app.all('/player/*', function (req, res) {
    const target = new URL(PLAYER_REDIRECT_BASE);
    target.pathname = req.path;
    res.redirect(301, target.toString());
});

app.get('/', function (req, res) {
    res.send('Hello World!');
});

app.listen(PORT, function () {
    console.log(`Listening on port ${PORT}`);
});
