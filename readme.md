# Langchain JS Samples
Simple projects built with Langchain JS, for educational copy-pasting/referencing

## First time setup
The project assumes you have a working local Ollama setup, and that gemma3 has been made available on that Ollama setup.

1. Install Ollama: https://ollama.com/download
2. Run `ollama run gemma3` at least once to setup gemma3
3. Run `npm ci` in this repo's root to install necessary Node packages

## Project Legend
1. Chatbot
   - `npx tsx src/chatbot`
   - A basic chatbot that continously takes user input and returns responses from an LLM
   - <img src="src/chatbot/promo.png">


2. Resume Parser
   - `npx tsx src/resume-parser`
   -  An intelligent resume parser, that takes an unstructured document (e.g: a PDF) and returns a structured JSON describing a candidate (e.g: an object with fields such as 'name', 'email', 'workExperience', 'education', etc), with full type validation via Zod.
   - <img src="src/resume-parser/promo.png">