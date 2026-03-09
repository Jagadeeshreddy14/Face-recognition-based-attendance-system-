# FaceAuth Attendance System

## Setup Guide

1. **Environment Variables**:
   - `GEMINI_API_KEY`: Automatically handled.
   - `JWT_SECRET`: Set a strong secret for token generation.

2. **Database**:
   - The system uses SQLite (`attendance.db`) for easy setup. It will be created automatically on the first run.

3. **Face Recognition Models**:
   - The app uses `face-api.js`. Models are loaded from a public CDN for the preview, but can be hosted locally in `/public/models`.

4. **Default Credentials**:
   - **Admin**: `admin` / `admin123`
   - **Student**: Register a student first to create a login.

5. **Python Integration (Optional)**:
   - While the web app uses `face-api.js` for browser-based recognition, a reference Python script is provided in `scripts/face_recognition_offline.py` for local desktop use.

## Features
- Real-time face detection and recognition.
- Student registration with face data capture.
- Admin dashboard for student management and reports.
- Student dashboard for attendance tracking.
- Export to Excel and PDF.
