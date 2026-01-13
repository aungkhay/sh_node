### Master Slave
``` mysql
CREATE USER 'dbUser'@'192.168.100.11' IDENTIFIED BY 'password';
CREATE USER 'dbUser'@'192.168.100.12' IDENTIFIED BY 'password';
GRANT ALL PRIVILEGES ON shanghe.* TO 'dbUser'@'192.168.100.11';
GRANT ALL PRIVILEGES ON shanghe.* TO 'dbUser'@'192.168.100.12';
FLUSH PRIVILEGES;

CREATE USER 'dbUser'@'localhost' IDENTIFIED BY 'password';
CREATE USER 'dbUser'@'192.168.100.11' IDENTIFIED BY 'password';
GRANT SELECT ON shanghe.* TO 'dbUser'@'localhost';
GRANT SELECT ON shanghe.* TO 'dbUser'@'192.168.100.11';
FLUSH PRIVILEGES;
```

### Swagger
``` js
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');

try {
    const UserDoc = YAML.load('./app/docs/User.yml');
    APP.use('/docs/user', swaggerUi.serve, swaggerUi.setup(UserDoc));
} catch (error) {
    console.log(error);   
}
```

### IP WhiteList
``` js
// Admin IP whitelist: only allow specified IPs to access /admin routes
try {
    if (req.path && req.path.startsWith('/admin')) {
        const rawList = process.env.ADMIN_WHITELIST || '127.0.0.1,::1';
        const whitelist = rawList.split(',').map(s => s.trim()).filter(Boolean);
        const forwarded = (req.headers['x-forwarded-for'] || '').split(',')[0].trim();
        const remote = req.connection && req.connection.remoteAddress ? req.connection.remoteAddress : '';
        let ip = forwarded || req.ip || remote || '';
        // normalize IPv4 mapped IPv6 addresses
        ip = ip.replace(/^::ffff:/, '');

        const allowed = whitelist.some(w => {
            if (!w) return false;
            if (w.includes('*')) {
                // support simple wildcard suffix like 192.168.1.*
                const prefix = w.replace(/\*+$/, '');
                return ip.startsWith(prefix);
            }
            return ip === w;
        });

        if (!allowed) {
            return MyResponse(res, 403, false, 'Forbidden', {});
        }
    }
} catch (e) {
    console.error('Admin whitelist check error:', e);
}
```

### Rate Limit
``` js
const createRateLimiter = require('./app/middlewares/rateLimit');
APP.use('/api', createRateLimiter(Redis));
```