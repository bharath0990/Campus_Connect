# CampusStay - Real-time Student Accommodation & Roommate Matcher

CampusStay is a premium, real-time student housing ecosystem styled with a **Red & White brand identity**. It enables college students to find nearby rooms, view interactive walking routes, match with compatible roommates based on habits, and chat with property owners in real-time.

---

## 🏗️ Project Architecture

```
campus_stay/
├── supabase_backend/         # Supabase Backend configuration
│   ├── schema.sql            # PostgreSQL DDL Table definitions
│   ├── triggers.sql          # PL/pgSQL atomic profile triggers and SLA warnings
│   ├── policies.sql          # Row-Level Security (RLS) policies
│   └── functions/            # Supabase Edge Functions (Deno / TypeScript)
│
├── admin_dashboard/          # Vite + React Administration Panel
│   ├── src/                  # Layout, custom Vanilla CSS module pages
│   ├── index.html            # Core entry layout
│   └── package.json          # Vite configurations + @supabase/supabase-js
│
├── flutter_app/              # Flutter Mobile Application
│   ├── lib/                  # Auth layouts, feed grids, swiping matching cards
│   │   ├── main.dart         # Main entry point (Crimson Red & White themes)
│   │   ├── models/           # Data models (Room, User, Booking, Chat, Message)
│   │   ├── services/         # Supabase auth, DB, realtime chat, and payments
│   │   └── views/            # UI Screens (Login, Map Details, Swipe Matcher, Profile)
│   └── pubspec.yaml          # Project dependency mappings (supabase_flutter, geolocator, flutter_map)
│
├── supabase_setup.sql        # Unified database initialization script
└── README.md                 # Project documentation
```

---

## 📱 Mobile App Features

1. **Student-First Flow**: App launches directly to a **Student Login Screen**.
2. **Flexible Logins**: Tap the three lines (hamburger menu) on the top-left to switch roles (Student, Owner, Admin).
3. **GPS Proximity Sorting**: Automatically fetches student location coordinates (latitude/longitude) and sorts available rooms by distance using a high-precision Haversine formula.
4. **Interactive Routing Map**: Selecting a room shows a map path (OpenStreetMap) drawing a walking route from the student's exact GPS location directly to the property, displaying distance in kilometers.
5. **Real-time Chat**: Fully integrated real-time chat between students and landlords.
6. **Detailed Student Profile**: A stateful profile dashboard where students can update their Name, Phone, Budget range (via slider), Sleep Habits, Dietary Preferences, and Social Status.
7. **SLA-backed Maintenance Tickets**: Students can raise maintenance requests that notify the owner. Ignoring requests results in a lower landlord trust score.

---

## 🛠️ Step-by-Step Setup Guide

### 1. Database Setup (Supabase)
1. Go to your [Supabase Console](https://supabase.com/) and create a new project.
2. Open the **SQL Editor** tab in the sidebar.
3. Open **[supabase_setup.sql](file:///c:/Users/padak/.gemini/antigravity/scratch/campus_stay/supabase_setup.sql)**, copy its contents, paste them into the SQL Editor, and click **Run**.
4. Go to **Authentication -> Providers -> Email** and **turn OFF** the **Confirm email** toggle.

### 2. Configure Flutter Mobile Client
1. Copy the **Project URL** and **`anon` public API key** from your Supabase Project Settings (Settings ⚙️ -> API).
2. Open **[lib/main.dart](file:///c:/Users/padak/.gemini/antigravity/scratch/campus_stay/flutter_app/lib/main.dart#L13-L14)** and replace the credentials:
   ```dart
   await Supabase.initialize(
     url: 'https://YOUR_PROJECT_REF.supabase.co',
     anonKey: 'YOUR_LONG_ANON_PUBLIC_KEY',
   );
   ```
3. Open your terminal in the `flutter_app/` directory and run:
   ```bash
   cd flutter_app
   flutter pub get
   flutter run
   ```

### 3. Run the Admin Dashboard (Optional)
1. Navigate to the `admin_dashboard/` directory.
2. Create a `.env` file containing:
   ```env
   VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   VITE_SUPABASE_ANON_KEY=YOUR_LONG_ANON_PUBLIC_KEY
   ```
3. Run the Vite development server:
   ```bash
   npm install
   npm run dev
   ```

---

## 🔐 Row-Level Security (RLS) & Security Policies
All application database actions conform to Postgres RLS policies:
- **`public.users`**: Select is readable by any authenticated user; Update is allowed only if the user matches the session ID (or is an Admin).
- **`public.rooms`**: Read permission is public to all authenticated accounts; Write operations are restricted to owners and admins.
- **`public.chats` & `public.messages`**: Data streams are private to thread participant UUIDs.
- **`public.bookings` & `public.payments`**: Students can insert requests and view their own transactions; Owners can view bookings made on their rooms.
