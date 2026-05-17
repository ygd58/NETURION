# NETURION ⬡

**Confidential AI Agent powered by Fairblock Network**

> End-to-end encrypted AI prompts via Fairblock's conditional decryption infrastructure. Self-hosted LLM, no data leakage.

[![Fairblock](https://img.shields.io/badge/Powered%20by-Fairblock-7c3aed)](https://fairblock.network)
[![Network](https://img.shields.io/badge/Network-Base%20Sepolia-blue)](https://sepolia.base.org)
[![Model](https://img.shields.io/badge/Model-Llama%203.1%208B-orange)](https://ollama.com)

---

## 🇹🇷 Türkçe

### Nedir?
NETURION, kullanıcıların yapay zeka ile şifreli iletişim kurmasını sağlayan bir cApp'tir. Fairblock Network'ün koşullu şifre çözme altyapısı üzerine inşa edilmiştir.

### Nasıl Çalışır?
Kullanıcı → Prompt yazar
↓
Fairblock SDK → Prompt şifrelenir (IBE/HE)
↓
NETURION Node → Llama 3.1 ile işler
↓
Cevap → Şifreli olarak geri döner
↓
Sadece yetkili wallet → Cevabı görebilir

---

## 🇬🇧 English

### What is it?
NETURION is a cApp (confidential application) that enables end-to-end encrypted AI interactions, built on Fairblock Network's conditional decryption infrastructure.

### Tech Stack
| Layer | Technology |
|-------|-----------|
| Privacy | Fairblock StableTrust SDK |
| Frontend | Next.js 15 + ethers.js |
| Backend | Node.js + Express |
| AI Model | Llama 3.1 8B (Ollama) |
| Network | Base Sepolia (84532) |
| Deploy | Vercel + Ubuntu VPS |

### Quick Start

```bash
# Backend (Ubuntu VPS)
cd backend && cp .env.example .env && npm install && npm start

# Frontend (Vercel)
cd frontend && cp .env.example .env.local && npm install && npm run dev
```

---

Built for [Fairblock Confidential Builders Program](https://build.fairblock.network)

**Builder:** [ygd58](https://github.com/ygd58) · Neturionglobal
