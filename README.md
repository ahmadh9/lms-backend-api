# 🎓 LMS Frontend

A fully responsive, role-based frontend interface for a complete Learning Management System (LMS) built using **React.js** and **Material UI**. This frontend connects seamlessly with the [LMS Backend API](https://github.com/ahmadh9/lms-backend-api) and supports multiple user roles: `student`, `instructor`, and `admin`.

---

## 🚀 Overview

The LMS frontend delivers all features expected from a professional e-learning platform:

* Dynamic role-based dashboards
* Course browsing and enrollment
* Lesson navigation and completion tracking
* Interactive quizzes and assignment submissions
* Instructor course creation and grading tools
* Admin control panels

Built using modern React patterns (hooks, context, modular services), the app is designed for maintainability, performance, and scalability.

---

## 👥 Supported Roles

* **Student**

  * Enroll in courses
  * View lessons
  * Submit assignments or quizzes
  * Track progress in real-time

* **Instructor**

  * Create and manage courses
  * Upload lessons (video link, text, or file)
  * Review and grade student submissions

* **Admin**

  * Approve or reject courses
  * Manage users and categories
  * View platform-wide analytics

---

## 🧩 Tech Stack

| Layer      | Technology               |
| ---------- | ------------------------ |
| Frontend   | React.js (Vite / CRA)    |
| UI Library | Material UI (MUI v5)     |
| Routing    | React Router DOM         |
| State Mgmt | React Context + useState |
| HTTP       | Axios                    |
| Auth Flow  | JWT (with context)       |

---

## 🗂️ Project Structure

```
lms-frontend/
├── public/              # Static files and index.html
├── src/
│   ├── pages/           # Page-level components (Login, Dashboard, etc)
│   ├── components/      # Shared UI components (Cards, Tables...)
│   ├── services/        # Axios wrappers for backend API
│   ├── context/         # Auth & role-based logic
│   ├── App.js           # App entry with routing
│   └── index.js         # React DOM rendering
├── .gitignore
├── package.json
└── README.md
```

---

## 🔑 Key Features

### 🧭 Navigation & Layout

* Clean responsive layout
* Protected routes based on role
* Navigation bars update dynamically per user role

### 📚 Courses & Lessons

* Browse courses by category
* Enroll and track your enrolled courses
* Modular structure (Modules → Lessons)
* Video support (YouTube, uploaded .mp4)
* Lesson progress tracking per student

### 📝 Assignments & Quizzes

* Interactive quiz pages
* Auto-scored quizzes with percentage feedback
* Assignment upload (file/text)
* Grading feedback from instructor

### 👨‍🏫 Instructor Tools

* Create/edit/delete courses
* Add modules and structured lessons
* Upload video lessons (external link or file)
* View enrolled students and grade their work

### 🔒 Auth System

* Google OAuth + email/password login
* JWT stored in localStorage
* Role-based UI rendering

---

## 🛠️ Setup Instructions

```bash
1. git clone https://github.com/ahmadh9/lms-frontend.git
2. cd lms-frontend
3. npm install
4. Create a .env file with the backend URL:
```

```env
VITE_API_URL=http://localhost:5000/api
```

```bash
5. npm run dev   # or npm start if CRA
```

---

## 🌐 API Dependency

This project relies on the backend API:
👉 [LMS Backend GitHub Repo](https://github.com/ahmadh9/lms-backend-api)

---

## ✨ Deployment Tips

* Ensure CORS is enabled on backend for frontend domain
* Set correct `VITE_API_URL` for production
* Recommended deployment: [Netlify](https://netlify.com) or [Vercel](https://vercel.com)

---

## 👨‍💻 Developed by Ahmad Hammad

📧 [ahmadkhammad95@gmail.com](mailto:ahmadkhammad95@gmail.com)
🐙 [https://github.com/ahmadh9](https://github.com/ahmadh9)

---

> For backend repo, features and DB schema, see: [LMS Backend Documentation](https://github.com/ahmadh9/lms-backend-api)
