FROM node:18

WORKDIR /app

# Copy package files from the correct directory
COPY server/package*.json ./
RUN npm install

# Copy the server code
COPY server/ .

EXPOSE 3000
CMD ["npm", "start"]