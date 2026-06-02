# Search API with TypeScript Frontend + Python Backend

A full-stack web search application with AI capabilities. Features a free web search API (DuckDuckGo) and an intelligent AI assistant that provides detailed answers with source citations.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
  - [Backend Setup (Python)](#backend-setup-python)
  - [Frontend Setup (TypeScript)](#frontend-setup-typescript)
- [Running the Application](#running-the-application)
- [API Endpoints](#api-endpoints)
- [Project Structure](#project-structure)
- [Usage Examples](#usage-examples)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

## Features

- **Free Web Search API** - No API key required (powered by DuckDuckGo)
- **TypeScript Frontend** - Modern React with TypeScript
- **Python Backend** - FastAPI for high performance
- **AI Assistant Mode** - Detailed answers with source citations (RRL format)
- **Conversation Memory** - Maintains chat context
- **Real-time Search** - Live web search results
- **Responsive Design** - Works on desktop and mobile

## Tech Stack

| Layer           | Technology                   |
| --------------- | ---------------------------- |
| **Frontend**    | React 18 + TypeScript + Vite |
| **Backend**     | Python 3.12+ + FastAPI       |
| **Search API**  | DuckDuckGo (via ddgs)        |
| **HTTP Client** | Axios                        |
| **Styling**     | CSS3 (Custom)                |
| **Markdown**    | React Markdown               |

## 📦 Prerequisites

Make sure you have the following installed:

| Requirement             | Version | Check Command       |
| ----------------------- | ------- | ------------------- |
| **Node.js**             | v18+    | `node --version`    |
| **npm**                 | v9+     | `npm --version`     |
| **Python**              | 3.12+   | `python3 --version` |
| **Git**                 | Latest  | `git --version`     |
| **WSL** (Windows users) | 2.0+    | `wsl --version`     |

### For Windows Users (WSL Setup)

This project uses WSL for the Python backend. If you don't have WSL installed:

```bash
# Open PowerShell as Administrator
wsl --install
# Restart your computer after installation
```
