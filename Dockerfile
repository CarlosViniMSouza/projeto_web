FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN mkdir -p /app/data

ENV NODE_ENV=development

EXPOSE 3000

CMD ["node", "./script.js"]
