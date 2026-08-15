/**
 * Parses the pipe-delimited `key|value` lines that the Growtopia client sends
 * as its login payload into an ordered list of pairs. The last line is a
 * trailing fragment rather than a real pair, so `pairsToObject` drops it.
 */
function parsePipePairs(payload) {
    return JSON.stringify(payload)
        .split('"')[1]
        .split('\\n')
        .map(line => {
            const segments = line.split('|');
            return { key: segments[0], value: segments[1] };
        });
}

function pairsToObject(pairs) {
    return pairs.slice(0, -1).reduce((data, { key, value }) => {
        data[key] = value;
        return data;
    }, {});
}

function buildLoginToken({ _token, growId, password }) {
    return Buffer.from(
        `_token=${_token}&growId=${growId}&password=${password}`,
    ).toString('base64');
}

module.exports = { parsePipePairs, pairsToObject, buildLoginToken };
