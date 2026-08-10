# VYRO

**Vision • You • Reach • Online**
*Your World. Your People. Your Voice.*

A front-end prototype of VYRO — a futuristic social network and messenger — built to match the reference UI in `VYRO_Individual_App_Tabs.pdf`: dark-first glassmorphism, neon cyan/violet/magenta gradients, glowing borders, and fluid motion.

This is a fully-navigable, mobile-first UI implementation with realistic mock data. There is no backend — it's meant to demonstrate the design system and interaction patterns end to end.

## Stack

- React 19 + TypeScript + Vite
- Tailwind CSS v4 (`@tailwindcss/vite`)
- React Router for navigation
- Framer Motion for transitions and micro-interactions
- lucide-react for icons

## Screens implemented

- **Onboarding** — animated splash, login (phone/email/username), signup, interests/follow/privacy setup
- **Home** — stories carousel, feed tabs, post cards with a long-press radial reaction picker
- **Explore** — search, category grid, trending topics, people you may know
- **Profile** — holographic avatar ring, stats, tabbed media grid
- **Create** — radial create menu (Post, Story, Reel, Live, Group, Event, Sell) and a full Create Post editor
- **Notifications** — grouped, filterable notification center
- **VYRO Chat** — Chats / Calls / People / Groups / Settings tabs, 1:1 conversation with text/image/voice-note bubbles, group chat
- **Stories** — full-screen story viewer with progress bars and tap navigation
- **VYRO Live** — live discovery grid and a live viewing room with comments and a gifting sheet
- **Calls** — voice call and video call screens with an in-call control row and PiP self-view

Screens beyond this scope (Wallet, Creator Studio, Marketplace, Events, Privacy Center) are wired into navigation as themed placeholders so the app never dead-ends.

## Development

```bash
npm install
npm run dev
```

```bash
npm run build   # production build
npm run preview # preview the production build
```
