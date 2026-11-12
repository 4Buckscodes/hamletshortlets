# HAMLET Tax & Legal Rules Framework

**Version:** 2.0 draft · **Research checked:** 2 November 2026  
**Status:** Requirements framework only. Not legal or tax advice; tax classification and collection obligations require qualified Nigerian advice and written authority confirmation.

## 1. Purpose

HAMLET must preserve the information needed to calculate, collect, report and reconcile taxes that legally apply to the relevant supply and taxpayer. Do not assume every shortlet transaction is subject to every tax, or that all accommodation is ordinary residential rent.

## 2. Current statutory context to validate

- The Federal Ministry of Finance states that the Tax Acts 2025 transition framework applies from the commencement dates in the Acts, including 1 January 2026 for the Nigeria Tax Act 2025. See [Federal Ministry of Finance transition guidelines](https://finance.gov.ng/ministry/federal-government-issues-transition-guidelines-for-tax-acts-2025/).
- Section 147 of the Nigeria Tax Act 2025 states a standard VAT rate of 7.5% on taxable supplies, subject to statutory exemptions and the Act's rules. See the [National Assembly's Nigeria Tax Act 2025 text](https://nass.gov.ng/documents/download/11249).
- The Lagos State Hotel Occupancy and Restaurant Consumption Tax Law, Chapter H8, section 1 refers to payment for use/possession/right to use a hotel or hotel facility and section 2 sets a 5% tax on the total bill excluding VAT. The application of this law to each shortlet/serviced apartment model, platform arrangement and collecting party must be confirmed with LIRS/legal counsel; do not automatically apply it to every property. A copy of the law is available [here](https://infinitygoldhomes.com/wp-content/uploads/2023/05/LAGOS-STATE-CONSUMPTION-TAX-LAW-_Hotel-Occupancy-and-Restaurant-Consumption.pdf).
- The Nigeria Tax Administration Act 2025 establishes tax administration rules and jurisdiction responsibilities. See the [NRS-hosted Act](https://www.nrs.gov.ng/uploads/NIGERIA_TAX_ADMINISTRATION_ACT_2025_8c945071a7.pdf).

## 3. Separate tax questions by supply and taxpayer

Obtain advice on each of these independently:
1. Owner's accommodation supply: legal classification, taxable value, registration and invoicing.
2. HAMLET platform/service supply: whether the markup or platform allocation is consideration for HAMLET's own taxable service and who is the supplier to the guest.
3. Mandatory charges: whether cleaning, utilities, service charges or third-party services form part of the accommodation taxable base or a separate supply.
4. Lagos hospitality consumption tax: whether the specific shortlet/serviced apartment qualifies as a hotel/hotel facility and who must register/collect/remit.
5. Abuja/FCT and other states: separate state/FCT rules; do not reuse Lagos settings.
6. Withholding tax: whether a payment is rent, commission, agency, management, professional service or another category; identify payer, recipient, tax authority and credit/remittance evidence.
7. Owner/agent income taxes: individual or company taxpayer obligations are generally not the same as a booking-level tax line.
8. HAMLET corporate taxes and reporting: company-level obligations must be handled in company accounting, not added indiscriminately to guest checkout.
9. Refundable caution deposit: confirm whether the deposit is excluded from taxable consideration under the exact arrangement and how retained damage deductions are treated.

## 4. Product requirements for a future tax rules engine

Every rule should be configurable and versioned with:
- tax identifier and statutory source;
- jurisdiction (federal, state, FCT, local where relevant);
- effective-from/effective-to dates;
- supply/service classification;
- taxable base and included/excluded charge types;
- rate, threshold, exemption and registration conditions;
- party legally liable, collecting party and remitting party;
- invoice/receipt requirements;
- filing and remittance cadence;
- refund/cancellation adjustment method;
- rule version, reviewer, approval date and source link.

The engine must calculate only when an approved rule matches the transaction facts. If classification is uncertain, fail safely into a review/quote process rather than silently charging a guessed rate.

## 5. Withholding tax handling

Treat WHT as a deduction/credit/remittance workflow, not automatically as an additional guest charge. Store gross payable, amount withheld, net paid, payer, recipient, applicable rule, tax authority, certificate/credit reference and remittance date. Do not apply WHT to every owner or agent payout without a confirmed classification and payer/recipient analysis.

## 6. Refunds, deposits and financial records

Tax collected is a liability until remitted. Refunds/cancellations may require corresponding tax adjustments. A caution deposit is a separate liability and must not be recognised as accommodation revenue merely because it is collected. Damage deductions or forfeitures require a separate legal/accounting classification.

## 7. Release gate

Before live tax collection:
- Obtain written tax-professional advice for HAMLET's exact agency/principal and marketplace contracts.
- Confirm accommodation supply classification and VAT treatment.
- Obtain LIRS confirmation on Lagos hospitality tax scope and collection-agent requirements where applicable.
- Obtain FCT advice before any Abuja launch.
- Confirm WHT classification for agent, referral and management payments.
- Confirm owner/partner invoicing, TIN collection, record retention and remittance responsibility.
- Implement approved rules with effective dates, tests, receipts and reconciliation.
- Review consumer-facing price disclosures and contract terms.

## 8. Sources checked

- Federal Ministry of Finance, “Federal Government Issues Transition Guidelines for Tax Acts 2025”, 18 June 2026: https://finance.gov.ng/ministry/federal-government-issues-transition-guidelines-for-tax-acts-2025/
- Nigeria Tax Act 2025, section 147 (VAT rate): https://nass.gov.ng/documents/download/11249
- Nigeria Tax Administration Act 2025: https://www.nrs.gov.ng/uploads/NIGERIA_TAX_ADMINISTRATION_ACT_2025_8c945071a7.pdf
- Lagos State Hotel Occupancy and Restaurant Consumption Tax Law, Chapter H8: https://infinitygoldhomes.com/wp-content/uploads/2023/05/LAGOS-STATE-CONSUMPTION-TAX-LAW-_Hotel-Occupancy-and-Restaurant-Consumption.pdf

This source list is not a substitute for confirming amendments, regulations, current administrative practice or the facts of HAMLET's contracts.
