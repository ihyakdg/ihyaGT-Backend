const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const rateLimiter = require('express-rate-limit');
const compression = require('compression');

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
app.use(function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header(
        'Access-Control-Allow-Headers',
        'Origin, X-Requested-With, Content-Type, Accept',
    );
    console.log(`[${new Date().toLocaleString()}] ${req.method} ${req.url} - ${res.statusCode}`);
    next();
});
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(rateLimiter({ windowMs: 15 * 60 * 1000, max: 100, headers: true }));

// The client posts a single pipe/newline delimited blob, e.g.
// `growId|abc\npassword|def\n`. With no `=` in it, body-parser exposes the whole
// blob as a key with an empty value, so check keys and values alike.
function parseClientData(body) {
    const entries = Object.entries(body || {})[0] || [];
    const raw = entries.find(entry => typeof entry === 'string' && entry.includes('|'));
    if (!raw) return {};

    const data = {};
    for (const line of raw.split('\n')) {
        if (!line) continue;
        const separator = line.indexOf('|');
        if (separator === -1) continue;
        data[line.slice(0, separator)] = line.slice(separator + 1);
    }
    return data;
}

app.all('/player/login/dashboard', function (req, res, next) {
    const tData = parseClientData(req.body);

    if (tData.growId && tData.password) {
        return res.redirect('/player/growid/login/validate');
    }

    res.render(__dirname + '/public/html/dashboard.ejs', { data: tData }, function (err, html) {
        if (err) return next(err);
        res.send(html);
    });
});

app.all('/player/growid/login/validate', (req, res) => {
    const { _token, growId, password } = req.body;

    if (!growId || !password) {
        return res.status(400).json({
            status: 'error',
            message: 'GrowID and password are required.',
        });
    }

    const token = Buffer.from(
        `_token=${_token ?? ''}&growId=${growId}&password=${password}`,
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
    res.status(301).redirect('https://ihya-gt-backend-ql89.vercel.app/player/' + req.path.slice(8));
});

app.get('/', function (req, res) {
    res.send('Hello World!');
});

app.use(function (req, res) {
    res.status(404).json({ status: 'error', message: 'Not found.' });
});

app.use(function (err, req, res, next) {
    console.error(`[${new Date().toLocaleString()}] ${req.method} ${req.url} failed:`, err);

    if (res.headersSent) return next(err);

    const status = err.status || err.statusCode || 500;
    res.status(status).json({
        status: 'error',
        message: status < 500 && err.expose ? err.message : 'Internal server error.',
    });
});

const server = app.listen(5000, function () {
    console.log('Listening on port 5000');
});

server.on('error', function (err) {
    console.error('Server failed to start:', err);
    process.exit(1);
});

process.on('unhandledRejection', function (reason) {
    console.error('Unhandled promise rejection:', reason);
});

process.on('uncaughtException', function (err) {
    console.error('Uncaught exception:', err);
    process.exit(1);
});
