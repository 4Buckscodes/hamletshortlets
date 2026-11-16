# HAMLET Partner Network Registration

## Registration and workspace access

A user with an active HAMLET account can join the partner network immediately. Successful registration opens the partner workspace without a manual partner-account approval step. The member keeps the underlying `profiles.role='guest'` so the same account can still book stays; database partner permissions are granted through an active `partner_network_memberships` row.

Registration captures a primary role, business/display name and phone. The available roles are property owner, authorised manager, multi-property operator and closing agent. Active members can open the partner dashboard, view earnings activity, share approved stays, invite partners and access the tools allowed by their role.

## Progressive trust and safety

- **Partner registration:** automatic. No identity approval is required to enter the workspace.
- **Property submission:** property owners, authorised managers and multi-property operators can upload immediately. A listing remains private until HAMLET reviews and approves that property. Closing agents can share approved stays and track attributed activity but cannot submit a property unless they register with an inventory-authority role.
- **Identity verification:** optional during initial onboarding and required before a partner payout is approved or marked paid. The existing partner verification record is retained for this purpose; approval does not convert the member's account into a partner-only account or remove guest booking access.
- **Suspension:** suspended network memberships and suspended accounts cannot use partner permissions. Members cannot self-reactivate; an active administrator must reactivate them with a documented reason.
- **Referrals:** a unique referral code is generated when the member joins. Referral attribution is recorded at registration and cannot be changed to another referrer later.

## Communications

The account-confirmation lifecycle sends the single welcome email. Partner registration does not enqueue a separate application-received or manual-approval email. Property lifecycle notifications remain separate and are sent when a property is submitted or its review status changes.

## Release safety

The migration is additive and must be rehearsed against a production-like database before release. Apply it to staging first, verify account booking access, partner dashboard access, property submission boundaries, referral attribution and payout verification, then deploy the matching application code. Do not apply the migration to production without explicit owner approval, a verified backup/snapshot and a reviewed rollback plan.
