FROM node:20-alpine
WORKDIR /app
COPY package.json yarn.lock ./
RUN npm install -g yarn
RUN yarn install
COPY . .
EXPOSE 3000
CMD ["node", "index.js"]
