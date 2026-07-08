# ProxySQL Setup

## Flow Diagram
```text
+--------------------+
| App Server         |
| Node.js + Sequelize|
+---------+----------+
          |
          | connect to 192.168.100.20:6033
          v
+--------------------+
| ProxySQL           |
| 192.168.100.20     |
| client port: 6033  |
| admin  port: 6032  |
+----+----------+----+
     |          |
     |          +--------------------------+
     |                                     |
     v                                     v
+--------------------+         +--------------------+
| Master MySQL       |         | Replica MySQL      |
| 192.168.100.11     |         | 192.168.100.12     |
+--------------------+         +--------------------+
                               +--------------------+
                               | Replica MySQL      |
                               | 192.168.100.13     |
                               +--------------------+
```

## 1. Install ProxySQL

```bash
sudo tee /etc/yum.repos.d/proxysql.repo > /dev/null <<'EOF'
[proxysql]
name=ProxySQL
baseurl=https://repo.proxysql.com/ProxySQL/proxysql-3.0.x/centos/9
gpgcheck=0
enabled=1
EOF

sudo dnf clean all
sudo dnf makecache
sudo dnf install -y proxysql
sudo systemctl enable --now proxysql
```

## 2. Open Ports
- `6032` = admin
- `6033` = app/MySQL client

```bash
sudo firewall-cmd --permanent --add-port=6032/tcp
sudo firewall-cmd --permanent --add-port=6033/tcp
sudo firewall-cmd --reload
```

## 3. Login to ProxySQL admin
```bash
mysql -u admin -padmin -h 127.0.0.1 -P 6032
```

## 4. Add your MySQL servers
- writer = `192.168.100.11`
- readers = `192.168.100.12`, `192.168.100.13`

```sql
INSERT INTO mysql_servers(hostgroup_id, hostname, port) VALUES (10, '192.168.100.11', 3306);
INSERT INTO mysql_servers(hostgroup_id, hostname, port) VALUES (20, '192.168.100.12', 3306);
INSERT INTO mysql_servers(hostgroup_id, hostname, port) VALUES (20, '192.168.100.13', 3306);
```

## 5. Add app user
```sql
INSERT INTO mysql_users(username, password, default_hostgroup, transaction_persistent, active)
VALUES ('app_user', 'app_password', 10, 1, 1);
```

## 6. Add read/write rule
```sql
-- INSERT INTO mysql_query_rules(rule_id, active, match_digest, destination_hostgroup, apply)
-- VALUES (1, 1, '^SELECT.*', 20, 1);

-- DELETE FROM mysql_query_rules;

INSERT INTO mysql_query_rules(rule_id, active, match_digest, destination_hostgroup, apply)
VALUES (1, 1, '^SELECT.*FOR UPDATE$', 10, 1),(2, 1, '^SELECT.*', 20, 1);

INSERT INTO mysql_replication_hostgroups(writer_hostgroup, reader_hostgroup, comment)
VALUES (10, 20, 'MySQL replication');
```

## 7. Load and save
```sql
LOAD MYSQL SERVERS TO RUNTIME;
SAVE MYSQL SERVERS TO DISK;

LOAD MYSQL USERS TO RUNTIME;
SAVE MYSQL USERS TO DISK;

LOAD MYSQL QUERY RULES TO RUNTIME;
SAVE MYSQL QUERY RULES TO DISK;
```

## 8. Test ProxySQL
```bash
SELECT hostgroup_id, hostname, port, status, weight
FROM mysql_servers
ORDER BY hostgroup_id, hostname;

SELECT hostgroup_id, hostname, port, status
FROM runtime_mysql_servers
ORDER BY hostgroup_id, hostname;

SELECT rule_id, active, match_digest, destination_hostgroup, apply
FROM mysql_query_rules;

SELECT username, default_hostgroup, transaction_persistent, active
FROM mysql_users;

mysql -u app_user -papp_password -h 192.168.100.20 -P 6033
```

## 9. Update Sequelize
> Use ProxySQL only

```env
DB_PROXY_HOST=127.0.0.1
DB_PROXY_PORT=6033
```

Then in Node.js:
- connect to `DB_PROXY_HOST` and `DB_PROXY_PORT`
- remove Sequelize replication