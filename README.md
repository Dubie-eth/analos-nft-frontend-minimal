# Analos NFT Launcher - Profile NFT System Ready

Clean, minimal frontend for the Analos NFT Launcher with essential features only.

## ✨ Features

- 🔧 **Backend Testing** - Integrated tester for all backend endpoints
- 🏪 **Marketplace** - Clean collection browsing and management
- 🚀 **Clean Architecture** - Minimal dependencies, fast builds
- 🔗 **Backend Integration** - Connected to minimal backend API

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## 🔧 Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_BACKEND_URL=https://analos-nft-backend-minimal-production.up.railway.app
NEXT_PUBLIC_API_URL=https://analos-nft-backend-minimal-production.up.railway.app
```

## 📁 Project Structure

```
frontend-minimal/
├── src/
│   ├── app/                 # Next.js 13+ app directory
│   │   ├── layout.tsx       # Root layout
│   │   ├── page.tsx         # Home page
│   │   └── globals.css      # Global styles
│   ├── components/          # React components
│   │   └── BackendTester.tsx
│   ├── config/              # Configuration files
│   │   └── backend-config.ts
│   └── lib/                 # Utility functions
├── public/                  # Static assets
├── package.json
├── next.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

## 🔗 Backend Integration

This frontend is designed to work with the minimal backend:
- **Backend URL**: `analos-nft-backend-minimal-production.up.railway.app`
- **Program ID**: `7kdBbyZetzrU8eCCA83FeA3o83ohwyvLkrD8W1nMcmDk`

## 🎯 Key Components

### BackendTester
- Tests health endpoint
- Tests IPFS/Pinata connection
- Tests RPC proxy
- Tests webhook status

### Backend Configuration
- Centralized API configuration
- Environment variable support
- Type-safe API calls

## 🚀 Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push

### Manual Deployment

```bash
# Build the project
npm run build

# Deploy to your hosting provider
# Upload the .next folder and other static files
```

## 📝 Development

### Adding New Features

1. Create components in `src/components/`
2. Add pages in `src/app/`
3. Update configuration in `src/config/`
4. Add utilities in `src/lib/`

### Code Style

- Use TypeScript for type safety
- Follow Next.js 13+ app directory structure
- Use Tailwind CSS for styling
- Keep components small and focused

## 🔒 Security

- Environment variables for sensitive data
- No hardcoded API keys
- CORS protection via backend
- Rate limiting via backend

## 📞 Support

For issues or questions:
1. Check the backend tester for connection issues
2. Verify environment variables are set correctly
3. Check browser console for errors

## 🎉 Success Metrics

- ✅ Fast build times (< 2 minutes)
- ✅ No build errors
- ✅ Clean, maintainable code
- ✅ Backend integration working
- ✅ Responsive design
# Trigger deployment from working commit 86f0979
# Build completed successfully - all TypeScript errors fixed
