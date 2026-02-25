# Colgate Marketplace

A marketplace web app for Colgate University students.

## Stack

- **Framework**: React 18 + Vite
- **Styling**: Tailwind CSS v3 + shadcn/ui (Default style, Slate base color)
- **Backend**: Supabase (auth + database)
- **Deployment**: Vercel

## Commands

```bash
npm run dev      # Start dev server at http://localhost:5173
npm run build    # Production build
npm run preview  # Preview production build locally
```

## Project Structure

```
src/
  components/ui/   # shadcn/ui components (Button, Card, Input, ...)
  lib/
    supabase.js    # Supabase client singleton
    utils.js       # cn() helper for class merging
  App.jsx
  main.jsx
  index.css        # Tailwind directives + shadcn CSS variables
```

## Environment Variables

Copy `.env.example` to `.env.local` and fill in your Supabase credentials:

```
VITE_SUPABASE_URL=       # From Supabase project settings
VITE_SUPABASE_ANON_KEY=  # From Supabase project settings > API
```

For Vercel deployment, add these same variables in the Vercel dashboard under Project Settings > Environment Variables.

## Import Alias

Use `@/` to import from `src/`:

```js
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
```

## Adding shadcn Components

```bash
npx shadcn@latest add <component-name>
```
