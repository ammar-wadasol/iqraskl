# Iqra School Office

Fee records for the school admin office. Next.js (JavaScript only) + MongoDB Atlas.

## Setup

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in:
   - `MONGODB_URI` – Atlas connection string including the database name (e.g. `/iqra`).
     In Atlas, allow your server's IP under Network Access.
   - `ADMIN_PASSWORD` – password the office uses to sign in.
   - `SESSION_SECRET` – at least 32 random characters (`openssl rand -base64 48`).
   - `APP_TIMEZONE` – defaults to `Asia/Karachi`; decides what "this month" is.
3. `npm run dev` for development, or `npm run build && npm start` for production.

## Pages

- `/` – dashboard: total collected, collected this month, pending fees, students who have not paid this month.
- `/students` – all students with paid / remaining totals, filters (name, student ID, father name, status) and pagination. Add a student from here.
- `/students/[id]` – one student: edit details, record payments, add other fees (books, uniform, stationery…), payment history.
- `/fees` – yearly calendar of monthly fees for every student. Click a month to record a payment for it.

## How fees are calculated

- **Admission fee**: one charge per student, entered when the student is added (total of admission, books, uniform, stationery).
- **Other fees**: any number of extra charges per student.
- **Monthly fees**: every month from the admission month up to the current month (or the month the student left) is due at the student's monthly fee. A month's record is created on its first payment and keeps the fee amount at that time; changing a student's monthly fee only affects months with no payment yet.
- Payments can be partial and are never allowed to exceed what is due. Mistaken payments can be removed from the payment history.
