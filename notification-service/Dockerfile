FROM node:18-alpine

# Instalar dumb-init para manejo correcto de señales
RUN apk add --no-cache dumb-init

WORKDIR /app

# Copiar archivos de package para aprovechar cache de Docker
COPY package*.json ./

# Instalar dependencias de producción
RUN npm ci --only=production && npm cache clean --force

# Copiar el código fuente
COPY . .

# Crear usuario no root para seguridad
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

# Cambiar a usuario no root
USER nodejs

# Exponer el puerto
EXPOSE 5000

# Variables de entorno por defecto
ENV NODE_ENV=production
ENV PORT=5000

# Usar dumb-init para manejo correcto de señales
ENTRYPOINT ["dumb-init", "--"]

# Comando para iniciar la aplicación
CMD ["node", "src/index.js"]