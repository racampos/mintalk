# Mintalk - AI-Powered NFT Discovery

> **MetaMask Embedded Wallets Hackathon Entry**  
> _Making NFT trading accessible to everyone through conversational AI_

**🚀 [Live Demo at https://mintalk.fun](https://mintalk.fun) | 📱 [GitHub](https://github.com/racampos/mintalk)**

---

## 🎯 The Problem

NFT trading is intimidating for newcomers. Complex wallets, confusing interfaces, and fear of costly mistakes keep millions away from the NFT revolution. What if buying an NFT was as simple as having a conversation?

## 💡 The Solution: Mintalk

**Mintalk** is a revolutionary voice-powered NFT trading platform that combines **MetaMask's Embedded Wallets SDK** with **OpenAI's Realtime API** to create an AI tutor that guides users through their NFT journey - from discovery to purchase.

### 🎭 "Hey, show me some cool ape NFTs under 2 SOL"

### 🤖 "Find me the monkey with laser eyes and gold chain"

### 🎯 "I found it! That's Degen Monke #2847. Want to buy it?"

### ✅ **Done. No wallet complexity. No confusion. Just conversation.**

---

## ✨ Revolutionary Features

### 🎙️ **Voice-First NFT Trading**

- Natural conversation with AI tutor using OpenAI Realtime API
- "Buy the third NFT" or "Show me monkey NFTs under 1 SOL"
- Real-time voice feedback and transaction explanations

### 👁️ **AI Visual Search**

- Describe NFTs visually: "Find the bear with green goggles"
- AI recognizes 275+ NFT visual descriptions across 13 collections
- GPT-4 Vision powered semantic matching
- "Show me the monkey with laser eyes" → "That's Degen Monke #2847!"

### 🔐 **Seamless Social Login** (Powered by MetaMask Embedded Wallets)

- Login with X, Discord, Google - no seed phrases needed
- Automatic wallet creation and management
- Zero-friction onboarding for Web3 newcomers

### 🎯 **Smart Purchase Confirmation**

- AI isolates specific NFTs before purchase
- Visual confirmation prevents costly mistakes
- "Are you sure you want this exact NFT?" safety checks

### 🧠 **Intelligent Balance Management**

- Proactive SOL balance checking before transactions
- Smart error prevention: "Your wallet needs 0.5 SOL for this purchase"
- Educational guidance for insufficient funds scenarios
- Mock mode for safe testing without spending real SOL

### 💰 **Real-Time Floor Price Intelligence**

- Live floor price data from Magic Eden for all 13 curated collections
- Smart price-based recommendations: "Show me NFTs under 1 SOL"
- Market-aware suggestions with actual floor prices
- Budget-conscious NFT discovery with real market context

### 🎭 **Mock Mode Toggle**

- iOS-style toggle for seamless presentation mode
- Keyboard shortcut (Cmd+M) for instant mock mode switching
- Proceeds with transactions even on empty wallets (in mock mode)
- Perfect for hackathon presentations and user onboarding

### 💰 **Complete Trading Suite**

- **Buy NFTs** with voice commands
- **List NFTs** for sale through conversation
- **Portfolio viewing** - "Show me what I own"
- Real-time price checking across 30+ collections

### ⚡ **Advanced Tech Stack**

- **Visual AI Database** - 275+ GPT-4 Vision generated NFT descriptions
- **Real-time Floor Price API** - Live Magic Eden integration for market data
- **Smart caching system** eliminates duplicate API calls
- **Progressive NFT sorting** - listed items appear first
- **Curated collections** - 13 premium Solana NFT collections
- **Proactive error handling** with intelligent balance checking
- **Mock/Live mode switching** for safe testing and real trading
- **Responsive UI** with glassmorphism design

---

## 🎬 User Experience Flow

### **Visual Search Flow:**

```
👤 User: "Find me a monkey with laser eyes"
🤖 AI: "Let me search our visual database..."
🤖 AI: "I found it! That's Degen Monke #2847 - a monkey with red laser eyes and gold chain."

👤 User: "Perfect! Let's buy it"
🤖 AI: "Let me check your balance first... You have 2.5 SOL. Great!"
🤖 AI: "Isolating Degen Monke #2847 for confirmation..."
📺 UI: Shows ONLY "Degen Monke #2847" with golden confirmation border
🤖 AI: "Confirm purchase of Degen Monke #2847 for 0.85 SOL?"

👤 User: "Yes!"
🤖 AI: "Processing transaction on the blockchain..."
🎉 Confetti animation + Solscan transaction link
```

### **Price-Based Discovery Flow:**

```
👤 User: "Show me cool NFTs under 1 SOL"
🤖 AI: "Let me check current floor prices across our collections..."
🤖 AI: "I found several great options under 1 SOL:
      • Degen Monkes (0.01 SOL floor) - Awesome monkey collection!
      • The Goat Club (0.015 SOL floor) - Cool goat club vibes
      • Frogana (0.73 SOL floor) - Stylish frog-themed NFTs
      Which collection interests you most?"

👤 User: "Let's check out the monkeys!"
🤖 AI: "Great choice! Degen Monkes have a very affordable 0.01 SOL floor. Searching now..."
📺 UI: Shows 30 Degen Monke NFTs with prices
```

---

## 🛠️ Technical Innovation

### **MetaMask Embedded Wallets Integration**

```typescript
// Seamless Web3Auth implementation
const { isConnected } = useWeb3AuthConnect();
const { accounts } = useSolanaWallet();
const { signAndSendTransaction } = useSignAndSendTransaction();
```

### **OpenAI Realtime API Tools**

- `search_nfts` - Voice-activated NFT discovery across curated collections
- `find_nft_by_visual_description` - AI visual search with GPT-4 Vision
- `get_floor_prices` - Real-time floor price data from Magic Eden for smart recommendations
- `check_sol_balance` - Proactive wallet balance checking
- `get_mock_mode_status` - Demo vs live mode awareness
- `get_price_summary` - Instant market analysis
- `isolate_nft_for_confirmation` - Visual safety checks
- `buy_nft` + `request_wallet_signature` - Complete purchases

### **Smart Caching Architecture**

- Shared cache between UI and voice tutor
- 70% reduction in API calls to Magic Eden
- Instant voice responses with cached data

---

## 🚀 Quick Start

### 1. **Environment Setup**

```bash
# Required APIs
NEXT_PUBLIC_WEB3AUTH_CLIENT_ID=your_web3auth_client_id
OPENAI_API_KEY=your_openai_api_key
MAGIC_EDEN_API_KEY=your_magic_eden_api_key
HELIUS_API_KEY=your_helius_api_key

# Mock Mode (Perfect for presentations)
NEXT_PUBLIC_MOCK_TRANSACTIONS=true  # Safe mock mode - no real SOL spent
```

### 2. **Installation**

```bash
git clone https://github.com/racampos/mintalk
cd mintalk
npm install
npm run dev
```

### 3. **Experience the Magic**

- Open http://localhost:3000
- Login with your social account (X, Discord, Google)
- Toggle Mock Mode ON for safe exploration (footer toggle or Cmd+M)
- Say: _"Find me a bear with green goggles"_ or _"Show me some cool NFTs under 1 SOL"_
- Watch the future of NFT trading unfold! 🎉

---

## 🏗️ Architecture

```
┌─ MetaMask Embedded Wallets SDK ─┐    ┌─ OpenAI Realtime API ─┐
│  • Social login (X, Discord)    │    │  • Voice recognition   │
│  • Automatic wallet creation    │────│  • AI conversation     │
│  • Transaction signing          │    │  • Tool execution      │
└──────────────────────────────────┘    └────────────────────────┘
                    │                              │
                    └──────── Next.js 14 App ──────┘
                              │
         ┌────────────────────┼────────────────────┐
         │                   │                    │
    ┌─ Magic Eden API ─┐ ┌─ Helius DAS ─┐   ┌─ GPT-4 Vision ─┐
    │  • Buy/Sell      │ │  • NFT Search │   │  • Visual NFT   │
    │  • Floor Prices  │ │  • Metadata   │   │    descriptions │
    │  • Market Data   │ └───────────────┘   │  • 275+ analyzed│
    └──────────────────┘         │          └─────────────────┘
                              │
                       ┌─ Smart Cache ─┐
                       │  • Rate limiting│
                       │  • Shared data  │
                       │  • Balance API  │
                       │  • Floor prices │
                       └─────────────────┘
```

---

## 🏆 Why Mintalk Wins

### **🎯 Perfect Problem-Solution Fit**

Solves the #1 barrier to NFT adoption: complexity

### **🚀 Technical Excellence**

- Cutting-edge AI integration
- Flawless MetaMask Embedded Wallets implementation
- Production-ready architecture with caching & error handling

### **💡 Innovation**

- Voice-controlled NFT trading platform with real-time market intelligence
- AI visual NFT search (275+ descriptions) with GPT-4 Vision
- Smart price-based recommendations using live floor price data
- Revolutionary mock mode for safe user onboarding
- Proactive error prevention with intelligent balance checking

### **🌟 User Impact**

Transforms intimidating NFT trading into casual conversation

### **📈 Market Potential**

Addresses billions of users scared away by Web3 complexity

---

## 🎉 Built for MetaMask Embedded Wallets Hackathon

**Mintalk showcases the true power of MetaMask's Embedded Wallets SDK** - making Web3 accessible to everyone through:

✅ **Seamless onboarding** - Social login eliminates wallet complexity  
✅ **Invisible transactions** - Users focus on NFTs, not gas fees  
✅ **Mass adoption ready** - No crypto knowledge required

**This is the future of Web3 UX. This is Mintalk.** 🎙️✨

---

_Built with ❤️ for the MetaMask Embedded Wallets Hackathon_
