FROM node:22-alpine
WORKDIR /app
COPY package.json .
RUN npm install --omit=dev
COPY . .
EXPOSE 3002
CMD ["node", "--import", "tsx/esm", "index.ts"]
