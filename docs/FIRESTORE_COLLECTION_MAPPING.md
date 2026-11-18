# Firestore collection mapping

This is the initial adapter contract for the Firebase integration branch.

| Legacy data module | Firestore collection |
| --- | --- |
| users.json | users |
| businesses_c | businesses |
| categories_c | categories |
| branches_c | branches |
| products_services_c | products_services |
| reviews_c | reviews |
| enquiries_c | enquiries |
| business_documents_c | business_documents |
| business_analytics_c | business_analytics |
| branch_activity_c | branch_activity |
| premium_plans_c | premium_plans |
| payments_c | payments |
| offers_c | offers |
| coupons_c | coupons |
| advertisements_c | advertisements |
| homepage_banners_c | homepage_banners |
| notifications_c | notifications |
| content_pages_c | content_pages |
| site_settings_c | site_settings |
| support_requests_c | support_requests |
| reports_c | reports |
| privacy_requests_c | privacy_requests |

## Important migration rules

- Preserve existing UI and legacy field names during the first migration pass.
- Do not migrate sample/demo users, passwords, businesses, reviews, payment records, or analytics.
- Firebase Authentication UID is the identity key; role claims must be assigned by a trusted server-side process.
- Never treat client-side role checks as a security boundary.
- The current Firestore rules are deny-by-default. This service layer will not work against Firestore until rules are implemented and tested.
- Do not deploy permissive rules or enable production writes before emulator tests.
- Keep payment verification, premium activation, review approval, document verification, and role assignment in trusted Cloud Functions.
