# ChatGPT Clone

A pixel-perfect ChatGPT clone built with Next.js, featuring AI-powered conversations, file uploads, memory management, and more.

## Features

- 🎨 **Pixel-perfect UI** - Matches ChatGPT's design and user experience
- 🤖 **AI-powered chat** - Uses Groq/Llama models via Vercel AI SDK
- 📁 **File uploads** - Support for images, PDFs, Word docs, and text files
- 🧠 **Memory system** - Contextual conversations with mem0 integration
- 📱 **Responsive design** - Works seamlessly on desktop and mobile
- ♿ **Accessibility** - ARIA compliant with screen reader support
- 🔄 **Real-time streaming** - Live message updates as AI responds
- ✏️ **Message editing** - Edit and regenerate responses
- 💾 **Persistent storage** - MongoDB for chat history and memories
- ☁️ **Cloud storage** - Cloudinary for file management

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **AI**: Vercel AI SDK, Groq API
- **Database**: MongoDB
- **File Storage**: Cloudinary
- **UI Components**: Radix UI, shadcn/ui
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+ 
- MongoDB database
- Groq API key
- Cloudinary account

### Installation

1. Clone the repository:
\`\`\`bash
git clone https://github.com/yourusername/chatgpt-clone.git
cd chatgpt-clone
\`\`\`

2. Install dependencies:
\`\`\`bash
npm install
\`\`\`

3. Set up environment variables:
\`\`\`bash
cp .env.example .env.local
\`\`\`

Fill in your environment variables:
- \`MONGODB_URI\`: Your MongoDB connection string
- \`GROQ_API_KEY\`: Your Groq API key
- \`CLOUDINARY_CLOUD_NAME\`: Your Cloudinary cloud name
- \`CLOUDINARY_API_KEY\`: Your Cloudinary API key
- \`CLOUDINARY_API_SECRET\`: Your Cloudinary API secret

4. Run the development server:
\`\`\`bash
npm run dev
\`\`\`

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/chatgpt-clone)

### Environment Variables for Production

Make sure to set these in your Vercel dashboard:

- \`MONGODB_URI\`
- \`GROQ_API_KEY\`
- \`CLOUDINARY_CLOUD_NAME\`
- \`CLOUDINARY_API_KEY\`
- \`CLOUDINARY_API_SECRET\`

## API Routes

- \`POST /api/chat\` - Send messages to AI
- \`POST /api/upload\` - Upload files
- \`GET /api/chats\` - Get user's chat history
- \`POST /api/chats\` - Create new chat
- \`GET /api/chats/[id]\` - Get specific chat
- \`PUT /api/chats/[id]\` - Update chat
- \`DELETE /api/chats/[id]\` - Delete chat
- \`POST /api/webhooks\` - Handle webhooks

## File Upload Support

Supported file types:
- **Images**: PNG, JPG, JPEG, GIF, WebP
- **Documents**: PDF, Word (.doc, .docx), Text (.txt), CSV, Markdown, JSON

Maximum file size: 10MB

## Memory System

The app includes a sophisticated memory system that:
- Stores conversation context
- Provides relevant memories for better responses
- Manages context window limits
- Supports semantic search (with mem0 integration)

## Accessibility Features

- ARIA labels and roles
- Keyboard navigation support
- Screen reader compatibility
- Focus management
- High contrast support

## Contributing

1. Fork the repository
2. Create a feature branch: \`git checkout -b feature/amazing-feature\`
3. Commit your changes: \`git commit -m 'Add amazing feature'\`
4. Push to the branch: \`git push origin feature/amazing-feature\`
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

