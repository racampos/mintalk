# Solana NFT Search - PoC

A Next.js 14 web application for searching Solana NFTs using keywords, powered by the Helius Digital Asset Standard (DAS) API.

## Features

- 🔍 Keyword-based NFT search
- 🎨 Beautiful, responsive UI with Tailwind CSS
- 📱 Mobile-friendly design
- ⚡ Fast fuzzy matching against known collections
- 🖼️ NFT image display with fallbacks
- 🔗 Direct links to NFT explorers
- 📊 Support for both regular and compressed NFTs

## Quick Start

1. **Get a Helius API key**

   - Sign up at [Helius](https://www.helius.dev/)
   - Create a new project and copy your API key

2. **Set up environment variables**
   Create a `.env.local` file in the project root:

   ```bash
   HELIUS_API_KEY=your_helius_api_key_here
   HELIUS_RPC_URL=https://mainnet.helius-rpc.com
   ```

3. **Run the development server**

   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## How It Works

1. **Keyword Input**: Enter any keyword (e.g., "fox", "hoodie", "gold")
2. **Fuzzy Matching**: The app searches through known collections in `data/collections.json`
3. **Asset Fetching**: Uses Helius DAS API to fetch NFTs from matching collections
4. **Local Filtering**: Applies text filtering on NFT names, descriptions, and attributes
5. **Display**: Shows results in a responsive grid with images and metadata

## Architecture

```
├── app/
│   ├── api/search/route.ts    # Search API endpoint
│   ├── globals.css            # Tailwind styles
│   ├── layout.tsx            # Root layout
│   └── page.tsx              # Main search interface
├── lib/
│   └── helius.ts             # Helius DAS client
├── data/
│   └── collections.json      # Known NFT collections
└── [config files...]
```

## API Endpoints

### GET /api/search

- `q`: Search keyword (required)
- `page`: Page number (default: 1)
- `limit`: Results per page (default: 50, max: 100)
- `includeCompressed`: Include compressed NFTs (default: true)

## Customization

- **Add collections**: Edit `data/collections.json` to include more NFT collections
- **Styling**: Modify Tailwind classes in components
- **Search logic**: Update filtering logic in `app/api/search/route.ts`

## Technologies

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Helius DAS API**

## Next Steps

- Add pagination with "Load More" functionality
- Implement advanced filters (compressed vs regular NFTs)
- Add collection-specific browsing pages
- Implement caching and rate limiting
- Add error boundary components
