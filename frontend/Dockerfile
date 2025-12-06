FROM node:20-alpine

WORKDIR /app

# Feature 025: Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY package*.json ./

RUN npm install

COPY . .

# Feature 025: Set correct permissions
RUN chown -R nextjs:nodejs /app

# Feature 025: Switch to non-root user
USER nextjs

# Run in development mode for now (includes hot reload and proper CSS)
EXPOSE 3000

CMD ["npm", "run", "dev"]
