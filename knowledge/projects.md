# Projects — Aniket Kumar Gupta

This file summarizes projects Aniket has discussed. Treat the listed implementation details as the supported facts. Some concepts were planned or explored and must not be presented as completed features unless independently verified.

## 1. FreshMart — Quick-Commerce Grocery Platform

**Overview:** FreshMart is a grocery commerce ecosystem with a web application and a native Android application. It is designed around grocery shopping and quick-commerce workflows.

**Known product areas and features:**
- Grocery categories including produce, dairy, bakery, and daily essentials.
- Product catalog and product detail views.
- Cart and quantity controls.
- Backend API integration.
- Responsive web user interface.
- Native Android app experience.
- Web and mobile experiences intended to work with the same backend ecosystem.

**Technical context:** The project has involved frontend work, backend API integration, and Android application development. Do not assume a particular Android architecture or framework unless confirmed from the repository.

**How to explain it:** Describe the user journey from browsing products to managing cart quantities, and explain how the frontend communicates with the backend. Mention web and Android as separate client experiences.

**Do not invent:** actual delivery times achieved, order volume, revenue, customer count, uptime, or production performance metrics.

## 2. Bike Rental System

**Overview:** A full-stack bike rental application built with the MEN stack and EJS templates.

**Technology stack:**
- MongoDB
- Express.js
- Node.js
- EJS

**Known features / workflows:**
- User and admin workflows.
- Bike listing and management.
- Booking with pickup and return dates / times.
- Booking approval and rejection by admin.
- Bike availability management.
- Admin dashboard and CRUD operations.
- Deployment work involving Render, MongoDB Atlas, and Cloudinary has been discussed.

**Project evolution:**
1. Initial single-franchise rental concept.
2. Expanded with admin workflows and an AI chatbot concept.
3. Broader all-India platform concept, including identity verification and scalability considerations.

Clearly distinguish implemented functionality from later product ideas. Do not state that nationwide operations or identity verification are fully deployed unless verified.

## 3. Gym Management System and GymBot

**Overview:** A gym management application built using the MERN stack, with AI assistant functionality.

**Known technology context:**
- MongoDB
- Express.js
- React
- Node.js
- GenAI integration

**Known product areas:**
- Gym owner, admin, and member workflows.
- Membership plans.
- Member management.
- Authentication.
- Password reset / OTP workflow.
- AI chatbot assistance for gym, fitness, equipment, and schedule-related queries.

**How to explain it:** Focus on how the application supports gym operations and how the chatbot provides a conversational interface for gym-related questions.

**Do not invent:** number of gyms, members, paying customers, or production adoption.

## 4. Document Question-Answering / RAG Project

**Overview:** An AI-powered document question-answering workflow that retrieves relevant information from PDF documents and uses an LLM to formulate answers.

**Known technical work:**
- PDF parsing and text extraction.
- Chunking long documents into smaller passages.
- Embedding generation.
- Vector database storage and retrieval.
- Semantic search.
- Gemini / LLM integration.
- Retrieval-Augmented Generation (RAG).

**One discussed experiment:** A 125-page PDF was split into approximately 266 chunks. Treat this as an experiment-specific figure, not a universal project metric.

**How to explain the architecture:**
1. Extract text from a PDF.
2. Split the text into chunks.
3. Generate embeddings for the chunks.
4. Store embeddings and associated text in a vector database.
5. Embed a user's question and retrieve relevant chunks.
6. Pass the question and retrieved context to the LLM.
7. Return a grounded answer.

**Do not invent:** accuracy percentages, guaranteed hallucination elimination, or measured research-time reductions unless supported by a benchmark.

## 5. CodeBot / AI Coding Assistant

**Overview:** An AI-assisted coding / learning application discussed as a Node.js and EJS project.

**Known technical context:**
- Node.js and Express.
- EJS frontend.
- MongoDB-backed conversation / history concepts.
- Gemini model integration for coding assistance.

Describe only the implementation confirmed in the current repository. Do not claim support for languages, code execution, debugging, or user scale unless verified.

## Project explanation framework
For interview questions, structure the answer as:
1. Problem the project addresses.
2. Main users and use case.
3. Technology stack and why it was used.
4. Request / data flow and architecture.
5. An implementation challenge and how it was handled.
6. What I learned and what I would improve next.

Never claim that a planned feature was shipped. If implementation status is unclear, say: "This was part of the planned direction; I would verify the current repository before calling it implemented."
