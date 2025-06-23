
# 📚 LMS Backend API

A secure and modular RESTful API built with **Express.js** and **PostgreSQL** to power a full-featured Learning Management System (LMS).

This backend supports multiple user roles (`student`, `instructor`, `admin`) with logic for authentication, course management, assignments, quizzes, progress tracking, and more.

---

## 🚀 Features

- JWT + Google OAuth authentication
- Modular routing with controllers
- Role-based access and session handling
- Course creation, approval, and enrollment
- Assignments, quizzes, and lesson delivery
- File uploads and review system
- Real-time progress tracking
- PostgreSQL relational database
- Built-in test route to check DB connectivity

---

## 🔐 Auth System

- Login via Google OAuth 2.0 (Passport.js)
- Email/password login supported
- Sessions handled using `express-session` + `cookie-parser`
- JWT for protected routes

---

## 🧩 Tech Stack

| Layer         | Tech                    |
|---------------|-------------------------|
| Server        | Node.js + Express.js    |
| Database      | PostgreSQL              |
| Auth          | Passport.js + JWT       |
| ORM / Query   | `pg` Node driver        |
| Session Mgmt  | express-session         |
| Middleware    | cors, dotenv, cookie-parser |
| File Uploads  | `express.static` (uploads folder)

---

## 📁 Folder Structure

```
lms-backend-api/
├── config/             # DB connection & passport config
├── controllers/        # Request handlers
├── middleware/         # Auth & error handling
├── routes/             # Express routers for all entities
├── uploads/            # Static folder for uploaded files
├── .env                # Environment variables
├── package.json
└── server.js
```

---

## 📦 Available Routes

| Base Path         | Description                        |
|-------------------|------------------------------------|
| `/api/auth`       | Login, register, Google OAuth      |
| `/api/users`      | User info, role management         |
| `/api/courses`    | Create, approve, enroll            |
| `/api/modules`    | Course modules                     |
| `/api/lessons`    | Lesson content (text/video)        |
| `/api/quizzes`    | Quiz creation & evaluation         |
| `/api/assignments`| Submit/grade assignments           |
| `/api/enrollments`| Student-course linking             |
| `/api/categories` | Course categories                  |
| `/api/files`      | Upload and serve files             |
| `/api/progress`   | Track lesson completion            |
| `/api/analytics`  | Admin analytics overview           |
| `/api/reviews`    | Course reviews                     |
| `/api/search`     | Search engine                      |

---

## 🛠️ Setup Instructions

```bash
1. git clone https://github.com/ahmadh9/lms-backend-api.git
2. cd lms-backend-api
3. npm install
4. Create a `.env` file and add:
```

```env
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_USER=youruser
DB_PASSWORD=yourpassword
DB_NAME=lmsdb
GOOGLE_CLIENT_ID=your_google_id
GOOGLE_CLIENT_SECRET=your_google_secret
SESSION_SECRET=your_session_key
```

```bash
5. npm run dev   # or: node server.js
```

---

## ✅ Test Route

To confirm API & DB connection:

```http
GET http://localhost:5000/api/test
```

Response:
```json
{ "message": "✅ API Connected", "time": "..." }
```

---

## 👨‍💻 Developed by Ahmad Hammad

📧 ahmadkhammad95@gmail.com  
🔗 https://github.com/ahmadh9

---

> For frontend project: [LMS Frontend Repository](https://github.com/ahmadh9/lms-frontend)
