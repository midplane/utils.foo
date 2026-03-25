# utils.foo

A collection of free, client-side utility tools for developers. All processing happens in your browser - no data is sent to any server.

🔒 **Privacy First** - Client-side only, ads-free, no registration required  
⚡ **Fast** - Instant processing with no server round-trips  
🎨 **Modern UI** - Built with React and Tailwind CSS

## 🛠️ Available Tools

### Text & Encoding
- **Base64 Encoder/Decoder** - Encode and decode Base64 text data
- **URL Encoder/Decoder** - Encode and decode URLs
- **Hash Generator** - Generate MD5, SHA-1, SHA-256, SHA-512 hashes

### Data Processing
- **JSON Formatter** - Prettify, minify, query, escape, and unescape JSON
- **Pivot Table** - Create pivot tables from CSV data
- **Anomaly Detection** - Detect anomalies using statistical analysis
- **Text Diff** - Compare two text or code snippets side-by-side
- **JSON Diff** - Compare two JSON snippets

### Converters
- **Epoch Converter** - Convert between epoch time and human-readable dates
- **JS to JSON** - Convert JavaScript objects to JSON format

### Security & Development
- **JWT Decoder** - Decode and inspect JSON Web Tokens
- **Java Thread Dump Analyzer** - Analyze Java thread dumps with detailed stack trace viewing

### QR Codes
- **QR Code Generator** - Generate QR codes as SVG/PNG
- **QR Code Decoder** - Decode QR codes from images

### Visualization
- **Mermaid Diagrams** - Create and visualize diagrams using Mermaid syntax
- **JSX Visualizer** - Live JSX playground with formula evaluator and variable sweep charts

### External Links
- **Tree Generator** - Generate ASCII folder structure diagrams (tree.nathanfriend.io)
- **Regex Tester** - Test regex expressions from different languages (regex101.com)

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/midplane/utils.foo.git

# Navigate to project directory
cd utils.foo

# Install dependencies
npm install
```

### Development

```bash
# Start development server
npm run dev

# Open http://localhost:5173 in your browser
```

### Build

```bash
# Create production build
npm run build

# Preview production build locally
npm run preview
```

### Linting

```bash
# Run ESLint
npm run lint
```

## 🏗️ Tech Stack

- **Framework**: React 18 with Vite
- **Routing**: React Router v6
- **Styling**: Tailwind CSS
- **Code Editor**: Monaco Editor (VS Code's editor)
- **Charts**: ECharts
- **Icons**: Lucide React
- **QR Codes**: qrcode.react & jsQR
- **Data Processing**: PapaParse (CSV), crypto-js (hashing)
- **SEO**: React Helmet Async
- **Analytics**: React GA4 (Google Analytics)

## 📁 Project Structure

```
utils.foo/
├── public/           # Static assets
├── src/
│   ├── assets/       # Images and other assets
│   ├── components/   # Reusable React components
│   ├── hooks/        # Custom React hooks
│   ├── pages/        # Page components for each utility
│   ├── utils/        # Utility functions
│   ├── App.jsx       # Main app component with routing
│   ├── main.jsx      # Application entry point
│   └── index.css     # Global styles
├── index.html        # HTML template
└── vite.config.js    # Vite configuration
```

## 🔐 Privacy

All utilities run entirely in your browser. No data is sent to any server or third party. Your data never leaves your device.

## 📄 License

This project is open source and available under the MIT License.

## 🤝 Contributing

Contributions are welcome! Feel free to submit issues and pull requests.

## 🌐 Live Demo

Visit [utils.foo](https://utils.foo) to try it out!
