# 📚 LMS Backend API

> A complete backend RESTful API for a full-scale Learning Management System (LMS) built professionally using Node.js, Express, PostgreSQL and modern best practices.

---

## 🔥 Overview

This backend provides full backend services for an LMS platform supporting multiple user roles, course management, enrollment tracking, 
content delivery, assessments, and secure file handling. The system is built following clean architecture, proper route separation, 
role-based access control, and modular code structure.

---

## 🚀 Key Features

### 🔐 Authentication & Authorization

* Google OAuth 2.0 (using Passport.js)
* Email & Password authentication (bcrypt hashing)
* JWT-based token system with refresh cycles
* Complete Role-Based Access Control: `Student`, `Instructor`, `Admin`
* Protected routes middleware

### 👥 User Management

* Full user registration and login flow
* Secure password storage with bcrypt
* Profile management (avatar, personal info update)
* Admin control over user roles and access
* Profile endpoint for authenticated users

### 📚 Course & Content Management

* Create, update, delete courses (Instructor role)
* Course approval workflow (Admin role)
* Course categories management
* Modular course structure (Modules → Lessons → Quizzes/Assignments)
* Rich metadata for course descriptions, pricing, thumbnails

### 📝 Enrollment & Progress Tracking

* Student enrollment system
* Enrollment validations & uniqueness checks
* Real-time progress tracking
* Module-level completion tracking

### 📂 File Upload System

* File uploads using Multer (avatars, assignments, course thumbnails)
* Secure file storage with dynamic directories
* Full permission checks before file access
* Download endpoints with proper role validation

### 🧪 Assessment & Grading

* Quiz creation & submission system
* Auto-grading for objective questions
* Assignment submission with file upload
* Grading interface for instructors

---

## 🏗️ Tech Stack

| Layer           | Technology                          |
| --------------- | ----------------------------------- |
| Backend Runtime | Node.js (ESM Modules)               |
| Framework       | Express.js                          |
| Database        | PostgreSQL                          |
| ORM             | pg (node-postgres)                  |
| Authentication  | Passport.js (OAuth + Local), bcrypt |
| Authorization   | Custom Middleware (RBAC)            |
| File Upload     | multer                              |
| Configuration   | dotenv                              |

---

## 📂 Project Structure

```
lms-backend/
├── config/           # Database and Passport configuration
├── controllers/      # Modular route controllers
├── middleware/       # Auth & file upload middleware
├── routes/           # API routes by domain
├── uploads/          # File storage folders
├── server.js         # Server entry point
└── .env              # Environment variables
```

---

## 🔑 API Overview

### Auth Routes

| Method | Endpoint                    |
| ------ | --------------------------- |
| POST   | `/api/auth/register`        |
| POST   | `/api/auth/login`           |
| GET    | `/api/auth/google`          |
| GET    | `/api/auth/google/callback` |
| GET    | `/api/auth/profile`         |
| PUT    | `/api/auth/profile`         |
| POST   | `/api/auth/logout`          |

### Users (Admin)

| Method | Endpoint         |
| ------ | ---------------- |
| GET    | `/api/users`     |
| PATCH  | `/api/users/:id` |
| DELETE | `/api/users/:id` |

### Courses

| Method | Endpoint                   |
| ------ | -------------------------- |
| GET    | `/api/courses`             |
| GET    | `/api/courses/:id`         |
| POST   | `/api/courses`             |
| PATCH  | `/api/courses/:id`         |
| DELETE | `/api/courses/:id`         |
| PATCH  | `/api/courses/:id/approve` |

### Enrollments

| Method | Endpoint                        |
| ------ | ------------------------------- |
| POST   | `/api/enrollments`              |
| GET    | `/api/enrollments/:userId`      |
| PUT    | `/api/enrollments/:id/progress` |

### Modules & Lessons

| Method | Endpoint                 |
| ------ | ------------------------ |
| POST   | `/api/modules`           |
| GET    | `/api/modules/:courseId` |
| POST   | `/api/lessons`           |
| GET    | `/api/lessons/:moduleId` |

### Quizzes & Assignments

| Method | Endpoint                      |
| ------ | ----------------------------- |
| POST   | `/api/quizzes`                |
| POST   | `/api/quizzes/:id/submit`     |
| POST   | `/api/assignments`            |
| POST   | `/api/assignments/:id/submit` |
| PUT    | `/api/assignments/:id/grade`  |

### Files Upload & Download

| Method | Endpoint                                |
| ------ | --------------------------------------- |
| POST   | `/api/files/avatar`                     |
| POST   | `/api/files/course/:courseId/thumbnail` |
| POST   | `/api/files/assignment/:assignmentId`   |
| GET    | `/api/files/download/:filename?type=`   |

---

## 🗃️ Database Schema Overview

Includes fully relational tables with proper foreign key constraints:

* Users
* Courses
* Categories
* Enrollments
* Modules
* Lessons
* Quizzes
* Assignments
* Submissions

---

## 🛠️ Setup Instructions

1️⃣ Clone the repository:

```bash
git clone https://github.com/ahmadh9/lms-backend.git
cd lms-backend
```

2️⃣ Install dependencies:

```bash
npm install
```

3️⃣ Create PostgreSQL database and apply schema.

4️⃣ Create `.env` file:

```env
PORT=5000
DATABASE_URL=postgresql://username:password@localhost:5432/lms_db
JWT_SECRET=your_secret_key
GOOGLE_CLIENT_ID=xxxxx
GOOGLE_CLIENT_SECRET=xxxxx
SESSION_SECRET=session_secret
```

5️⃣ Run server:

```bash
npm run dev
```

---

## ⚠️ Security Practices

* Passwords hashed with bcrypt (salted)
* SQL injection protected via parameterized queries
* File type/size validation
* Role-based access for every protected route
* Proper error handling on all API routes

---

## 📈 Future Improvements

* Email verification system
* Notification system for assignments & grades
* Complete search & filtering system for courses
* Payment gateway integration for paid courses

---

## 👨‍💻 Developer

**Developed by Ahmad Hammad**

For any technical inquiry or support:
📧 [ahmadkhammad95@gmail.com](mailto:ahmadkhammad95@gmail.com)
🐙 [https://github.com/ahmadh9](https://github.com/ahmadh9)

---

