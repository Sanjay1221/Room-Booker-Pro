# Room Booker Pro

Room Booker Pro is a modern, full-stack application for managing room bookings. Built with TypeScript, React, Vite, and Drizzle ORM on the backend, it offers a responsive UI and robust server-side logic.

## Features

- User authentication and authorization
- Browse and search available rooms
- Create, view, and manage bookings
- Responsive design with accessible components (using Tailwind CSS)
- API built with Node.js and TypeScript
- Database interactions via Drizzle ORM

## Tech Stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS
- **Backend:** Node.js, TypeScript, Express-like server in `server/` folder
- **Database:** SQLite/MySQL (configured via Drizzle)
- **State management & data fetching:** React Query (`src/lib/queryClient.ts`)

## Getting Started

### Prerequisites

- Node.js 18+
- Yarn or npm

### Installation

```bash
# clone repository
git clone https://github.com/yourusername/room-booker-pro.git
cd Room-Booker-Pro

# install dependencies
npm install # or yarn
```

### Development

Start the development server:

```bash
npm run dev
```

This will launch the Vite frontend and the local backend server (see `script/build.ts` for build scripts if needed).

### Building for Production

```bash
npm run build
npm run start
```

## Project Structure

```
client/            # frontend assets and static files
src/               # React application source
  components/      # UI components and reusable hooks
  pages/           # application pages
  lib/             # utilities and query client
server/           # backend code (auth, routes, database)
shared/           # shared schema and routes definitions
```

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

MIT License

## Contact

For questions, reach out to [youremail@example.com](mailto:youremail@example.com).