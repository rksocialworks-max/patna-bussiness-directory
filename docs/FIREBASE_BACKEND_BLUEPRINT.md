# Firebase Backend Blueprint — Patna Business Directory

Status: design draft only. This branch does not change production Firebase or the `main` branch.

## Project decisions
- Existing Firebase project: `patnabiz-b2fcb`
- Intended Firestore location: `asia-south1` (verify in Console before database creation; location cannot be changed after creation)
- Frontend: existing React 19 + Vite 8 application
- Existing backend in source: Apper SDK MemoryAdapter; Firebase SDK is not yet a package dependency.
- Preserve existing UI and features. Replace backend adapters incrementally after service-call mapping and emulator tests.
- Do not migrate mock records, demo accounts, password fields, fake payment records, or sample analytics into production.

## Proposed collection mapping

| Firestore collection | Existing mock module | Purpose |
|---|---|---|
| users | users.json | User profile and role metadata; passwords excluded |
| businesses | businesses_c.json | Business listings |
| categories | categories_c.json | Categories and subcategories |
| branches | branches_c.json | Business branches |
| products_services | products_services_c.json | Products and services |
| reviews | reviews_c.json | Customer reviews |
| enquiries | enquiries_c.json | Customer enquiries |
| business_documents | business_documents_c.json | Verification documents |
| business_analytics | business_analytics_c.json | Listing analytics |
| branch_activity | branch_activity_c.json | Branch activity log |
| premium_plans | premium_plans_c.json | Premium plan catalogue |
| payments | payments_c.json | Payment records |
| offers | offers_c.json | Offers and discounts |
| coupons | coupons_c.json | Coupons |
| advertisements | advertisements_c.json | Advertising records |
| homepage_banners | homepage_banners_c.json | Homepage banners |
| notifications | notifications_c.json | User notifications |
| content_pages | content_pages_c.json | CMS pages and SEO |
| site_settings | site_settings_c.json | Site configuration |
| support_requests | support_requests_c.json | Support tickets |
| reports | reports_c.json | Abuse/business/review reports |
| privacy_requests | privacy_requests_c.json | Privacy requests |

## Field inventory from current mock source

The existing records use legacy fields such as `Id`, `Name`, `Owner`, `CreatedBy`, `ModifiedBy`, `CreatedOn`, and `ModifiedOn`. Preserve those during the first adapter migration where practical; do not silently rename fields while replacing the backend.

- users: `Id`, `userId`, `companyId`, `Name`, `FirstName`, `LastName`, `Email`, `AvatarUrl`, `IsOwner`, `accounts`. The source also contains a `password` field: never migrate it.
- businesses: `Id`, `Name`, `category_c`, `subcategory_c`, `district_c`, `city_c`, `area_c`, `pincode_c`, `address_c`, `description_c`, `owner_name_c`, `phone_c`, `whatsapp_c`, `email_c`, `website_c`, `facebook_c`, `instagram_c`, `status_c`, `listing_type_c`, `is_premium_c`, `is_verified_c`, `rating_c`, `reviews_count_c`, `logo_c`, `cover_c`, `map_url_c`, `hours_c`, `featured_order_c`, `Owner`, `CreatedBy`, `ModifiedBy`, `CreatedOn`, `ModifiedOn`, `photos_c`, `business_type_c`, `gstin_c`, `youtube_c`, `linkedin_c`, `x_c`, `telegram_c`, `pinterest_c`, `other_links_c`, `holiday_info_c`, `seo_title_c`, `meta_description_c`, `slug_c`, `premium_expiry_c`, `latitude_c`, `longitude_c`, `is_popular_c`.
- categories: `Id`, `Name`, `parent_c`, `description_c`, `status_c`, `sort_order_c`, plus audit fields.
- branches: `Id`, `Name`, `business_c`, `address_c`, `district_c`, `city_c`, `phone_c`, `status_c`, `manager_c`, `map_url_c`, `hours_c`, `photos_c`, plus audit fields.
- products_services: `Id`, `Name`, `business_c`, `item_type_c`, `price_type_c`, `price_c`, `price_to_c`, `image_c`, `status_c`, plus audit fields.
- reviews: `Id`, `Name`, `business_c`, `customer_name_c`, `mobile_c`, `rating_c`, `title_c`, `review_c`, `status_c`, `owner_reply_c`, `report_status_c`, plus audit fields.
- enquiries: `Id`, `Name`, `business_c`, `customer_name_c`, `mobile_c`, `message_c`, `source_c`, `status_c`, `branch_c`, `reply_c`, plus audit fields.
- business_documents: `Id`, `Name`, `business_c`, `document_type_c`, `file_c`, `status_c`, plus audit fields.
- business_analytics: `Id`, `Name`, `business_c`, `branch_c`, `period_c`, `profile_views_c`, `calls_c`, `whatsapp_clicks_c`, `enquiries_count_c`, plus audit fields.
- branch_activity: `Id`, `Name`, `branch_c`, `action_c`, `details_c`, plus audit fields.
- premium_plans: `Id`, `Name`, `duration_days_c`, `price_c`, `features_c`, `status_c`, plus audit fields.
- payments: `Id`, `Name`, `business_c`, `plan_c`, `amount_c`, `method_c`, `reference_c`, `status_c`, `receipt_no_c`, `screenshot_c`, plus audit fields.
- offers: `Id`, `Name`, `business_c`, `description_c`, `discount_c`, `start_date_c`, `end_date_c`, `status_c`, `is_homepage_featured_c`, plus audit fields.
- coupons: `Id`, `Name`, `business_c`, `code_c`, `discount_c`, `valid_from_c`, `valid_to_c`, `usage_limit_c`, `status_c`, plus audit fields.
- advertisements: `Id`, `Name`, `ad_type_c`, `description_c`, `start_date_c`, `end_date_c`, `amount_c`, `status_c`, `business_c`, plus audit fields.
- homepage_banners: `Id`, `Name`, `caption_c`, `image_c`, `link_url_c`, `sort_order_c`, `status_c`, plus audit fields.
- notifications: `Id`, `Name`, `message_c`, `notification_type_c`, `status_c`, plus audit fields.
- content_pages: `Id`, `Name`, `slug_c`, `body_c`, `seo_title_c`, `meta_description_c`, `status_c`, plus audit fields.
- site_settings: `Id`, `Name`, `setting_key_c`, `setting_value_c`, `setting_group_c`, plus audit fields.
- support_requests: `Id`, `Name`, `email_c`, `mobile_c`, `message_c`, `status_c`, plus audit fields.
- reports: `Id`, `Name`, `business_c`, `reason_c`, `description_c`, `status_c`, plus audit fields.
- privacy_requests: `Id`, `Name`, `request_type_c`, `description_c`, `status_c`, plus audit fields.

The field inventory is not yet a final type contract. Confirm actual types, nullable fields, status enums, and reference formats against every mock record and consuming component before writing production services.

## Identity and authorization model

- Firebase Auth UID is the authoritative identity key.
- `users/{uid}` stores profile and role metadata; users cannot grant themselves roles.
- Roles: `SuperAdmin`, `BusinessOwner`, `BranchManager`, and optional `Customer`.
- Super Admin assignment must be performed through a trusted administrative process (for example, a protected Admin SDK script/Cloud Function), never from client registration.
- A Business Owner may manage only businesses whose trusted `ownerUid` matches their Auth UID.
- A Branch Manager may access only branch IDs explicitly assigned by a trusted owner/admin.
- Public reads should be limited to published/approved fields and documents. Private owner contact details, verification files, payment records, and internal notes must not be exposed by public listing queries.
- UI route guards are usability controls, not security boundaries. Firestore and Storage Rules must enforce access.

## Required server-side operations

1. Approve/reject business listings; prevent owners from editing moderation fields.
2. Verify business documents.
3. Create Razorpay orders and verify signed webhook/payment events.
4. Activate/expire premium listing only after trusted payment or admin action.
5. Moderate reviews; enforce one review per verified customer/business policy.
6. Enforce enquiry retention (30 days) with a scheduled backend cleanup.
7. Send owner notifications.
8. Validate uploads, file types, file sizes, and ownership.

## Query/index candidates

- businesses: district + category + approval status
- businesses: premium flag + featured order + approval status
- businesses: owner UID + creation time
- branches: business ID + status
- reviews: business ID + moderation status + creation time
- enquiries: business ID + creation time
- payments: business ID + payment status
- offers: business ID + active date range
- notifications: recipient UID + creation time

Create only indexes requested by actual Firestore query errors or confirmed query plans.

## Migration sequence

1. Map every SDK call and data-table operation in the UI to a service contract.
2. Add Firebase SDK and environment-based initialization without putting secrets in source control.
3. Implement Auth state subscription and role loading; update route guards.
4. Implement Firestore services collection-by-collection behind stable service interfaces.
5. Implement Storage uploads and trusted Cloud Functions.
6. Add strict Firestore/Storage Rules and test with Emulator Suite.
7. Run production build and role-based regression tests.
8. Obtain explicit approval before creating the database, enabling billing, migrating live data, or deploying.

## Not authorized / not done
- No Firebase database has been created.
- No billing setting has been changed.
- No production data has been written or migrated.
- No changes have been made to `main`.
- This document is a planning artifact, not deployable security rules.
