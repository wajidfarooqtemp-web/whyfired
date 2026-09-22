// Shared across the submission form and the feed, so the two
// never drift out of sync with each other.

export const COUNTRIES = [
  "Afghanistan", "Albania", "Algeria", "Argentina", "Armenia", "Australia",
  "Austria", "Azerbaijan", "Bahrain", "Bangladesh", "Belarus", "Belgium",
  "Bolivia", "Bosnia and Herzegovina", "Brazil", "Bulgaria", "Cambodia",
  "Cameroon", "Canada", "Chile", "China", "Colombia", "Costa Rica",
  "Croatia", "Cuba", "Cyprus", "Czechia", "Denmark", "Dominican Republic",
  "Ecuador", "Egypt", "El Salvador", "Estonia", "Ethiopia", "Fiji",
  "Finland", "France", "Georgia", "Germany", "Ghana", "Greece",
  "Guatemala", "Honduras", "Hong Kong", "Hungary", "Iceland", "India",
  "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy", "Jamaica",
  "Japan", "Jordan", "Kazakhstan", "Kenya", "Kuwait", "Kyrgyzstan", "Laos",
  "Latvia", "Lebanon", "Libya", "Lithuania", "Luxembourg", "Malaysia",
  "Maldives", "Malta", "Mauritius", "Mexico", "Moldova", "Mongolia",
  "Montenegro", "Morocco", "Myanmar", "Nepal", "Netherlands",
  "New Zealand", "Nicaragua", "Nigeria", "North Macedonia", "Norway",
  "Oman", "Pakistan", "Panama", "Paraguay", "Peru", "Philippines",
  "Poland", "Portugal", "Qatar", "Romania", "Russia", "Rwanda",
  "Saudi Arabia", "Serbia", "Singapore", "Slovakia", "Slovenia",
  "South Africa", "South Korea", "Spain", "Sri Lanka", "Sudan", "Sweden",
  "Switzerland", "Syria", "Taiwan", "Tajikistan", "Tanzania", "Thailand",
  "Tunisia", "Turkey", "Turkmenistan", "Uganda", "Ukraine",
  "United Arab Emirates", "United Kingdom", "United States", "Uruguay",
  "Uzbekistan", "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe",
  "Other",
];

export const TERMINATION_REASONS: { value: string; label: string }[] = [
  { value: "no_reason_given", label: "No reason was given" },
  { value: "misconduct_no_enquiry", label: '"Misconduct", with no formal enquiry' },
  { value: "misconduct_with_enquiry", label: '"Misconduct", with a formal enquiry' },
  { value: "layoff_retrenchment", label: "Layoff / retrenchment" },
  { value: "forced_resignation", label: "Forced to resign, though I didn't want to" },
];

export function terminationReasonLabel(value: string): string {
  return TERMINATION_REASONS.find((r) => r.value === value)?.label ?? value;
}
