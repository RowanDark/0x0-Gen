# 0xGen Quick Start Guide

Get 0xGen running in under 5 minutes.

## Prerequisites

- **Node.js 20+** (check with `node --version`)
- **pnpm** (install with `npm install -g pnpm`)

## Installation
```bash
# Clone the repository
git clone https://github.com/RowanDark/0x0-Gen.git
cd 0x0-Gen

# Install dependencies
pnpm install

# Build all packages
pnpm build
```

## Starting the Application

### Option 1: Start Everything (Recommended)
```bash
# Start all services and UIs
pnpm dev
```

This starts:
- Gateway API server on `http://localhost:3100`
- Hub UI on `http://localhost:5173`
- Proxy UI on `http://localhost:5174`
- Repeater UI on `http://localhost:5175`
- Decoder UI on `http://localhost:5176`
- Intruder UI on `http://localhost:5177`
- Recon UI on `http://localhost:3004`
- Mapper UI on `http://localhost:3005`

### Option 2: Start Individual Services
```bash
# Start just the gateway
pnpm --filter @0x0-gen/gateway dev

# Start just the Recon UI (requires gateway)
pnpm --filter @0x0-gen/recon-ui dev
```

## First Steps

### 1. Create a Recon Project

1. Open the Recon UI: `http://localhost:3004`
2. Click the project dropdown in the top left
3. Type a project name and click "Create"

### 2. Import Sample Data

1. Click the **Import** button (or press `Ctrl+I`)
2. Drag and drop a file from the `samples/` directory
3. The parser will auto-detect the format
4. Click **Import** to process the file

### 3. Browse Entities

1. Click **Entities** in the navigation bar
2. Use filters on the left to narrow results:
   - Category (infrastructure, web_assets, etc.)
   - Type (domain, ip, url, etc.)
   - Source (which tool found it)
3. Click any entity to see details

### 4. Visualize with Graph View

1. Click **Graph** in the navigation bar
2. The relationship graph loads automatically
3. Drag nodes to rearrange
4. Scroll to zoom, drag background to pan
5. Click a node to see details

### 5. Run Transforms

1. In Graph view, right-click a node (e.g., a domain)
2. Select a transform:
   - **Subdomain Enumeration** - Find subdomains via crt.sh
   - **DNS Lookup** - Resolve to IP addresses
   - **WHOIS Lookup** - Get registration info
3. New nodes appear connected to the original

### 6. Send to Other Tools

When viewing an entity:
- **Send to Repeater** (URL entities) - Opens Repeater with the URL pre-filled
- **Send to Intruder** (URL entities) - Opens Intruder with the URL as template
- **Add to Mapper** - Adds entity to the current graph

## Keyboard Shortcuts

| Shortcut | Action | Context |
|----------|--------|---------|
| `Ctrl+I` | Open Import dialog | Recon UI |
| `Ctrl+F` | Focus search | Recon UI |
| `Escape` | Close modal/panel | All UIs |
| `Delete` | Delete selected | Mapper |
| `Ctrl+A` | Select all nodes | Mapper |
| `+` / `-` | Zoom in/out | Mapper |

## Service Ports Reference

| Service | Port | URL |
|---------|------|-----|
| Gateway API | 3100 | `http://localhost:3100` |
| Hub UI | 5173 | `http://localhost:5173` |
| Proxy UI | 5174 | `http://localhost:5174` |
| Repeater UI | 5175 | `http://localhost:5175` |
| Decoder UI | 5176 | `http://localhost:5176` |
| Intruder UI | 5177 | `http://localhost:5177` |
| Recon UI | 3004 | `http://localhost:3004` |
| Mapper UI | 3005 | `http://localhost:3005` |
| Proxy Server | 8080 | Configure browser to use this |

## Sample Data

The `samples/` directory contains test data from various tools:

| File | Tool | What it contains |
|------|------|------------------|
| `amass-example.json` | Amass | Subdomains with IPs |
| `subfinder-example.txt` | Subfinder | Subdomain list |
| `httpx-example.json` | httpx | URLs with tech detection |
| `nuclei-example.json` | Nuclei | Vulnerability findings |
| `nmap-example.xml` | Nmap | Port scan results |
| `ffuf-example.json` | ffuf | Directory fuzzing results |
| `wayback-example.txt` | waybackurls | Historical URLs |
| `shodan-example.json` | Shodan | Host search results |

Import these to quickly test the application without running actual recon tools.

## Troubleshooting

### "Cannot find module" errors
```bash
# Rebuild all packages
pnpm build
```

### Port already in use

Check what's using the port:
```bash
lsof -i :3100
```

Kill the process or change the port in the respective `vite.config.ts`.

### SQLite errors on install

The `better-sqlite3` package requires native compilation. Ensure you have:
- **macOS**: Xcode Command Line Tools (`xcode-select --install`)
- **Ubuntu/Debian**: `sudo apt install build-essential python3`
- **Windows**: Visual Studio Build Tools

### Gateway not responding

1. Check if it's running: `curl http://localhost:3100/healthz`
2. Check logs in the terminal where you ran `pnpm dev`
3. Restart with `pnpm --filter @0x0-gen/gateway dev`

## Known Limitations

- **Proxy HTTPS interception** requires installing the CA certificate (see Proxy UI for download)
- **WHOIS transform** may be rate-limited by WHOIS servers
- **Subdomain enumeration** via crt.sh may timeout for large domains
- **Large imports** (>10,000 entities) may be slow

## Getting Help

- Check the [README.md](README.md) for detailed documentation
- Open an issue on GitHub for bugs or feature requests
- Check browser console (F12) for error details

## Next Steps

- Try importing your own recon data from tools you use
- Set up the Proxy to intercept traffic from your browser
- Use Repeater to manually craft and send HTTP requests
- Use Intruder to fuzz parameters and find vulnerabilities
