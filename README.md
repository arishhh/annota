# Agency Feedback Tool

A Next.js SaaS starter for a B2B agency feedback platform.

## Features

- **Next.js 15 (App Router)**
- **TypeScript**
- **Tailwind CSS**
- **Clean Folder Structure**

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables:
   - Copy `.env.example` to `.env.local`
   - Fill in the required variables

### Running the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

- `src/app/`: Next.js App Router (pages and layouts)
- `src/components/`: Reusable UI components
- `src/lib/`: Helper functions, utilities, and database logic
- `public/`: Static assets

## Environment Variables

| Variable       | Description                        | Default                 |
| -------------- | ---------------------------------- | ----------------------- |
| `DATABASE_URL` | Connection string for the database | -                       |
| `APP_URL`      | Base URL of the application        | `http://localhost:3000` |

## License

MIT
