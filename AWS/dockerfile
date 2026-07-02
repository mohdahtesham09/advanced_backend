FROM node

WORKDIR /app

copy package*.json ./
RUN npm install
COPY . .

CMD ["node", "index.js"]