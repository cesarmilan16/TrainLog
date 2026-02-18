FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/trainlog-frontend/browser /usr/share/nginx/html

EXPOSE 4002

CMD ["nginx", "-g", "daemon off;"]
