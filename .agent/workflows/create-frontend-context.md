---
description: Create context and important information from the whole frontend project for the AI to have an entrypoint and understanding where everything is and how it works
---

@frontend

## Role
Act as a **Senior Vue.js Architect & Technical Lead**.

## Objective
Analyze the current Vue.js 3 codebase and generate a comprehensive `FRONTEND_CONTEXT.md` file. This file will serve as the "Source of Truth" for an AI developer to quickly understand the project's structure, architectural patterns, and design philosophy without needing to re-scan every file.

## Analysis Instructions
1.  **Directory Mapping**:
    - Scan the `frontend` directory structure.
    - Ignore generated/build/vendor directories such as `dist`, `node_modules`, and asset batch scratch folders.
    - Explain the specific purpose of folders like `components`, `views` (if present), `stores`/`pinia`, `composables`, `services`, and `assets`.
    - Include notable domain-specific folders and files such as `components/game`, `data`, `types`, `utils`, and `public/assets/units`.
2.  **Tech Stack & Configuration Identification**:
    - Build Tool: Identify if it's Vite or Webpack.
    - Language: Check for TypeScript usage and strictness.
    - State Management: Identify Pinia, Vuex, or usage of `reactive`/`ref` for global state.
    - Styling: Detect Tailwind, SCSS, Vanilla CSS, or CSS modules.
    - Runtime Integration: Identify WebSocket/STOMP usage, REST endpoints, environment variables, and dev-server proxying.
3.  **Architectural Patterns**:
    - **Component Style**: Determine if the project uses `<script setup>`, Options API, or Composition API.
    - **Data Flow**: Explain how data moves from the API/Backend -> State -> Components.
    - **Logic Sharing**: Check for the use of Composables (hooks) vs Utility functions.
    - **Game Modes & Assets**: Explain how One Piece/Pokemon modes influence title/favicon, trait loading, icon paths, unit assets, and gallery data.
    - **Combat Visuals**: Cover the combat animation pipeline, including event normalization, `CombatEffectsCanvas`, `AttackAnimation`, and the development-only ultimate gallery route. Follow the animation isolation rules in `AGENTS.md` when deciding which source files to read.

## Output Requirements (The `FRONTEND_CONTEXT.md` File in the /frontend folder)
The generated file must contain:
1.  **High-Level Summary**: What the application is and its primary goal.
2.  **Tech Stack Table**: Core libraries (Vue, Router, Pinia, etc.) and versions.
3.  **folder-structure.md**: A detailed tree view with comments explaining what belongs where.
4.  **Key Architectural Decisions**:
    - How usage of Global State is handled.
    - The strategy for API communication (e.g., "Services pattern" or "Direct Axios in components").
    - Component design rules (e.g., "Smart vs. Dumb" components).
5.  **Important File Paths**: Locations of `src/main.ts`, `src/App.vue`, router or route-like view switching, main style definitions, game-mode data, combat visual components, and asset utilities.

## Constraint
The output must be technically dense and focused on **intent** and **mechanism**. Do not include generic tutorial text; focus solely on *this* specific project's implementation details.
