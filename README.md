# User Service

A small REST API for creating and retrieving users, built with TypeScript, Express 5, PostgreSQL, and Drizzle ORM. Request validation uses `express-validator`, and CORS and JSON body parsing are enabled globally.

## Project structure

```text
user-service/
├── src/
│   ├── app.ts                     # Importable Express app, middleware, and routes
│   ├── server.ts                  # HTTP listener and startup logging
│   ├── db/
│   │   ├── db.ts                  # PostgreSQL connection pool and Drizzle client
│   │   ├── schemas/
│   │   │   ├── index.ts           # Schema exports
│   │   │   └── users.ts           # Users table definition and inferred types
│   │   └── migrations/            # SQL migrations and Drizzle metadata
│   └── modules/
│       └── users/
│           ├── user.routes.ts     # User endpoint registration
│           ├── user.validator.ts  # Email, full name, and UUID validation
│           ├── user.controller.ts # HTTP responses and validation error handling
│           └── user.service.ts    # User database queries
├── tests/
│   ├── modules/users/             # Service, controller, and validator unit tests
│   ├── db/db.test.ts              # Pool and Drizzle initialization unit tests
│   ├── http/app.test.ts           # HTTP wiring checks with a mocked service
│   ├── integration/               # Real PostgreSQL API tests and container lifecycle
│   ├── fixtures/user.ts           # Shared deterministic user record
│   └── server.test.ts             # Server startup unit tests
├── vitest.config.mts              # Test discovery, mocks, and coverage thresholds
├── vitest.integration.config.mts  # Separate Docker integration suite
├── tsconfig.test.json             # Type-checks tests without emitting files
├── drizzle.config.ts              # Drizzle schema, migration, and database configuration
├── index.http                     # Sample requests for an HTTP client extension
├── package.json                   # Dependencies and npm scripts
├── package-lock.json              # Locked dependency versions
├── tsconfig.json                  # TypeScript configuration; output goes to dist/
└── .env                           # Local configuration (ignored by Git)
```

Requests flow through the router, validators, controller, and service before reaching the database. The `users` table stores a generated UUID, unique email, full name, and creation/update timestamps. The API currently supports creating users, listing all users, and looking up a user by ID.

## Prerequisites

- Node.js and npm. TypeScript compilation was checked with Node.js 20.19.5 and npm 10.8.2.
- A running PostgreSQL instance and a database you can connect to.
- PostgreSQL's `createdb` CLI if you use the database creation example below, or a database administration tool of your choice.

Run the following commands from the project root.

## Setup

### 1. Install dependencies

```sh
npm ci
```

### 2. Create a PostgreSQL database

For a local PostgreSQL instance, create a database using an existing PostgreSQL role:

```sh
createdb -h localhost -p 5432 -U postgres user_service
```

Replace `postgres` with your database username. If your database already exists, skip this step.

### 3. Configure environment variables

Create or update `.env` in the project root:

```dotenv
NODE_ENV=development
PORT=3001
DATABASE_URL_DEV=postgresql://postgres:your_password@localhost:5432/user_service
```

Replace the username, password, host, port, and database name with your PostgreSQL connection details. URL-encode special characters in credentials.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL_DEV` | PostgreSQL connection string used by both the application and Drizzle CLI, including when running in production mode. |
| `PORT` | HTTP server port; defaults to `3001` when unset. |
| `NODE_ENV` | Set to `development` for local use. Setting it to `production` enables database SSL with certificate verification disabled in the current implementation. |

The application loads `.env` through `dotenv`. `HOST`, `APP_NAME`, and `APP_VERSION` may appear in an existing `.env`, but the current application does not read them.

### 4. Apply database migrations

Apply the committed migrations to create the `users` table:

```sh
npm run db:push
```

Despite its name, this script runs `drizzle-kit migrate`; it applies migration files rather than pushing the schema directly.

## Run the service

### Development

```sh
npm run dev
```

Nodemon runs the TypeScript application through `ts-node` and restarts it when source files change. With the example configuration, the API is available at `http://localhost:3001`.

### Compile and run

```sh
npm run build
npm start
```

The build compiles `src/` into `dist/`, and `npm start` runs `dist/server.js`. Apply migrations before using the user endpoints. `src/app.ts` exports the Express app without opening a listener; `src/server.ts` starts it.

Keep the full dependency installation for this workflow: `dotenv` is currently listed under `devDependencies` even though the application imports it at runtime. An installation using `npm ci --omit=dev` will omit that required dependency.

## API usage

The following examples assume `PORT=3001`. Substitute your configured port if different.

| Method | Endpoint | Behavior |
| --- | --- | --- |
| `GET` | `/` | Returns `User Service is running`. |
| `POST` | `/api/users` | Creates a user and returns the saved record with HTTP `201`. |
| `GET` | `/api/users` | Returns all users as a JSON array with HTTP `200`. |
| `GET` | `/api/users/:id` | Returns a user with HTTP `200`, or HTTP `404` if no matching user exists. |

### Check the server

```sh
curl http://localhost:3001/
```

This endpoint confirms that the HTTP server responds; it does not check database connectivity.

### Create a user

```sh
curl -X POST http://localhost:3001/api/users \
  -H 'Content-Type: application/json' \
  -d '{"email":"budi@example.com","fullName":"Budi"}'
```

`email` must be a valid, nonempty email address, and `fullName` must be nonempty. The database generates the ID and timestamps when they are omitted. Email addresses must be unique; use a different address when repeating this example.

### List users

```sh
curl http://localhost:3001/api/users
```

### Get a user by ID

Use the UUID returned by the create or list endpoint:

```sh
curl http://localhost:3001/api/users/YOUR_USER_UUID
```

Validation failures return HTTP `400` with an `errors` array. Database or service failures return HTTP `500` with an `error` message; a duplicate email currently returns `500` as well.

The repository also includes `index.http` for manual requests. Its URLs use port `3000`, so update them if you use the default `3001` port. Its sample POST body contains an invalid email address, which exercises validation; use a valid address to create a user.

## npm scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server with automatic restarts. |
| `npm run build` | Compile TypeScript into `dist/`. |
| `npm start` | Start the compiled application. |
| `npm run db:migrate` | Generate SQL migration files from schema changes (`drizzle-kit generate`). |
| `npm run db:push` | Apply generated or committed migrations (`drizzle-kit migrate`). |
| `npm run db:studio` | Open Drizzle Studio to inspect the configured database. |
| `npm test` | Run all tests once. |
| `npm run test:watch` | Re-run tests when files change. |
| `npm run test:coverage` | Run tests and enforce coverage thresholds; write HTML and LCOV reports. |
| `npm run test:integration` | Run API integration tests against a temporary PostgreSQL container (requires Docker). |
| `npm run test:typecheck` | Check application and test TypeScript without emitting files. |

After editing the database schema, generate and review a migration, then apply it:

```sh
npm run db:migrate
npm run db:push
```

To check TypeScript without emitting build files:

```sh
npx tsc --noEmit
```

## Testing

This project uses [Vitest](https://vitest.dev/guide/features) for TypeScript tests, assertions, and mocks, [Supertest](https://github.com/forwardemail/supertest) for HTTP checks, and `@vitest/coverage-v8` for coverage. Vitest and its coverage package are pinned to the same 4.x release to support the project's Node.js 20.19.5 runtime.

Keep tests in the root `tests/` folder, mirroring the source folders, and name them `*.test.ts`. For example, the unit tests for `src/modules/users/user.service.ts` live in `tests/modules/users/user.service.test.ts`. This layout keeps tests discoverable and out of `dist/`, since the production TypeScript configuration includes only `src/`. Shared sample records belong in `tests/fixtures/`; HTTP wiring checks belong in `tests/http/`.

```sh
npm test
npm run test:watch
npm run test:coverage
npm run test:typecheck
```

The tests cover service query inputs and database errors; controller success, validation, not-found, and failure responses; required fields, email formats, and UUID validation; pool SSL settings and connection time zones; default and configured startup ports; and Express routing, JSON parsing, and CORS.

Unit tests mock the database or service boundary. HTTP checks exercise the real app, routes, validators, and controllers with a mocked service. No PostgreSQL instance or `.env` file is needed, and no real database is contacted. Supertest opens temporary local listeners for its HTTP requests.

Coverage includes all TypeScript files in `src/` and requires 100% of statements, branches, functions, and lines. Open `coverage/index.html` after running coverage to inspect the report; `coverage/lcov.info` is available for CI tools. Coverage reports are ignored by Git. The default suite excludes `tests/integration/`; database integration tests run separately as described below.

### PostgreSQL integration tests

Start Docker Desktop (or a supported Docker-compatible runtime), then run:

```sh
npm run test:integration
```

The integration suite uses [Testcontainers' PostgreSQL module](https://node.testcontainers.org/modules/postgresql/), Vitest, and Supertest. Testcontainers packages are pinned to version 11.7.2 for Node.js 20 compatibility. On the first run, Docker downloads the PostgreSQL image and Testcontainers' cleanup image, so startup can take longer. Docker must also be available in CI.

Write tests as `tests/integration/*.integration.test.ts`. `tests/integration/setup.ts` starts a fresh PostgreSQL container for each test file, sets `DATABASE_URL_DEV` to its generated connection URL before importing the application, sets `NODE_ENV=test`, and applies all committed migrations from `src/db/migrations`. It truncates the container's `users` table before each test and closes the connection pool before stopping the container, including when migration or app initialization fails. Integration tests use the real routes, validators, controllers, services, and Drizzle queries.

No pre-existing database or `.env` file is required. The integration database URL is supplied explicitly, so the suite does not use your development database. Test files and tests run sequentially; avoid `it.concurrent` when sharing the file's database.

The default image is `postgres:16-alpine`, matching the local PostgreSQL major version. Match your deployment's PostgreSQL version by setting `TEST_POSTGRES_IMAGE`, for example:

```sh
TEST_POSTGRES_IMAGE=postgres:17-alpine npm run test:integration
```

The integration tests verify migrations, UTC sessions, generated UUIDs and timestamps, persisted user creation, listing and lookup, unknown IDs, validation failures, malformed JSON, and the unique-email constraint. Duplicate emails currently produce HTTP `500`; the test asserts that existing API behavior and checks that the original record remains intact.

## Troubleshooting

- **Database connection fails:** check `DATABASE_URL_DEV`, ensure PostgreSQL is running, and confirm the database exists and your role can access it.
- **The `users` table does not exist:** run `npm run db:push` against the same database configured for the application.
- **Port already in use:** choose another `PORT` in `.env`, restart the service, and update your request URLs.
- **`npm start` cannot find `dist/server.js`:** run `npm run build` first.
- **Creating a user fails with HTTP `500`:** inspect the server logs for the underlying database error, including duplicate email values.
