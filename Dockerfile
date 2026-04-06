# syntax=docker/dockerfile:1

FROM node:22-alpine

WORKDIR /app

# Install dependencies first to leverage layer caching.
COPY package*.json ./
RUN npm clean-install

# Copy source and run as non-root for safer self-hosting defaults.
COPY . .
RUN chown -R node:node /app
USER node

EXPOSE 3000

CMD ["npm", "run", "start"]
