# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Standardized Amount Input**: Introduced `useAmountInput` hook for consistent monetary data entry across all forms with real-time formatting and decimal preservation.
- **Improved Contact Creation**: Enhanced the contact creation flow in transactions to automatically select and focus newly created contacts, resolving previous race conditions.
- **Enhanced Type Safety**: Systematically replaced `any` types with specific interfaces in core components like `ContactFormDialog`, `ProjectTransactionForm`, and `EditTransactionDialog`.

### Changed
- Refactored `useContacts` hook to include synchronous refetching for `createContact` and `updateContact` operations.
- Optimized all monetary input fields (Transactions, Projects, Support, Gift Conversion) to support natural decimal typing (e.g., $10.2).
- Updated `ProjectTransactionForm` to include a small delay in auto-selection for better UI reliability.

### Fixed
- Resolved race condition where newly created contacts wouldn't appear in the dropdown selection immediately.
- Fixed inconsistent formatting in the Support page's custom amount input.
- Corrected various linting warnings related to string concatenation and unused parameters.

## [1.1.0] - 2026-02-24

### Added
- **Shared Access**: Ability to grant read-only access to specific users for specific projects or contacts.
- **Projects Module**: Grouping transactions into projects for better organization.
- **Subscription Tiers**: Basic and Pro plans with feature gating.
- **Support Module**: Functionality for users to support the platform financially.
- **Multi-currency Support**: Enhanced currency handling with real-time exchange rates.


## [1.0.0] - 2026-01-01

### Initial Release
- Core Transaction Ledger (Funds & Items).
- Witness System (Invitation & Verification).
- Contact Management.
- Basic Reporting.
- User Authentication (JWT).
