FROM node:18

WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install -g pm2 && npm install

# Copy application files
COPY . .

# Expose ports
EXPOSE 3000 3001

# Start the application
CMD ["pm2-runtime", "start", "npm", "--", "run", "dev"]