# DashHabit

Habit tracker (Today / Habits / Tasks / Goals / Insights) z kontami dla dwóch osób i trybem **VS** w Insights.
Next.js 15 + Supabase + Tailwind 4 + Framer Motion.

## 1. Supabase

1. Załóż projekt na [supabase.com](https://supabase.com) (darmowy plan wystarczy).
2. **SQL Editor → New query** → wklej skrypt schematu bazy (trzymany lokalnie, poza repo) → **Run**.
3. **Authentication → Sign In / Providers → Email**: wyłącz **Confirm email**, żeby rejestracja działała od razu
   (albo zostaw włączone — wtedy trzeba kliknąć link z maila).
4. **Project Settings → API**: skopiuj `Project URL` i `anon public` key.

## 2. Uruchomienie lokalnie

```bash
cp .env.local.example .env.local   # wklej URL i anon key
npm install
npm run dev
```

Otwórz http://localhost:3000 → **Sign up**. Kolega robi to samo na swoim urządzeniu — każdy ma osobne dane.

## 3. Deploy (żeby działało na telefonie)

1. Wrzuć repo na GitHuba → [vercel.com](https://vercel.com) → **Import**.
2. W **Environment Variables** dodaj `NEXT_PUBLIC_SUPABASE_URL` i `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. W Supabase: **Authentication → URL Configuration → Site URL** = adres z Vercela.
4. Na telefonie: otwórz stronę → *Udostępnij → Do ekranu początkowego* — działa jak aplikacja.

## Jak to działa

- **Freeze tokens** — start 3, +1 za każde 2 „idealne dni” (wszystkie dzienne nawyki zrobione). Zamrożony dzień
  nie przerywa serii i nie liczy się do consistency. Stałe w `src/lib/constants.ts`.
- **VS** — w Insights klikasz **VS** i widzisz swoją consistency obok kolegi (wykres, dni wygrane, ten tydzień).
  Kolega widzi tylko zagregowane procenty, nie nazwy Twoich nawyków (funkcja `get_daily_stats` w SQL).
- Kliknięcie nazwy nawyku w siatce Habits otwiera edycję/usuwanie. Kliknięcie tekstu zadania — edycja.
- **Dni tygodnia** — nawyk dzienny może obowiązywać tylko w wybrane dni (np. siłownia pn/wt/czw/pt/sob).
  Pozostałe dni są szare w siatce, na Today lądują w „Not today” i nie przerywają serii ani nie obniżają procentów.
- **Innube** — wspólna tablica firmy: 7 dni tygodnia (pon–nd) + backlog zadań bez terminu. Zadanie ma notatki,
  osobę przypisaną i termin; zmiany kolegi pojawiają się na żywo. Żeby mieć dostęp, w skrypcie schematu
  dopisz maile kont do członków Innube i uruchom go w Supabase.
