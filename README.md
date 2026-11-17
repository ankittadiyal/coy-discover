# Coy Discover

Coy Discover is a small dating and profile-discovery demo built for an internship assignment. Users can browse one profile at a time, like or pass on profiles, and view mutual matches. The React frontend communicates with a local Express API, which stores demo profiles and activity in a JSON file.

## Features

- Home, Discover, and Matches tabs.
- Discover profiles one at a time, with Like and Pass buttons.
- Horizontal pointer-based card swipes: right to like and left to pass.
- Swipe feedback and a match celebration when a like is mutual.
- Matches list with profile details and match timestamps.
- Loading, empty, and error states for API-backed views.
- Seeded mock profiles and swipe/match persistence in a JSON file.

## Tech stack

- **Frontend:** React, JavaScript, Vite, CSS.
- **Backend:** Node.js, Express, CORS middleware.
- **Data storage:** Local JSON file (`server/data/db.json`).

## Project structure

```text
coy-discover/
├── client/
│   ├── public/                 # Static frontend assets
│   ├── src/
│   │   ├── assets/             # Frontend assets
│   │   ├── App.jsx             # Tabs, profiles, API calls, and interactions
│   │   ├── App.css             # App styles
│   │   ├── index.css           # Global styles
│   │   └── main.jsx            # React entry point
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
└── server/
    ├── data/
    │   └── db.json             # Seed profiles and persisted demo activity
    ├── routes/
    │   └── api.js              # Feed, swipe, and matches routes
    ├── package.json
    └── server.js               # Express entry point (port 5001)
```

## Prerequisites

- Node.js compatible with Vite 8 (Node.js 20.19+ or 22.12+).
- npm.

## Installation and setup

Install the frontend dependencies:

```bash
cd client
npm install
```

In a separate terminal, install the backend dependencies:

```bash
cd server
npm install
```

No environment file or external database is required for the local demo. The frontend calls the API at `http://localhost:5001`.

## Run the application

Start the backend from the `server` directory:

```bash
npm run dev
```

This runs the Express server with Nodemon at `http://localhost:5001`. To run it without Nodemon, use `npm start`.

Start the frontend in a second terminal from the `client` directory:

```bash
npm run dev
```

Open the local URL printed by Vite (by default, `http://localhost:5173`). Keep both servers running while using the app.

## API

The API is served from `http://localhost:5001`. Responses are JSON and include a `success` boolean. Profile objects returned by the API do not include the internal `likedCurrentUser` field.

### `GET /feed`

Returns profiles that have not yet been swiped on.

Example response:

```json
{
  "success": true,
  "count": 1,
  "profiles": [
    {
      "id": "p01",
      "name": "Aarav Sharma",
      "age": 23,
      "photo": "https://randomuser.me/api/portraits/men/32.jpg",
      "bio": "Coffee lover, weekend explorer and amateur photographer.",
      "location": "Delhi",
      "interests": ["Photography", "Travel", "Coffee"]
    }
  ]
}
```

The `count` and profile list depend on which profiles have already been swiped on.

### `POST /swipe`

Records one like or pass. Send a JSON body with the profile's ID and an action of `like` or `pass`:

```json
{
  "profileId": "p01",
  "action": "like"
}
```

Example response when no match is made:

```json
{
  "success": true,
  "action": "like",
  "isMatch": false,
  "match": null
}
```

When a like is mutual, `isMatch` is `true` and `match` contains the matched public profile.

### `GET /matches`

Returns the mutual matches and their match timestamps.

Example response:

```json
{
  "success": true,
  "count": 1,
  "matches": [
    {
      "id": "p01",
      "name": "Aarav Sharma",
      "age": 23,
      "photo": "https://randomuser.me/api/portraits/men/32.jpg",
      "bio": "Coffee lover, weekend explorer and amateur photographer.",
      "location": "Delhi",
      "interests": ["Photography", "Travel", "Coffee"],
      "matchedAt": "2026-01-15T12:00:00.000Z"
    }
  ]
}
```

## Matching behavior

The demo uses each seeded profile's internal `likedCurrentUser` flag to represent whether that profile has already liked the current user. A match is created when the current user submits a `like` for a profile whose flag is `true`. Passing never creates a match. The frontend displays a match celebration after the swipe API confirms a match.

## JSON database persistence

The backend reads and writes `server/data/db.json` directly. The file contains the seeded profiles, swipe records, and matches. Each successful swipe is written to the file, so activity persists across backend restarts. This is a simple local demo store, not a production database; changes to the JSON file affect the local demo data.
