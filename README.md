# 📚 LMS Backend API

A complete backend RESTful API for a full-scale Learning Management System (LMS) built professionally using **Node.js**, **Express**, and **PostgreSQL**, with modern modular architecture and security best practices.

---

## 🔥 Overview

This backend powers an LMS platform supporting multiple user roles, course management, content delivery, assessments, progress tracking, and secure file handling.

---

## 🚀 Key Features

### 🔐 Authentication & Authorization

* Google OAuth 2.0 (via Passport.js)
* Email/password login (bcrypt hashed)
* JWT-based access control
* Complete Role-Based Access Control (RBAC): `student`, `instructor`, `admin`
* Protected middleware for role-restricted routes

### 👥 User Management

* Register, login, logout
* Update profile + avatar upload
* Admin control over user roles and access

### 📚 Course & Content Management

* Instructors can create, update, delete courses
* Admin approval workflow for course publishing
* Courses organized into `Modules → Lessons`
* Lessons support:

  * Video via URL
  * Video file upload (MP4/WebM)
  * Text content
* Each lesson can be linked with:

  * Assignments (file or text)
  * Quizzes (auto-graded)

### 📝 Enrollment & Progress Tracking

* Students enroll in courses
* Enrollment validations
* Mark lesson as completed
* Module-wise navigation
* Student progress available for instructors

### 📂 File Upload System

* Multer-based secure file upload
* Supports:

  * User avatars
  * Course thumbnails
  * Assignment files
  * Lesson video uploads ✅ *(new!)*
* Files are served from `/uploads/...` with access validation
* Download endpoints include role-based protection

### 🧪 Assessment & Grading

* Quizzes: create + auto-grade + student attempt history
* Assignments: submit text or file
* Instructor grading panel for submissions

---

## 🏗️ Tech Stack

| Layer      | Technology           |
| ---------- | -------------------- |
| Backend    | Node.js (ES Modules) |
| Framework  | Express.js           |
| Database   | PostgreSQL           |
| DB Access  | `pg` (node-postgres) |
| Auth       | Passport.js + bcrypt |
| Upload     | Multer               |
| Env Config | dotenv               |

---

## 📂 Project Structure

```
lms-backend/
├── config/           # DB and passport configs
├── controllers/      # Route logic per domain
├── middleware/       # Auth, upload, error middlewares
├── routes/           # REST API route files
├── uploads/          # All uploaded files
├── server.js         # App entry point
└── .env              # Env variables
```

---

## 🔑 API Overview

### 🔐 Auth

| Method | Endpoint                  |
| ------ | ------------------------- |
| POST   | /api/auth/register        |
| POST   | /api/auth/login           |
| GET    | /api/auth/google          |
| GET    | /api/auth/google/callback |
| GET    | /api/auth/profile         |
| PUT    | /api/auth/profile         |
| POST   | /api/auth/logout          |

### 👤 Users (Admin only)

| Method | Endpoint        |
| ------ | --------------- |
| GET    | /api/users      |
| PATCH  | /api/users/\:id |
| DELETE | /api/users/\:id |

### 📚 Courses

| Method | Endpoint                  |
| ------ | ------------------------- |
| GET    | /api/courses              |
| GET    | /api/courses/\:id         |
| POST   | /api/courses              |
| PATCH  | /api/courses/\:id         |
| DELETE | /api/courses/\:id         |
| PATCH  | /api/courses/\:id/approve |

### 🧾 Enrollments

| Method | Endpoint                       |
| ------ | ------------------------------ |
| POST   | /api/enrollments               |
| GET    | /api/enrollments/\:userId      |
| PUT    | /api/enrollments/\:id/progress |

### 📦 Modules

| Method | Endpoint                |
| ------ | ----------------------- |
| GET    | /api/modules/\:courseId |
| POST   | /api/modules            |
| PATCH  | /api/modules/\:id       |
| DELETE | /api/modules/\:id       |

### 📖 Lessons

| Method | Endpoint                         |
| ------ | -------------------------------- |
| GET    | /api/lessons/module/\:moduleId   |
| GET    | /api/lessons/\:lessonId          |
| POST   | /api/lessons/module/\:moduleId   |
| PUT    | /api/lessons/\:lessonId          |
| DELETE | /api/lessons/\:lessonId          |
| POST   | /api/lessons/\:lessonId/complete |

### 📝 Assignments

| Method | Endpoint                     |
| ------ | ---------------------------- |
| POST   | /api/assignments             |
| POST   | /api/assignments/\:id/submit |
| PUT    | /api/assignments/\:id/grade  |

### 📊 Quizzes

| Method | Endpoint                 |
| ------ | ------------------------ |
| POST   | /api/quizzes             |
| POST   | /api/quizzes/\:id/submit |

### 📂 File Uploads

| Method | Endpoint                                    |             |        |
| ------ | ------------------------------------------- | ----------- | ------ |
| POST   | /api/files/avatar                           |             |        |
| POST   | /api/files/course/\:courseId/thumbnail      |             |        |
| POST   | /api/files/assignment/\:assignmentId        |             |        |
| POST   | /api/files/lesson/video                     |             |        |
| GET    | /api/files/download/\:filename?type=avatars | assignments | videos |

---

## 🗃️ Database Schema (Relational)

* `users` – includes role and profile info
* `courses` – linked to instructors
* `modules` – belongs to course
* `lessons` – linked to module
* `quizzes` – linked to lesson
* `assignments` – linked to lesson
* `enrollments` – tracks student-course link
* `submissions` – tracks assignment/quiz attempts
* `quiz_submissions` – tracks each student's quiz submission and score


---

## 🛠️ Setup Instructions

```bash
1. git clone https://github.com/ahmadh9/lms-backend.git
2. cd lms-backend
3. npm install
4. Create PostgreSQL DB + apply schema
5. Create `.env` file:
```

```env
PORT=5000
DATABASE_URL=postgresql://username:password@localhost:5432/lms_db
JWT_SECRET=your_secret
SESSION_SECRET=your_session_secret
GOOGLE_CLIENT_ID=xxxx
GOOGLE_CLIENT_SECRET=xxxx
```

```bash
6. npm run dev
```

---

## 🔐 Security Highlights

* Passwords hashed with `bcrypt`
* SQL Injection protected (parameterized queries)
* Role-based access enforced on all routes
* File type + size validation with Multer
* Only enrolled students & instructors can access content

---

## 📈 Future Enhancements

* Email verification system
* Notifications for assignment deadlines and grades
* Search & filtering
* Stripe payment integration (for premium courses)

---

## 👨‍💻 Developer

Developed with ♥ by **Ahmad Hammad**

📧 [ahmadkhammad95@gmail.com](mailto:ahmadkhammad95@gmail.com)
🐙 [github.com/ahmadh9](https://github.com/ahmadh9)
