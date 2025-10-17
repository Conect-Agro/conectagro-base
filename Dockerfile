FROM node:18

WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./
RUN  npm install

# Copy application files
COPY . .

# Expose ports
EXPOSE 3000 3001

# Start the application
CMD ["start", "npm", "--", "run", "dev"]
