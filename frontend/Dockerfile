FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Run in development mode for now (includes hot reload and proper CSS)
EXPOSE 3000

CMD ["npm", "run", "dev"]
