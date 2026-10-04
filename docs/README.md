# ProLink Project Documentation (`docs/`)

## Purpose
Central repository for project specifications, system architecture designs, architectural decision records (ADRs), cross-service API JSON contracts, and academic course reports (DSA, IDS, CN).

## Planned Owner
- **Lead**: P1 (Product / Data Lead)

## Planned Structure & Files
```text
docs/
├── README.md                    Documentation hub index
├── architecture.md              System architecture, Mermaid data flows, and hosting topologies
├── decisions/                   Architectural Decision Records (ADRs) and instructor clarifications
├── api/                         JSON request/response interface contracts across services
└── reports/                     Academic project reports and documentation deliverables
    ├── dsa/                     Data Structures & Algorithms design and benchmark report
    ├── ids/                     Introduction to Data Science analytics and model report
    └── cn/                      Computer Networks protocol implementation and capture analysis
```

## What Will Go Inside
- **`architecture.md`**: Master architecture specification and service boundaries.
- **`decisions/`**: Formally documented decisions, instructor feedback, and technical trade-offs.
- **`api/`**: JSON schema contracts agreed upon by frontend and backend leads before feature implementation.
- **`reports/`**: Comprehensive reports for DSA, IDS, and CN course deliverables.

## How to Run / Preview
- **Markdown & Mermaid**: Use the VS Code extensions recommended in `.vscode/extensions.json` (`bierner.markdown-mermaid` and Markdown Preview Enhanced) to preview `.md` documents with live Mermaid diagrams.
