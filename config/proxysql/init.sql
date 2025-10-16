-- Crear usuario monitor
CREATE USER 'monitor'@'%' IDENTIFIED BY 'monitor';
GRANT USAGE, REPLICATION CLIENT ON *.* TO 'monitor'@'%';

-- Crear usuario para la aplicación
CREATE USER 'app_user'@'%' IDENTIFIED BY 'app_password';
GRANT ALL PRIVILEGES ON conectagro.* TO 'app_user'@'%';

FLUSH PRIVILEGES;