# Colgate Marketplace

A closed, identity-verified marketplace built exclusively for Colgate University students.

Designed and implemented end-to-end by Tony Bolivar as a full-stack system focused on authentication, authorization, real-time communication, and transactional integrity.

---

## Overview

Colgate Marketplace is a production-grade web application that enables students to buy and sell goods within a trusted campus network.

The system enforces domain-restricted authentication, row-level security policies, and structured transaction state management to ensure secure peer-to-peer exchanges.

Core problem addressed:
Campus buying/selling is typically fragmented across informal channels (GroupMe, text threads, spreadsheets). This project centralizes listings, messaging, and transaction confirmation into a secure, permissioned platform.

---

## System Design & Architecture

### Identity & Access Control

- Domain-restricted authentication (Colgate email only)
- PostgreSQL Row Level Security (RLS) policies for fine-grained authorization
- Ownership-based access control for listings and conversations
- Admin privilege separation for moderation actions

### Data Modeling

- Normalized relational schema
- Explicit foreign key constraints
- Transaction state machine (listed → pending → completed → archived)
- Review system tied to completed transactions only

### Realtime Communication

- Real-time messaging using Postgres change subscriptions
- Conversation-level isolation
- Optimistic UI updates with server validation

### Transaction Integrity

- Two-sided confirmation handshake before marking a sale complete
- Review eligibility gated by transaction completion state
- Defensive checks against duplicate or invalid state transitions

### Storage & Security

- Authenticated file uploads with scoped access policies
- Listing image isolation by owner
- Server-side validation for all write operations

---

## Key Features

- Email-restricted authentication
- Category-based search and filtering
- Listing CRUD with image uploads
- Real-time buyer/seller messaging
- Two-sided sale confirmation flow
- Reputation system (ratings + reviews)
- Admin moderation dashboard
- Transactional email notifications
- Light/Dark mode

---

## Tech Stack

**Frontend**
- React 18
- Vite
- Tailwind CSS
- shadcn/ui

**Backend**
- Supabase (PostgreSQL, Auth, RLS)
- Supabase Storage
- Postgres Realtime Subscriptions

**Email**
- Resend

---

## Engineering Focus

This project emphasizes:

- Secure multi-tenant system design
- Authorization through database-enforced policies (not just frontend checks)
- Event-driven real-time updates
- Transaction state management
- Building production-style admin tooling
- Designing for trust in a closed ecosystem

---

## Impact

- Provides a centralized marketplace for ~3,000 students
- Enforces identity verification to increase trust
- Demonstrates full ownership of system architecture, database design, and frontend implementation

---

© 2026 Tony Bolivar  
Independent student project · Not affiliated with Colgate University
