export interface RepositoryPreset { name: string; url: string; lang: string; desc: string; manifest: string; }

export const repositoryPresets: RepositoryPreset[] = [
    {
      name: 'Next.js 15 Full-Stack SaaS',
      url: 'https://github.com/vercel/next.js',
      lang: 'TypeScript',
      desc: 'Modern full-stack App Router codebase with React 19, Server Actions, Prisma ORM, PostgreSQL, and Tailwind v4.',
      manifest: `{
  "name": "nextjs-saas-starter",
  "dependencies": {
    "next": "^15.1.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@prisma/client": "^6.0.0",
    "@tanstack/react-query": "^5.60.0",
    "tailwindcss": "^4.0.0",
    "lucide-react": "^0.460.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "prisma": "^6.0.0",
    "typescript": "^5.7.0"
  }
}`
    },
    {
      name: 'Python FastAPI Microservice',
      url: 'https://github.com/fastapi/fastapi',
      lang: 'Python',
      desc: 'High performance async REST API backend using FastAPI, Pydantic, SQLAlchemy 2.0, PostgreSQL, and Redis.',
      manifest: `[tool.poetry.dependencies]
python = "^3.11"
fastapi = "^0.115.0"
uvicorn = "^0.32.0"
pydantic = "^2.9.0"
sqlalchemy = "^2.0.35"
asyncpg = "^0.29.0"
redis = "^5.0.0"
celery = "^5.4.0"`
    },
    {
      name: 'Rust Actix-Web High-Throughput Engine',
      url: 'https://github.com/actix/actix-web',
      lang: 'Rust',
      desc: 'Ultra-fast asynchronous API engine in Rust with Actix-web, Diesel ORM, PostgreSQL, and Tokio.',
      manifest: `[package]
name = "rust-actix-engine"
version = "0.1.0"
edition = "2021"

[dependencies]
actix-web = "4.9"
tokio = { version = "1.40", features = ["full"] }
serde = { version = "1.0", features = ["derive"] }
diesel = { version = "2.2", features = ["postgres", "r2d2"] }
tracing = "0.1"`
    },
    {
      name: 'Go Fiber Microservice',
      url: 'https://github.com/gofiber/fiber',
      lang: 'Go',
      desc: 'Lightweight, Express-inspired Go backend service with Fiber v2, GORM, and PostgreSQL.',
      manifest: `module my-go-service

go 1.22

require (
	github.com/gofiber/fiber/v2 v2.52.5
	gorm.io/gorm v1.25.12
	gorm.io/driver/postgres v1.5.9
	github.com/redis/go-redis/v9 v9.6.1
)`
    }
  ];

