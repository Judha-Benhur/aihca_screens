# AIHCA Screens

A collection of **ready-to-plug React Native (Expo) screens** for the AIHCA app. Each screen follows a clean, scalable pattern intended to work with **React Navigation**, **AsyncStorage** caching, and **Google Sheets / Apps Script JSON endpoints**.

> This repo currently includes screens like `HomeScreen`, `MapViewerScreen`, `QuizScreen`, `SyllabusScreen`, `PreviousPapersScreen`, `Blog/News`, `Bookmarks`, `Notes`, `Pottery`, `Coin`, `DynastyTimeline`, `PhilosophicalSchools`, `Inscriptions`, `VideoLecture`, `Compass`, `Stones`, `ScienceTech`, `Guilds`, `Professor`, `Resources`, `EducationalReport`, `Weaponry`, `About`, and `Splash` (see file list).  [oai_citation:0‡GitHub](https://github.com/parthakshay/aihca_screens)

---

## ✨ What this is

- **Screen-level components only** – you import them into your app’s `navigation/` and wire up routes.
- **Offline-first friendly** – designed to be wrapped with your data services and AsyncStorage cache.
- **Dark-mode ready** – prefers theme-prop driven colors/tokens.
- **Data-agnostic** – fetch from your **Google Sheets / Apps Script** endpoints or local JSON fallback.

---

## 📁 Files in this package

> The repo is a flat set of screen files (e.g. `HomeScreen.js`, `MapViewerScreen.js`, `QuizScreen.js`, …). Import them directly into your app.  [oai_citation:1‡GitHub](https://github.com/parthakshay/aihca_screens)

Key screens (non-exhaustive):
- Home, Splash, About
- Syllabus, PreviousPapers, Notes, ReferenceBooks, VideoLecture
- Blog/News, Bookmarks
- MapViewer (Div → Period → Subperiod filters, clustering-ready)
- Quiz (flashcards + timed reveal)
- Pottery, Coins, Dynasties, PhilosophicalSchools, Inscriptions
- Guilds, Science & Tech, Stones, Weaponry, Resources, Professor, EducationalReport, Compass
