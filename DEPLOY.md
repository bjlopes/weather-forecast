# Deploy to Vercel

## Prerequisites

1. **Vercel account** – Sign up at [vercel.com](https://vercel.com)
2. **GitHub repo** – https://github.com/bjlopes/weather-forecast

## Option A: Deploy via GitHub

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import `bjlopes/weather-forecast`
3. Framework preset: **Next.js** (see `vercel.json`)
4. No environment variables required for the public Alerta Rio feeds
5. Click **Deploy**

Subsequent pushes to `main` redeploy automatically.

## Option B: Deploy via CLI

```bash
npm i -g vercel
vercel login
cd weather-forecast
vercel      # preview
vercel --prod
```
