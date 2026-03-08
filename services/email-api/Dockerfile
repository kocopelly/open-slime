FROM node:22-alpine
WORKDIR /app
COPY package.json .
RUN npm install --omit=dev
COPY index.ts .
EXPOSE 3001
CMD ["node", "--import", "tsx/esm", "index.ts"]
