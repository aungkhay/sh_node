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