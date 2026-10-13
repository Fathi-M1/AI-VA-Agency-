# Business type packs

A **business type pack** is one file that tells the app everything it needs to know
about a kind of business: what to call the team, which services to suggest during
setup, which questions customers answer before sending a booking request, which
common questions the AI can answer, and which words mean an emergency.

Each `.json` file in this folder is one pack (`salon.json`, `vet_clinic.json`, …).
The app reads and checks **every** file here when the server starts. If a file has a
mistake, the server stops with a message that names the file and the field to fix.

Prices are never written here. Owners add their own prices during setup.

## Add a new business type with zero code

1. **Copy a file.** Duplicate the pack closest to the new business, e.g. copy
   `nail_salon.json` to `lash_studio.json`. The file name must match `vertical`.
2. **Change `vertical` and the names.** Give `vertical` the same id as the file name
   (lowercase letters, numbers and `_`), and update `display_name`,
   `card_description`, `staff_role`, the placeholders, `icon`, `booking_example` and
   `sample_request`. Set `research_level` to `"starter"` until it has been checked
   with real businesses.
3. **Edit services, questions and answers.** Change `services`, `booking_questions`,
   `faqs`, `escalation_keywords`, `emergency_instruction` and `setup_tips`. Turn on
   only the flags this kind of business needs.
4. **Restart the server.** Stop `npm run dev` and start it again. The new type shows up
   in setup (before "Other service business", which always stays last).

No database change and no code change is needed.

## Pack fields

| Field | What it is |
| --- | --- |
| `vertical` | Short id for the business type; must equal the file name (`salon` → `salon.json`). |
| `display_name` | Name on the setup card, e.g. "Salon". |
| `card_description` | One line under the name on the setup card. |
| `staff_role` / `staff_role_plural` | What one team member is called, e.g. "Stylist" / "Stylists". |
| `name_placeholder` | Example business name shown in the empty name field. |
| `staff_name_placeholder` | Example team member name shown in the empty name field. |
| `research_level` | `"researched"` (checked with real businesses) or `"starter"` (a sensible first draft). Not shown in the app. |
| `icon` | A [Lucide](https://lucide.dev) icon name for the setup card, written like `Scissors` or `PawPrint`. |
| `booking_example` | Short phrase for the AI-team explainer: "Asks the right questions, like …". |
| `sample_request` | One line used in the "You're live" demo and the booking page's example text, e.g. "Rebond · Long hair · Saturday afternoon". |
| `requires_consent` | `true` = customers must agree before sending health or personal details (booking form checkbox + notice in "Questions? Ask us"). |
| `uses_service_areas` | `true` = setup asks "Areas you serve"; the booking page shows the areas and warns when an address looks outside them. |
| `accepts_hmo` | `true` = setup shows HMO cards; `$HMOS` options and the HMO answer work. |
| `asks_walk_ins` | `true` = setup asks "Do you accept walk-ins?"; the booking page shows "Walk-ins welcome". |
| `quantity_question` | For services priced per unit: the question whose number multiplies the price and time (e.g. `"unit_count"`). |
| `address_question` | The question that holds the customer's address, checked against the areas served. |
| `extra_charges` | Optional extra charges per unit the owner can set in setup: `config_key` (where it's saved), `label` (shown to the owner and customer), `count_question` (the question that says how many units it applies to). |
| `minimum_booking` | `true` = setup offers a minimum booking amount, applied to the estimate. |
| `default_hours` | Starting work hours for a new team member. `weekday` 0 = Sunday … 6 = Saturday; two rows on the same day = two shifts. |
| `services` | Services suggested during setup: `name`, `pricing_type` (`fixed`, `by_hair_length`, `per_unit`), `duration_minutes` (per unit for `per_unit`), `variants` (times per hair length, or `null`), `typical_range` (a price hint when the owner leaves the price blank, or `null`), `default_on` (switched on at the start). |
| `booking_questions` | Questions customers answer, in order (see below). If you leave out the `service` question, the app adds one first. |
| `faqs` | Common questions and their answers. In `a_template`, words in `{braces}` are filled in from the owner's own setup answers. `{name|text}` means: if the owner left this empty, answer with `text` instead (for lists, `text` is also used for each item without a value). |
| `escalation_keywords` | Words that mean an emergency. The customer sees the emergency message right away and the owner gets a "needs you" alert. |
| `emergency_instruction` | The emergency message the owner starts with (they can edit it in setup). |
| `setup_tips` | The help text for each setup step (`step1` … `step4`). |
| `_help` | A note for people reading the file. Not shown in the app. |

### Booking question fields

| Field | What it is |
| --- | --- |
| `id` | Short id (lowercase, `_`), e.g. `hair_length`. |
| `ask` | The exact question text. |
| `type` | `choice` (tiles), `number` (− / + stepper), `yes_no` (two tiles), `text` (a text box). |
| `options` | For `choice`. `$SERVICES` = the owner's services that are on, `$STAFF` = the owner's team names (asked in "Who & when", skipped when there's only one person), `$HMOS` = the HMO cards the owner accepts (skipped when there are none). |
| `applies_to` | `"all"` or a list of service names the question is for. |
| `ask_if` | Only ask when an earlier answer matches: `{ "question_id": "inverter", "equals": "Yes" }`, or `null`. |
| `required` | `false` lets customers skip it. |
| `option_details` | Extra text and icons on the option tiles: `{ "Dog": { "hint": "…", "icon": "Dog" } }`. |
| `help_prompt` | Shows a "Not sure?" link with this text; customers describe it in their own words and the AI picks the closest option. |
| `min` / `max` | Range for `number` questions (default 1–20). |
| `summary_template` | How the answer appears on the receipt and ticket, e.g. `"{value} hair"` or `"{value} unit{s}"` (`{s}` adds an "s" for more than one). Text and yes/no answers only appear when this is set. |
| `summary_skip` | Answers to leave off the receipt, e.g. `["No HMO"]`. |
| `variant_map` | For `by_hair_length` prices: which option picks which price — `"short"`, `"shoulder"` or `"long"`. |
| `multiline` | `true` = a bigger text box (for a reason or concern). |

### Placeholders you can use in `faqs`

`{hmos}`, `{walk_in_answer}`, `{hmo_card_line}`, `{payment_methods}`, `{hours_summary}`,
`{service_durations}`, `{staff_names}`, `{service_prices}`, `{service_areas}`,
`{per_unit_durations}`, `{per_unit_prices}`, `{addon_line}`, `{minimum_line}`,
`{business_address}`.
