#!/bin/bash

# Script para monitorear el servicio desde un sistema externo
# Úsalo en un cron job en otro servidor o servicio

SERVICE_URL="https://tu-servicio.onrender.com"
HEALTH_ENDPOINT="/health"
LOG_FILE="/var/log/conectagro-monitor.log"

# Función para logging
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_FILE"
}

# Verificar si el servicio responde
check_service() {
    response=$(curl -s -o /dev/null -w "%{http_code}" "$SERVICE_URL$HEALTH_ENDPOINT" --max-time 10)
    
    if [ "$response" = "200" ]; then
        log_message "✅ Servicio activo (HTTP $response)"
        return 0
    else
        log_message "❌ Servicio inactivo o con problemas (HTTP $response)"
        return 1
    fi
}

# Ping al servicio
ping_service() {
    curl -s "$SERVICE_URL$HEALTH_ENDPOINT" > /dev/null
    if [ $? -eq 0 ]; then
        log_message "📡 Ping exitoso al servicio"
    else
        log_message "🔴 Error en ping al servicio"
    fi
}

# Ejecutar verificación
log_message "🚀 Iniciando monitoreo del servicio"
check_service
ping_service

# Para usar este script en un cron job, agrega esta línea a tu crontab:
# */3 * * * * /path/to/monitor-service.sh

# Esto ejecutará el script cada 3 minutos