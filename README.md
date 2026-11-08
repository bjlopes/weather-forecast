# Brisa — Weather Forecast

A small Next.js weather app with city search, current conditions, and a five-day outlook. Data comes from [Open-Meteo](https://open-meteo.com/) (no API key).

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- Open-Meteo Geocoding + Forecast APIs

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3847](http://localhost:3847).

## Scripts

| Command         | Description                  |
| --------------- | ---------------------------- |
| `npm run dev`   | Dev server on port **3847**  |
| `npm run build` | Production build             |
| `npm run start` | Serve build on port **3847** |
| `npm run lint`  | ESLint                       |

## Features

- Typeahead city search (Open-Meteo geocoding)
- Current temperature, feels-like, humidity, and wind
- Five-day forecast with highs/lows and rain chance
- Sky atmosphere that shifts with weather conditions
