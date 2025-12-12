# Build Angular App
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json yarn.lock ./
RUN npm install -g yarn @angular/cli
RUN yarn install
COPY . .
RUN ng build --configuration production

# Serve with nginx
FROM nginx:stable-alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
