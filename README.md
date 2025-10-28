This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Environment Setup

Before running the application, create a `.env.local` file in the root directory with the following variables:

```bash
# Google Places API Key (for amenities search)
GOOGLE_PLACES_API_KEY=your_google_places_api_key_here

# Altum AI API Key (for housing market/residential data)
# Get your API key from: https://mopsus.altum.ai
ALTUM_AI_KEY=your_altum_ai_api_key_here
```

See `.env.local.example` for a template.

## Data Sources

This application integrates multiple data sources for comprehensive location analysis:

- **CBS Demographics** (84583NED) - Population and demographic data
- **RIVM Health** (50120NED) - Health statistics
- **CBS Livability** (85146NED) - Livability metrics
- **Politie Safety** (47018NED) - Crime and safety data
- **Google Places API** - Amenities and points of interest
- **Altum AI Interactive Reference API** - Housing market and comparable property data

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
