-- Seed: one business, Cruz Family Dental. Its id is reused everywhere for now
-- (the playground entry point points at it). Run after schema.sql.
-- This replaces the old in-code knowledge file: the agents now read this row.
insert into public.businesses (id, name, config)
values (
  '4eb77e14-4742-42d2-84e8-8a7d88785f67',
  'Cruz Family Dental',
  '{
    "business_type": "Dental clinic",
    "owner_name": "Elena Cruz",
    "customer_term": { "singular": "patient", "plural": "patients" },
    "restricted_advice": ["medical or clinical advice"],
    "timezone": "Asia/Singapore",
    "hours": {
      "mon": "08:00-17:00",
      "tue": "08:00-17:00",
      "wed": "08:00-17:00",
      "thu": "08:00-17:00",
      "fri": "08:00-13:00",
      "sat": null,
      "sun": null
    },
    "services": [
      { "name": "Cleaning & exam", "duration_minutes": 60, "calcom_event_type_id": 7315309 }
    ],
    "rules": {
      "emergency_keywords": [
        "bleeding",
        "chest pain",
        "can''t breathe",
        "cant breathe",
        "cannot breathe",
        "can not breathe",
        "severe swelling"
      ]
    },
    "emergency_line": "If this is a medical emergency, please hang up and call your local emergency number."
  }'::jsonb
)
on conflict (id) do update set name = excluded.name, config = excluded.config;
