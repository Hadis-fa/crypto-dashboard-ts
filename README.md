# crypto-dashboard-ts

A small, end-to-end **TypeScript** project:  
- **Backend:** Node.js + **Express** API that serves live crypto prices and a Simple Moving Average (SMA) using the public **CoinGecko** API. Includes a lightweight **TTL cache** to reduce latency and API calls.  
- **Frontend:** **React + TypeScript** (Vite) dashboard that displays prices for selected tickers and lets you compute an N-day SMA with one click.
