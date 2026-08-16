# 🎓 NIT_Campus_Coder — College Coding & Assessment Platform

A simple, responsive, and production-ready coding platform built for college students and faculty/administrators. Features multi-language code execution with Monaco Editor via the Piston API, Technical MCQs, Live Contest Arena with server-synced countdown timer and anti-cheat tracking, and a comprehensive Admin management dashboard.

---

## 🚀 Key Features

### 👨‍🎓 Student Experience
- **Simple Login**: Sign in with Student ID / Register Number (e.g. `STU001`) and password.
- **Interactive Dashboard**: Track total/solved problems, contest score, daily coding streaks, difficulty breakdowns, and upcoming contests.
- **Problem Catalog**: Search and filter algorithmic problems across 15+ topics (Arrays, Strings, Dynamic Programming, Trees, Graphs, etc.) and difficulties.
- **Monaco Code Editor**: Multi-language support (Python, C, C++, Java, JavaScript) with syntax highlighting, custom inputs, and real-time execution.
- **Piston Code Execution**: Runs code against hidden and public test cases without running student code locally on the Flask server.
- **Submission History**: Detailed breakdown of past verdicts (Accepted, Wrong Answer, Runtime Error, TLE, Compilation Error), execution runtime, and code review.
- **Technical MCQs Section**: Domain-specific Computer Science questions with instant scoring and in-depth explanations.
- **Contest Arena**: Timed competitions with live countdown timer, auto-submission on timer expiry, and browser integrity monitoring (tab switch and copy/paste event logging).
- **Leaderboards**: Real-time rankings for individual contests and global platform standing.

### 🛡️ Administrator Panel
- **Overview Dashboard**: Platform-wide metrics for total students, active problems, MCQs, contests, and live submission streams.
- **Student Management**: Add, edit, delete, enable/disable student accounts, and perform one-click password resets.
- **Problem Authoring**: Create and edit coding challenges with dynamic test case builders and constraints.
- **MCQ Management**: Author 4-option technical MCQs with correct answers and explanations.
- **Contest Manager**: Schedule competitions, set start/end timestamps, assign coding problems and MCQs, publish/unpublish, and review candidate anti-cheat logs.
- **Audit Stream**: Platform-wide audit of all student submissions and source code.

---

## 🛠️ Technology Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Monaco Editor (`@monaco-editor/react`), Lucide Icons, Axios, Canvas Confetti.
- **Backend**: Python 3.10+, Flask, Flask-CORS, PyJWT, Bcrypt, PyMongo, Requests.
- **Database**: MongoDB (Atlas or Local).
- **Code Execution**: Piston API (`https://emkc.org/api/v2/piston`).
- **Deployment**: Render (Backend), Vercel (Frontend), MongoDB Atlas (Database).

---

## 📦 Project Structure

```
College_Coding_Platform/
├── client/                      # React + Vite + Tailwind Frontend
│   ├── src/
│   │   ├── components/          # Reusable UI, Badges, Modals, Monaco Editor, Output Panel
│   │   ├── context/             # AuthContext (Role-based authentication)
│   │   ├── layouts/             # StudentLayout & AdminLayout
│   │   ├── pages/
│   │   │   ├── auth/            # StudentLogin & AdminLogin
│   │   │   ├── student/         # Dashboard, Problems, Solver, MCQs, Contests, Leaderboard, Profile
│   │   │   └── admin/           # Dashboard, Students, Problems, MCQs, Contests, Submissions
│   │   ├── services/            # Axios API client with JWT interceptor
│   │   ├── App.jsx              # React Router configuration
│   │   ├── index.css            # Tailwind & sleek dark design tokens
│   │   └── main.jsx
│   ├── package.json
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── vercel.json
│
├── server/                      # Python Flask Backend
│   ├── models/
│   │   └── db.py                # MongoDB connection & index automation
│   ├── routes/
│   │   ├── auth.py              # Authentication endpoints
│   │   ├── students.py          # Student dashboard & profile
│   │   ├── problems.py          # Problem catalog & details
│   │   ├── submissions.py       # Piston evaluation & testcases runner
│   │   ├── mcqs.py              # Technical MCQs & quiz evaluation
│   │   ├── contests.py          # Contest timers, arena, anti-cheat & leaderboards
│   │   └── admin.py             # Complete Admin CRUD operations
│   ├── services/
│   │   └── piston_service.py    # Multi-language Piston API integration
│   ├── utils/
│   │   ├── security.py          # Bcrypt hashing & JWT utilities
│   │   └── decorators.py        # Token and role authorization guards
│   ├── app.py                   # Main Flask Application
│   ├── config.py                # Configuration management
│   ├── requirements.txt         # Python dependencies
│   ├── seed_data.py             # Database seed script (Admin, 10 Students, 20 Problems, 30 MCQs, 2 Contests)
│   └── render.yaml              # Render deployment configuration
│
└── README.md
```

---

## ⚡ Quick Start Guide (Run Locally)

### 1. Prerequisites
- **Node.js** (v18 or higher)
- **Python** (v3.10 or higher)
- **MongoDB** (Local instance running at `localhost:27017` OR MongoDB Atlas connection URI)

---

### 2. Backend Setup & Seeding

1. Open a terminal and navigate to the `server/` directory:
   ```bash
   cd server
   ```

2. (Optional) Create and activate a virtual environment:
   ```bash
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On Linux/macOS:
   source venv/bin/activate
   ```

3. Install required dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Configure environment variables (or use defaults):
   ```bash
   # Create .env from template
   copy .env.example .env   # On Windows
   # or: cp .env.example .env
   ```

5. **Seed the database** (Populates 1 Admin, 10 Students, 20 DSA Problems with test cases, 30 Technical MCQs, and 2 Contests):
   ```bash
   python seed_data.py
   ```

6. Start the Flask backend server:
   ```bash
   python app.py
   ```
   *Backend will run at: `http://localhost:5000`*

---

### 3. Frontend Setup

1. Open a new terminal and navigate to the `client/` directory:
   ```bash
   cd client
   ```

2. Install Node dependencies:
   ```bash
   npm install
   ```

3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   *Frontend will run at: `http://localhost:5173`*

---

## 🔑 Default Credentials

### 👨‍💼 Administrator
- **Login URL**: `http://localhost:5173/admin/login`
- **Email / Username**: `admin@college.edu` or `admin`
- **Password**: `admin123`

### 🎓 Sample Students
- **Login URL**: `http://localhost:5173/login`
- **Student IDs**: `STU001`, `STU002`, `STU003`, ..., `STU010`
- **Password for all sample students**: `student123`

---

## 🌐 Production Deployment

### 1. Database (MongoDB Atlas)
1. Create a free cluster on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Copy your connection string: `mongodb+srv://<user>:<password>@cluster.mongodb.net/college_coding_db?retryWrites=true&w=majority`.

### 2. Backend (Render)
1. Push this repository to GitHub.
2. In Render, create a **Web Service** pointing to the `server/` root directory.
3. Build Command: `pip install -r requirements.txt`
4. Start Command: `gunicorn app:app --bind 0.0.0.0:$PORT`
5. Set Environment Variables:
   - `MONGO_URI`: Your MongoDB Atlas URI
   - `JWT_SECRET`: A long random secret key
   - `PISTON_API_URL`: `https://emkc.org/api/v2/piston`
   - `CORS_ORIGINS`: Your Vercel frontend URL

### 3. Frontend (Vercel)
1. In Vercel, import the repository and set Root Directory to `client`.
2. Framework Preset: **Vite**.
3. Set Environment Variable:
   - `VITE_API_URL`: Your deployed Render API URL (e.g. `https://college-coding-api.onrender.com/api`)
4. Click **Deploy**.

---

## 📄 License
MIT License. Built for collegiate computer science education and student training.
#   C o d i n g _ P l a t f o r m  
 