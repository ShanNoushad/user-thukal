# Thukal Customer Website

Customer-facing Next.js app for the Thukal clothing brand. JavaScript, App Router, plain CSS, Firebase Auth/Firestore and Cloudinary unsigned uploads.

## Run locally
1. Install Node.js 20.9+.
2. Run `npm install`.
3. Copy `.env.local.example` to `.env.local` and fill in Firebase and Cloudinary values.
4. Run `npm run dev`.
5. Open http://localhost:3000.

## Firebase
- Create a Firebase project and register a Web app.
- Enable Authentication > Email/Password.
- Create a Firestore database.
- Publish `firestore.rules` in Firestore Rules.
- Create a `products` collection. Suggested fields: `name` (string), `price` (number), `category` (string), `description` (string), `image` (string URL), `sizes` (array), `isActive` (boolean).
- Product documents with `isActive: true` appear in the customer collection.

## Cloudinary
Create an unsigned upload preset in Cloudinary settings. Restrict formats to images and configure a reasonable upload size limit. Add cloud name and preset name to `.env.local`.

## Firestore structure
- `products/{productId}`: public catalogue; written by admin application.
- `users/{uid}`: customer profile and `address` object.
- `users/{uid}/notifications/{notificationId}`: notification records with `title`, `message`, `read`, `createdAt`.
- `bookings/{bookingId}`: booking requests.

## Important implementation notes
- The current starter creates a basic booking with the first available product size and quantity 1. A dedicated product detail/selection modal can be added when the admin product schema and booking workflow are finalized.
- If a customer has no saved address, the customer is directed to Profile to add one, then can return and book again.
- Firestore rules prevent customers from writing products, creating notifications, or changing booking status. Admin-side writes should use a trusted Firebase Admin SDK environment, not expose service account credentials in the browser.
- For production, further tighten profile field validation and booking field validation, and test all rules in the Firebase Emulator Suite.
- Add image files yourself under `public/images/`: `hero.jpg` is the landing hero. Product images are supplied by the Firestore `image` URL.
