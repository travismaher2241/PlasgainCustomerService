# Plasgain Customer Service & Sales Platform: Top-to-Bottom Audit & Optimization Roadmap

**Document Version:** 3.0  
**Prepared For:** Internal Technical Sales Team, Plasgain Australia  
**Date:** August 28, 2026  
**Status:** Section A (Bug Fixes), Section B (High-Value Abilities), & Section C (Function Optimisations) Completed & Verified (106/106 Tests Passing)

---

## 1. Executive Summary

This report documents a comprehensive end-to-end audit of the **Plasgain Customer Service & Sales Platform**, evaluated from the operational perspective of an **Internal Technical Sales Representative** handling local council tenders, civil infrastructure projects, electrical wholesale orders, and engineering plan take-offs across Australia.

### Platform Health & Test Status
- **Test Suite Status:** 15 Test Files | 106 Tests Passing (100% Pass Rate)
- **TypeScript Typecheck:** 0 Errors (`tsc --noEmit` clean)
- **Completed Bug Fixes (Section A):** 5 Core Functional & Wiring Bugs Resolved
- **Completed New Abilities (Section B):** 6 High-Impact Sales & Engineering Features Delivered

---

## 2. Resolved Platform Bugs & Functional Fixes (Section A)

The following critical bugs were identified during full platform testing and have been resolved:

### 2.1 Pipeline & Account Linkage in Enquiry Workspace
- **File:** `src/components/NewEnquiryWorkspace.tsx`
- **Issue:** Saving an opportunity from the AI Enquiry Analyzer previously hardcoded `pipelineId: "pipe-solar"` and `accountId: "acc-1"`, orphaning deals and hiding them from the active Kanban pipeline.
- **Resolution:** Updated to dynamically link to the active/default pipeline (`pipe-major-projects`), automatically resolving or creating the corresponding **Account** and **Contact** records in the CRM so saved deals immediately display on the Kanban board.

### 2.2 AS/NZS 1158 Pathway Spacing Calculator Dropdown Mismatch
- **File:** `src/components/ToolsHub.tsx`
- **Issue:** The `<select>` options passed `PR2`, `PR3`, `PR4`, while the calculation logic strictly evaluated `P1`, `P2`, `P3`, `P4`. Changing categories did not update the pole spacing or illuminance values.
- **Resolution:** Unified state and logic to support all Australian Standard category variations (`P1`–`P4` and `PR1`–`PR4`). Spacing, poles-per-kilometre, and target lux levels now calculate accurately.

### 2.3 Competitor Pricing Form Data Retention
- **File:** `src/components/crm/CRMCompetitorPricingView.tsx` & `CRMAccountsView.tsx`
- **Issue:** Plasgain quoted price, linked deal ID, and deal name were discarded when saving or editing competitor records.
- **Resolution:** Added linked deal selection and Plasgain quoted price fields to the modal state, submission handlers, and edit popovers.

### 2.4 Customer Follow-Up Modal State Synchronization
- **File:** `src/components/CustomerFollowUpModal.tsx`
- **Issue:** `leadTime` and `warranty` were missing from the `useMemo` dependency array, preventing email draft updates when adjusting delivery timelines or warranty parameters.
- **Resolution:** Added `leadTime`, `warranty`, and `contactEmail` to dependencies for real-time template preview updates.

### 2.5 Quick Logger Dynamic Title Synchronization
- **File:** `src/components/crm/CRMQuickLogModal.tsx`
- **Issue:** Switching accounts or activity types occasionally retained placeholder text ("Call with Client") rather than the resolved customer name.
- **Resolution:** Synchronized title generation to update dynamically whenever an account is changed or an activity type (Call, Email, Meeting, Note) is selected.

---

## 3. High-Value New Abilities (Section B - Delivered)

The following 6 capabilities have been fully built and integrated into the platform:

### 3.1 1-Click "Add Calculation to Active Quote / Deal" from Tools Hub
- **Delivered In:** `src/components/ToolsHub.tsx`
- **What Was Built:** Added an **"Add Calculation to Quote / Deal"** button on every engineering calculator (Cable Cover, Pathway Spacing, and Wind Foundation). Clicking it opens an interactive modal allowing the rep to either select an existing deal or create a new deal, automatically injecting the calculated product SKUs, quantities, and pricing into the CRM deal schedule.

### 3.2 In-Deal Multi-Line Bill of Materials (BOM) & Margin Calculator
- **Delivered In:** `src/components/crm/CRMPipelineView.tsx`
- **What Was Built:** Embedded an interactive spreadsheet-style grid in the Deal Drawer allowing sales reps to add catalogue items or custom lines, adjust unit costs and sell prices, toggle GST, and adjust an interactive Target Margin Slider (10%–60%) with 1-click **"Apply Margin to All"** markup recalculations.

### 3.3 Wind Region (AS 1170.2) & Foundation Surcharge Estimator
- **Delivered In:** `src/components/ToolsHub.tsx`
- **What Was Built:** Added a full engineering calculator supporting Australian Wind Regions (Region A 45m/s, Region B 57m/s, Region C 69m/s Cyclonic, Region D 88m/s Severe Cyclonic), footing embedment depths, concrete volume ($m^3$), M24/M27 ragbolt cage sizing, and freight weight surcharges across all states with 1-click deal injection.

### 3.4 Bulk Task & Follow-up Checkbox Triage
- **Delivered In:** `src/components/crm/CRMTasksActivitiesView.tsx`
- **What Was Built:** Implemented selection checkboxes with "Select All" and a sticky batch action bar providing **"Mark Completed"**, **"Postpone +3 Days"**, **"Postpone +1 Week"**, and **"Clear"** to triage dozens of customer follow-ups in seconds.

### 3.5 Inbound Lead Smart Deduplication & Domain Fuzzy Matching
- **Delivered In:** `src/components/crm/CRMLeadsView.tsx` & `src/context/AppContext.tsx`
- **What Was Built:** Added automated domain and company similarity matching on inbound leads. Displays an **"Existing CRM Account Detected"** alert banner and a conversion modal that allows 1-click linkage to the existing customer account without duplicating records.

### 3.6 Ostendo Quote Status & Revision Lifecycle Tracking
- **Delivered In:** `src/components/crm/CRMPipelineView.tsx` & `src/types/crm.ts`
- **What Was Built:** Added structured quote tracking displaying Quote Reference (e.g. `Q-88210`), Revision tags (`Rev A`, `Rev B`, `Rev C`), Quote Status (`Draft`, `Issued`, `Client Review`, `Revised`, `PO Received`, `Expired`), Expiry Countdown chips, **"+ Create Revision"** action, and 1-click **"PO Received (Win Deal)"** action.

---

## 4. Functions That Could Be Optimised (Section C - Roadmap)

Refining existing features to reduce friction and improve responsiveness:

### 4.1 Product Finder Result Action Buttons
- **Current Limitation:** Matched products display technical specs, but reps must navigate away to quote or download documentation.
- **Optimisation:** Add **"+ Add to Deal"** and **"Download Photometric IES"** buttons directly on each matched product card.
- **Effort:** Low

### 4.2 Contextual AI Copilot Prompt Chips
- **Current Limitation:** The Copilot drawer opens with generic greeting text regardless of what deal or account is currently active.
- **Optimisation:** Inject 3 dynamic 1-click prompt chips based on the active screen (e.g. on Deal view: *"Draft 3000K dark-sky compliance clause"*, *"Check battery autonomy for 5 overcast days in VIC"*).
- **Effort:** Low

### 4.3 Account 360° AI Summary Caching
- **Current Limitation:** Opening the AI Summary tab calls the backend API every time, introducing loading delays.
- **Optimisation:** Cache the generated summary in local state with a timestamp and provide a manual **"Refresh Analysis"** button.
- **Effort:** Low

### 4.4 1-Click Pipeline Kanban Stage Progression
- **Current Limitation:** Moving deals between pipeline stages requires dragging cards across wide monitor screens.
- **Optimisation:** Add quick hover actions on each deal card: **"+ Log Call"**, **"Email Follow-up"**, and **"Advance Stage ➔"**.
- **Effort:** Low

### 4.5 Action-Oriented Global Search (`Ctrl+K`)
- **Current Limitation:** Global search finds records but does not trigger workflow actions.
- **Optimisation:** Support command shortcuts (e.g. typing `>call Moreton` opens the Quick Logger with Moreton Bay pre-selected; `>quote` opens Ostendo export).
- **Effort:** Medium

---

## 5. Pinch Points & Streamlining Workflows (Section D - Roadmap)

Targeting time-consuming steps to minimize clicks and eliminate duplicate data entry:

### 5.1 1-Click Routine Call Outcome Presets
- **The Bottleneck:** Logging a routine phone call takes 5 clicks (opening modal, selecting account, typing title, selecting date).
- **Streamlined Flow:** In the Deal drawer and Today view, provide 1-click outcome buttons:
  - *"Left Voicemail (Auto-task +2 days)"*
  - *"Sent Dialux / Datasheet (Auto-task +5 days)"*
  - *"Price Accepted (Advance to Negotiation)"*

### 5.2 Inline Ostendo Item Code Validation & Exact Matrix Copy
- **The Bottleneck:** Copying BOM lines into Ostendo ERP fails if an SKU is slightly misformatted.
- **Streamlined Flow:** Display a green "Ostendo Verified SKU" badge beside registered product codes, with a 1-click **"Copy Exact Matrix"** button formatted for ERP import.

### 5.3 Unified "Package & Pipeline" Action in Enquiry Workspace
- **The Bottleneck:** Reps must save an enquiry, navigate to CRM, open follow-up modals, and open datasheet packaging in separate steps.
- **Streamlined Flow:** Add a single **"Save Deal & Draft Follow-Up"** action that ingests the deal, pre-populates the customer follow-up email, and generates the datasheet package in one flow.

---

## 6. Interactive Implementation Checklist

Use this checklist to track progress as enhancements and optimizations are implemented:

### ✅ Section A: Core Bug Fixes (Completed & Verified)
- [x] **BUG-01:** Fix Pipeline ID mismatch in `NewEnquiryWorkspace.tsx` (`pipe-major-projects` linkage)
- [x] **BUG-02:** Fix AS/NZS 1158 Pathway Spacing Calculator category dropdown mismatch (`P1`–`P4` / `PR1`–`PR4`)
- [x] **BUG-03:** Fix Competitor Pricing form field drop for Plasgain Quoted Price, Opportunity ID, and Name
- [x] **BUG-04:** Add missing `leadTime`, `warranty`, and `contactEmail` dependencies to `CustomerFollowUpModal.tsx`
- [x] **BUG-05:** Fix Quick Logger dynamic title synchronization on account and activity type changes
- [x] **VERIFY-01:** Run full test suite (`106/106 tests passing`) and push commit to `origin/main`

---

### ✅ Section B: High-Value New Abilities (Completed & Verified)
- [x] **FEAT-01:** Add **"Add to Active Quote / Deal"** 1-click button to Cable Cover and Spacing Calculators
- [x] **FEAT-02:** Implement **Multi-Line BOM & Margin Slider** inside CRM Opportunity Drawer
- [x] **FEAT-03:** Add **Wind Region (AS 1170.2) & Foundation Surcharge Estimator** with shipment weight calculation
- [x] **FEAT-04:** Add **Bulk Task Checkbox Triage** (Batch Complete, Batch Reschedule +3d/+7d)
- [x] **FEAT-05:** Implement **Lead Deduplication & Domain Fuzzy Matching** during lead conversion
- [x] **FEAT-06:** Implement **Ostendo Quote Lifecycle Tracking** (Revisions, Expiry Countdowns, Status Badges)
- [x] **VERIFY-02:** Run full test suite (`106/106 tests passing`) and push commit to `origin/main`

---

### ✅ Section C: Function Optimisations (Completed & Verified)
- [x] **OPT-01:** Add **"+ Add to Deal"**, **"Download IES"**, and **"Copy Spec"** buttons to Product Finder result cards
- [x] **OPT-02:** Inject **Dynamic Contextual 1-Click Prompt Chips** into Global Copilot drawer based on active deal/screen
- [x] **OPT-03:** Implement **AI Account Summary Multi-Account Caching** to eliminate repeat API loading delays
- [x] **OPT-04:** Add **1-Click Stage Advance & Quick-Log Hover Actions** to Kanban Deal cards
- [x] **OPT-05:** Enable **Command-Driven Action Shortcuts** in Global Search (`Ctrl+K` with `>call`, `>deal`, `>calc`, etc.)
- [x] **VERIFY-03:** Run full test suite (`106/106 tests passing`) and push commit to `origin/main`

---

### 🔲 Section D: Workflow Streamlining & Pinch Points (Roadmap)
- [ ] **STRM-01:** Add **1-Click Call Outcome Presets** (*"Left Voicemail"*, *"Sent Dialux"*, *"Price Accepted"*)
- [ ] **STRM-02:** Add **Inline Ostendo SKU Verification Badges** and 1-click ERP matrix copy
- [ ] **STRM-03:** Build **Unified "Save Deal & Draft Follow-Up"** action in Enquiry Workspace

---
*Report generated and maintained in the Plasgain Customer Service repository.*

