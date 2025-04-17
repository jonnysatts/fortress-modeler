# Fortress Modeler Refactor

A modern, interactive scenario modeling tool for business and financial forecasting. This codebase features a robust Scenario Editor with real-time updates, advanced comparison tools, and a polished, user-friendly UI.

---

## 🚀 Features

- **Scenario Editor:**
  - Real-time, debounced updates to charts and summary tables as you adjust parameters (sliders, etc).
  - Two-column layout: parameter controls, suggestions, scenario controls, charts, and summary tables.
  - Edit scenario name and description at any time.
  - Modern, card-based UI with responsive design and accessible controls.
  - Parameter suggestions with actionable advice and one-click application.

- **Scenario Comparison:**
  - Visual and tabular comparison of scenario vs. baseline forecasts.
  - Revenue, costs, profit, and cumulative views.

- **State Management:**
  - Powered by Zustand for fast, reliable state updates.
  - Calculation engine robustly handles rapid user changes.

- **UI/UX:**
  - Built with React, TypeScript, shadcn-ui, and Tailwind CSS.
  - Loading overlays, animated cards, and polished component styling.

- **Extensible:**
  - Modular design for easy addition of new scenario parameters, charts, or business logic.

---

## 🛠️ Tech Stack

- **Framework:** React + Vite
- **Language:** TypeScript
- **UI:** shadcn-ui, Tailwind CSS
- **State:** Zustand
- **Icons:** Lucide React
- **Build Tooling:** Vite

---

## 🏁 Getting Started

### 1. Clone the repository
```sh
git clone https://github.com/jonnysatts/fortress-modeler-refactor.git
cd fortress-modeler-refactor
```

### 2. Install dependencies
```sh
npm install
```

### 3. Start the development server
```sh
npm run dev
```

### 4. Open in your browser
Visit [http://localhost:5173](http://localhost:5173) (or the port shown in your terminal)

---

## 🧑‍💻 Project Structure

- `/src/components/scenarios/` — Scenario Editor, Comparison, List, Suggestions, and related UI
- `/src/store/` — Zustand store slices for scenarios, models, etc.
- `/src/pages/product/` — Main app views and page-level routing

---

## ✨ Key Concepts

- **Real-Time Modeling:** All parameter changes immediately update forecasts and charts, with debouncing to prevent UI lag.
- **Scenario Management:** Create, duplicate, delete, and edit scenarios. All scenario meta (name, description) is editable post-creation.
- **Suggestions Engine:** Get actionable parameter suggestions based on your changes.
- **Comparison Mode:** Instantly compare any scenario to the baseline with clear visualizations and summary metrics.
- **Robust Calculation Engine:** Designed to avoid flicker, lag, and stale data even under rapid user interaction.

---

## 📝 Contributing

Pull requests and issues are welcome! Please open an issue for bugs or feature requests, or fork and submit a PR for improvements.

---

## 📄 License

This project is private and proprietary to the project owner.

---

## 🙏 Acknowledgments

- Built with ❤️ using React, Zustand, shadcn-ui, and the open-source ecosystem.
- Special thanks to all contributors and testers!

---

For further documentation or architectural details, see the `/docs` directory (if present) or open an issue.

---
