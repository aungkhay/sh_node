module.exports = (req) => {

    const queryText = [
        'select', 'insert', 'update', 'delete', 'delay', 'sleep', 'alter', 'create', '.php', '.html', '.js',
        'script', 'src=', 'function', 'javascript', 'xss', 'iframe', 'svg', 'import', 'url=', 'echo',
        'expr', 'var_dump', 'md5', 'CRLF', 'concat', 'DBMS', 'root', 'union', 'having', 'truncate', 'declare',
        'drop', 'load_file', 'outfile', '/*', '*/'
    ];

    const reqParams = req.params;
    if (reqParams.id && isNaN(reqParams.id)) {
        return false;
    }

    const reqBody = req.body;
    const reqQuery = req.query;

    const reqValues = {
        ...reqBody,
        ...reqQuery
    }

    for (const key in reqValues) {
        if (Object.hasOwnProperty.call(reqValues, key)) {
            const value = JSON.stringify(reqValues[key]).toLowerCase();
            for (let i = 0; i < queryText.length; i++) {
                const q = queryText[i];
                if (value.includes(q)) {
                    return false;
                }
            }
        }
    }

    return true;
}