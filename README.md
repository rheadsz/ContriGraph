# 🌐 ContriGraph

**AI-powered open source contribution discovery using GraphRAG**

ContriGraph helps developers find the perfect open source issues to contribute to by using AI to analyze GitHub issues and map them to relevant code files using a knowledge graph.

![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![Neo4j](https://img.shields.io/badge/Neo4j-Graph%20DB-008CC1?logo=neo4j)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-06B6D4?logo=tailwindcss)

---

## ✨ Features

### 🤖 AI-Powered Issue Discovery
- **Natural language queries** - Ask "What's a good issue for a beginner?" or "Show me frontend bugs"
- **Smart file extraction** - Qwen2 AI analyzes issue text to identify relevant source code files
- **Intent understanding** - AI extracts your preferences (difficulty, area, type) to find matching issues

### 📊 Graph-Based Knowledge
- **Neo4j graph database** stores relationships between issues, files, labels, and contributors
- **GraphRAG architecture** - Issues connect to Files via `RELATES_TO`, Labels via `HAS_LABEL`, Users via `ASSIGNED_TO`
- **Related issue discovery** - See which other issues touch the same code files

### 🎨 Interactive Visualization
- **Per-issue graph view** - Click "View Graph" on any issue to see its connections
- **Clean SVG tree layout** - Visual map showing Issue → File → Related Issues
- **Clickable nodes** - Click any node to open it on GitHub

### 🏷️ Smart Filtering
- **Availability tracking** - See which issues are available vs claimed
- **Label-based filtering** - Filter by bug, enhancement, documentation, etc.
- **Search** - Full-text search across issue titles

---

## 🏗️ Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Next.js 15    │────▶│  Express API    │────▶│     Neo4j       │
│   Frontend      │     │   Backend       │     │   Graph DB      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌─────────────────┐
                        │  Ollama + Qwen2 │
                        │   Local LLM     │
                        └─────────────────┘
```

### Graph Schema

```
(Issue) ─[:RELATES_TO]─▶ (File)
(Issue) ─[:HAS_LABEL]──▶ (Label)
(Issue) ─[:ASSIGNED_TO]─▶ (User)
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+
- **Neo4j** (local or Aura cloud)
- **Ollama** with Qwen2:7b model

### 1. Clone the repository

```bash
git clone https://github.com/rheadsz/ContriGraph.git
cd ContriGraph
```

### 2. Set up Neo4j

**Option A: Neo4j Desktop**
1. Download [Neo4j Desktop](https://neo4j.com/download/)
2. Create a new database
3. Start the database

**Option B: Neo4j Aura (Cloud)**
1. Create free account at [Neo4j Aura](https://neo4j.com/cloud/aura/)
2. Create a new instance
3. Copy connection URI and credentials

### 3. Set up Ollama

```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pull Qwen2 model
ollama pull qwen2:7b

# Start Ollama server
ollama serve
```

### 4. Configure environment

Create `backend/.env`:

```env
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_password
GITHUB_TOKEN=your_github_token  # Optional, for higher rate limits
```

### 5. Install dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 6. Ingest data

```bash
cd backend
node src/ingest.js
```

This will:
- Fetch issues from configured GitHub repositories
- Use Qwen2 AI to extract relevant file paths
- Store everything in Neo4j as a knowledge graph

### 7. Start the application

```bash
# Terminal 1: Backend
cd backend
node src/server.js

# Terminal 2: Frontend
cd frontend
npm run dev
```

Visit **http://localhost:3000** 🎉

---

## 📁 Project Structure

```
ContriGraph/
├── backend/
│   ├── src/
│   │   ├── ingest.js          # GitHub data ingestion + AI extraction
│   │   ├── server.js          # Express API server
│   │   └── queryProcessor.js  # AI query intent extraction
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx       # Main issues page
│   │   │   └── globals.css    # Theme styles
│   │   └── components/
│   │       ├── issue-graph-modal.tsx  # Graph visualization
│   │       ├── mode-toggle.tsx        # Dark/light theme
│   │       └── ui/                    # shadcn components
│   └── package.json
│
└── README.md
```

---

## 🎯 Usage

### Browse Issues
- View all open issues from configured repositories
- See availability status (green = available, red = claimed)
- Filter by search term or availability

### Ask AI
- Type natural language queries like:
  - "What's a good issue for a beginner?"
  - "Show me frontend bugs"
  - "I want to work on API documentation"
- AI understands intent and filters issues accordingly

### View Graph
- Click "View Graph" button on any issue card
- See visual representation of:
  - **Blue node**: The selected issue
  - **Green node**: Related code file
  - **Purple nodes**: Other issues touching the same file
- Click nodes to open on GitHub

---

## 🛠️ Configuration

### Adding Repositories

Edit `backend/src/ingest.js`:

```javascript
const REPOS = [
  { owner: 'langchain-ai', repo: 'langchain' },
  { owner: 'your-org', repo: 'your-repo' },
];
```

### Adjusting Issue Limits

```javascript
// In ingest.js
const issues = await fetchIssues(owner, repo, 50);  // Fetch 50 issues
const sampleIssues = issues.slice(0, 30);           // Process 30 with AI
```

---

## 🧪 Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS |
| UI Components | shadcn/ui, Lucide Icons |
| Backend | Express.js, Node.js |
| Database | Neo4j (Graph Database) |
| AI/LLM | Ollama + Qwen2:7b |
| Visualization | SVG-based tree layout |

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

## 🙏 Acknowledgments

- [LangChain](https://github.com/langchain-ai/langchain) - For being the example repository
- [Neo4j](https://neo4j.com/) - For the powerful graph database
- [Ollama](https://ollama.com/) - For making local LLMs accessible
- [shadcn/ui](https://ui.shadcn.com/) - For beautiful UI components

---

<p align="center">
  Made with ❤️ for the open source community
</p>
