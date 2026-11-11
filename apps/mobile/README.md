# HAMLET Mobile

Native Android and iOS application for HAMLET, built with Expo, React Native, TypeScript and Expo Router.

## Product direction

One app with role-aware experiences for guests, owners, property managers and agents. Horatio will be integrated as the assistant layer after the core guest and partner journeys are connected.

## Local setup

1. Install Node.js 22.13 or newer.
2. Copy .env.example to .env and provide the existing HAMLET Supabase project URL and publishable key.
3. Run npm install.
4. Run npx expo install --fix to align SDK-managed dependencies.
5. Run npx expo-doctor.
6. Run npx expo start.

## Backend integration rules

- Reuse the existing HAMLET Supabase project, schema, RLS policies and server-side API routes.
- Do not create a second database or duplicate the web application's data model.
- Never trust client-submitted prices, fees, booking states or payment status.
- Use the existing central pricing and quote contract on the server.
- A booking request is not a confirmed booking.
- Only verified payment-provider webhooks may confirm payment.
- Keep refundable caution deposits separate from accommodation revenue and partner allocations.
- Respect owner-authorised property access and server-enforced role permissions.
- Never expose private guest identity records to owners or agents by default.
- Only EXPO_PUBLIC_ values belong in the mobile bundle. Never add service-role or payment-provider secret keys.

## Build targets

- Android: EAS development, preview and production builds.
- iOS: EAS development, preview and production builds.
- Proposed app identifiers: com.abundanceabodes.hamlet. Confirm availability and developer-account ownership before store submission.

## Current implementation status

Initial project configuration, navigation shell, discovery landing screen, empty states, partner entry point and Supabase client are being scaffolded. Live listings, authentication, booking, payments and partner APIs remain to be integrated and tested.
