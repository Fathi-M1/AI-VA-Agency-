// What the setup screen needs from a pack (server-side helper; plain data out).
import type { PackLite } from "@/lib/setup"
import type { Pack } from "@/server/verticals"

export function packLite(p: Pack): PackLite {
  return {
    vertical: p.vertical,
    display_name: p.display_name,
    card_description: p.card_description,
    staff_role: p.staff_role,
    name_placeholder: p.name_placeholder,
    staff_name_placeholder: p.staff_name_placeholder,
    default_hours: p.default_hours,
    services: p.services,
    emergency_instruction: p.emergency_instruction,
    setup_tips: p.setup_tips,
    accepts_hmo: !!p.accepts_hmo,
    asks_walk_ins: !!p.asks_walk_ins,
    uses_service_areas: !!p.uses_service_areas,
    extra_charges: (p.extra_charges ?? []).map((x) => ({ config_key: x.config_key, label: x.label })),
    minimum_booking: !!p.minimum_booking,
  }
}
