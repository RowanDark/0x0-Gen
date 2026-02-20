# Sample Data for 0xGen Testing

This directory contains sample output files from various reconnaissance tools. Use these to test the Recon Hub import functionality without needing to run actual tools.

## Files

| File | Tool | Description | Entities |
|------|------|-------------|----------|
| `amass-example.json` | Amass | Subdomain enumeration output | ~25 subdomains, IPs |
| `subfinder-example.txt` | Subfinder | Subdomain list | ~20 subdomains |
| `httpx-example.json` | httpx | HTTP probe results | ~15 URLs with tech |
| `nuclei-example.json` | Nuclei | Vulnerability scan results | ~10 findings |
| `nmap-example.xml` | Nmap | Port scan results | ~5 hosts, ~30 ports |
| `ffuf-example.json` | ffuf | Directory fuzzing results | ~20 endpoints |
| `wayback-example.txt` | waybackurls | Historical URLs | ~30 URLs |
| `shodan-example.json` | Shodan | Host search results | ~5 hosts |

## Usage

1. Open 0xGen Recon Hub
2. Create or select a project
3. Click "Import" button
4. Drag and drop any of these files
5. The parser will auto-detect the format

## Target Domain

All sample data is based on the fictional domain `example-target.com` and its infrastructure. This is safe test data that doesn't represent any real organization.
