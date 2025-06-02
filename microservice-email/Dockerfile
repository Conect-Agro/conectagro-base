FROM node:18-alpine

WORKDIR /app

# Copiar los archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar el resto de archivos de la aplicación
COPY . .

# Comando para iniciar el servicio
CMD ["node", "server.js"]