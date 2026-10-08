# ---------------------------------------------------
# Stage 1: Build (Compile TypeScript ke JavaScript)
# ---------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Copy manifest dependensi
COPY package*.json ./

# Install seluruh dependensi untuk proses build
RUN npm install

# Copy source code dan compile TypeScript
COPY . .
RUN npm run build

# ---------------------------------------------------
# Stage 2: Production Runner (Image ramping & aman)
# ---------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Install hanya dependensi produksi (tanpa devDependencies / vitest)
COPY package*.json ./
RUN npm install --omit=dev

# Copy hasil build JavaScript dari stage builder
COPY --from=builder /app/dist ./dist

# Copy migrasi database (jika sewaktu-waktu dibutuhkan)
COPY --from=builder /app/src/db/migrations ./src/db/migrations

# Expose port (default port ms-user: 3002)
EXPOSE 3002

# Jalankan service
CMD ["node", "dist/server.js"]
