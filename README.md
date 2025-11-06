# Futarchy402

A monorepo containing the Futarchy402 project.

## Structure

- `frontend/` - Next.js frontend application

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm

### Installation

Install dependencies for all packages:

```bash
npm install
```

### Development

Run the frontend development server:

```bash
npm run dev
```

The frontend will be available at [http://localhost:3000](http://localhost:3000).

### Building

Build all packages:

```bash
npm run build
```

### Running in Production

Start the production server:

```bash
npm run start
```

## Workspaces

This project uses npm workspaces to manage multiple packages within the monorepo.

To run commands in a specific workspace:

```bash
npm run <script> --workspace=<workspace-name>
```

For example:

```bash
npm run dev --workspace=frontend
```
