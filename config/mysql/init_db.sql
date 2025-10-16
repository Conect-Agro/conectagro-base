CREATE USER 'replicator'@'%' IDENTIFIED BY 'replication_password';
GRANT REPLICATION SLAVE ON *.* TO 'replicator'@'%';
FLUSH PRIVILEGES;

CREATE USER 'orchestrator_user'@'%' IDENTIFIED BY 'orchestrator_password';
GRANT SUPER, PROCESS, REPLICATION SLAVE, RELOAD ON *.* TO 'orchestrator_user'@'%';
GRANT SELECT ON mysql.slave_master_info TO 'orchestrator_user'@'%'; -- Para Orchestrator
FLUSH PRIVILEGES;

