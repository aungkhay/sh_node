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

### Downline
``` js
const haveDownlineLength3 = await this.redisHelper.getValue(`DOWNLINE_LENGTH_${userId}`);
if (!haveDownlineLength3) {
    const longestDownline = await User.findOne({
        where: {
            relation: { [Op.like]: `${user.relation}/%` }    
        },
        attributes: ['relation'],
        order: [[Sequelize.fn('LENGTH', Sequelize.col('relation')), 'DESC']]
    });
    let downlineLength = 0;
    if (longestDownline) {
        // assume userId is 42 for testing
        const splited = longestDownline.relation.split('/').filter(v => v); // /2/42/53/75/76 => ['2','42','53','75','76']
        const userIdIndex = splited.indexOf(String(userId)); // 1
        // only get Id after userId
        const downlineAfterUser = splited.slice(userIdIndex + 1); // ['53','75','76']
        downlineLength = downlineAfterUser.length; // 3
    }
    if (downlineLength < 3) {
        // remove id 6 from pool
        rewardTypes = rewardTypes.filter(r => r.id != 6);
    } else {
        // No expiry, just set once
        await this.redisHelper.setValue(`DOWNLINE_LENGTH_${userId}`, downlineLength);
    }
}
```