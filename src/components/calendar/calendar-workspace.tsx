"use client";

// Calendar: ReUI Event Calendar (week/days time grid) + a left rail.
// Pulled parts:
// - Week grid: ReUI Event Calendar, Radix build
//   https://reui.io/components/event-calendar (registry: https://reui.io/r/styles/radix-nova/event-calendar.json)
//   License: MIT (keenthemes/reui). Installed via shadcn CLI with the @reui registry.
//   Used through its documented props: days view (Mon–Fri), dayStartHour/dayEndHour,
//   interactions off (visual pass), renderDayHeader (keeps "X visits · Y by AI"),
//   renderEvent (visit-type colour + the AI marker), renderDayColumnBackground
//   (shorter days from the configured hours), eventTooltip + renderEventTooltip.
// Data: the real bookings for the current week from Supabase (server/db/views.ts).
// - Mini month: shadcn Calendar (react-day-picker), https://ui.shadcn.com/docs/components/calendar (MIT)
// - Service filter (services from the business config): shadcn Checkbox + Label (MIT)
// - Today's list: shadcn Item + Avatar (MIT)
import * as React from "react";

import { EventCalendar } from "@/components/reui/event-calendar/event-calendar";
import { EventCalendarContent } from "@/components/reui/event-calendar/event-calendar-content";
import type { CalendarEvent } from "@/components/reui/event-calendar/event-calendar-types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemSeparator,
  ItemTitle,
} from "@/components/ui/item";
import { Label } from "@/components/ui/label";
import { avatarTint, initials } from "@/lib/avatar";
import type { CalendarAppointment as Appointment } from "@/server/db/views";
import { eyebrow } from "@/lib/styles";
import { cn } from "@/lib/utils";
import { serviceLegend } from "@/lib/service-colors";

type EventData = {
  appointment: Appointment;
  /** the service name (from the business's config) */
  type: string;
  byAi: boolean;
};

const clock = (h: number) => {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return `${hh > 12 ? hh - 12 : hh}:${mm.toString().padStart(2, "0")} ${hh >= 12 ? "pm" : "am"}`;
};
const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

/* The AI marker: the one place the accent is spent on this screen. */
function AiMark({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex h-4 items-center rounded-full bg-primary px-1.5 text-[10px] font-semibold leading-none text-primary-foreground",
        className,
      )}
    >
      AI
    </span>
  );
}

export function CalendarWorkspace({
  appointments,
  days,
  weekStart,
  today: todayYmd,
  todayLabel,
  startHour,
  endHour,
  services,
}: {
  appointments: Appointment[];
  /** The business's configured service names (legend + colours). */
  services: string[];
  days: { label: string; date: number; closesAt?: number }[];
  /** Monday of the shown week and today, as [y, m (1-12), d] in the business tz. */
  weekStart: [number, number, number];
  today: [number, number, number];
  todayLabel: string;
  startHour: number;
  endHour: number;
}) {
  const [hidden, setHidden] = React.useState<Set<string>>(new Set());
  const legend = React.useMemo(
    () => serviceLegend(services, appointments.map((a) => a.service)),
    [services, appointments],
  );
  const colorOf = React.useCallback(
    (service: string) => legend.find((l) => l.name === service)?.color ?? "var(--service-5)",
    [legend],
  );
  const WEEK_START = React.useMemo(
    () => new Date(weekStart[0], weekStart[1] - 1, weekStart[2]),
    [weekStart],
  );
  const TODAY = React.useMemo(
    () => new Date(todayYmd[0], todayYmd[1] - 1, todayYmd[2]),
    [todayYmd],
  );
  const at = React.useCallback(
    (day: number, hours: number) => {
      const d = new Date(WEEK_START);
      d.setDate(d.getDate() + day);
      d.setHours(Math.floor(hours), Math.round((hours % 1) * 60), 0, 0);
      return d;
    },
    [WEEK_START],
  );

  const events = React.useMemo<CalendarEvent<EventData>[]>(
    () =>
      appointments.map((a) => {
        const type = a.service;
        return {
          id: a.id,
          title: `${a.service} · ${a.patient}`,
          start: at(a.day, a.start),
          end: at(a.day, a.start + a.length),
          color: colorOf(type),
          readOnly: true,
          data: { appointment: a, type, byAi: a.bookedBy !== "staff" },
        };
      }),
    [appointments, at, colorOf],
  );
  const visible = events.filter((e) => !hidden.has(e.data!.type));

  const perDay = (d: Date) => {
    const list = events.filter((e) => sameDay(e.start, d));
    return { total: list.length, ai: list.filter((e) => e.data!.byAi).length };
  };
  const countByType = (t: string) =>
    events.filter((e) => e.data!.type === t).length;
  const aiTotal = events.filter((e) => e.data!.byAi).length;
  const today = appointments
    .filter((a) => sameDay(at(a.day, 0), TODAY))
    .sort((a, b) => a.start - b.start);

  const toggleType = (t: string, on: boolean) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (on) next.delete(t);
      else next.add(t);
      return next;
    });

  return (
    <div className="grid gap-8 lg:grid-cols-[256px_minmax(0,1fr)] lg:gap-10">
      {/* ---------------- Left rail ---------------- */}
      <aside aria-label="Calendar filters" className="flex flex-col gap-8">
        <Calendar
          mode="range"
          selected={{ from: WEEK_START, to: at(4, 0) }}
          defaultMonth={WEEK_START}
          today={TODAY}
          showOutsideDays
          weekStartsOn={1}
          className="rounded-xl border border-border bg-card p-3 [--cell-size:--spacing(8)]"
        />

        <section>
          <p className={`${eyebrow} mb-3`}>Services</p>
          <ul className="flex flex-col gap-2.5">
            {legend.map((t, i) => {
              const id = `service-${i}`;
              return (
                <li key={t.name} className="flex items-center gap-3">
                  <Checkbox
                    id={id}
                    checked={!hidden.has(t.name)}
                    onCheckedChange={(v) => toggleType(t.name, !!v)}
                  />
                  <span
                    aria-hidden="true"
                    className="size-2.5 rounded-full"
                    style={{ background: t.color }}
                  />
                  <Label htmlFor={id} className="flex-1 text-sm font-normal">
                    {t.name}
                  </Label>
                  <span className="text-xs text-subtle tabular-nums">
                    {countByType(t.name)}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        <section>
          <p className={`${eyebrow} mb-3`}>Who booked it</p>
          <ul className="flex flex-col gap-2.5 text-sm">
            <li className="flex items-center gap-3">
              <AiMark />
              <span className="flex-1">Your AI team</span>
              <span className="text-xs text-subtle tabular-nums">
                {aiTotal}
              </span>
            </li>
            <li className="flex items-center gap-3">
              <span className="inline-flex h-4 items-center rounded-full border border-border px-1.5 text-[10px] font-medium leading-none text-muted-foreground">
                Staff
              </span>
              <span className="flex-1 text-muted-foreground">Your staff</span>
              <span className="text-xs text-subtle tabular-nums">
                {events.length - aiTotal}
              </span>
            </li>
          </ul>
        </section>

        <section>
          <p className={`${eyebrow} mb-2`}>Today · {todayLabel}</p>
          {today.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing booked today.</p>
          ) : null}
          <ItemGroup className="gap-0 has-data-[size=sm]:gap-0">
            {today.map((a, i) => (
              <React.Fragment key={a.id}>
                <Item size="sm" className="px-0">
                  <ItemMedia>
                    <Avatar className="size-8">
                      <AvatarFallback
                        className={`text-xs font-medium ${avatarTint(a.patient)}`}
                      >
                        {initials(a.patient)}
                      </AvatarFallback>
                    </Avatar>
                  </ItemMedia>
                  <ItemContent className="min-w-0 gap-0.5">
                    <ItemTitle className="text-sm font-medium">
                      {a.patient}
                    </ItemTitle>
                    <ItemDescription className="text-xs">
                      {clock(a.start)} · {a.service}
                    </ItemDescription>
                  </ItemContent>
                  {a.bookedBy !== "staff" ? (
                    <ItemActions>
                      <AiMark />
                    </ItemActions>
                  ) : null}
                </Item>
                {i !== today.length - 1 && <ItemSeparator className="my-0" />}
              </React.Fragment>
            ))}
          </ItemGroup>
        </section>
      </aside>

      {/* ---------------- Week grid (ReUI Event Calendar) ---------------- */}
      <section
        aria-label="Week schedule"
        className="order-first min-w-0 lg:order-none"
      >
        <p className="mb-6 max-w-[52ch] text-xl text-muted-foreground">
          <span className="font-semibold text-foreground">
            {events.length} {events.length === 1 ? "visit" : "visits"}
          </span>{" "}
          this week. Your AI team booked {aiTotal} of them.
        </p>

        {/* On phones the five days scroll sideways inside this frame, never the page. */}
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <EventCalendar<EventData>
            events={visible}
            defaultView="days"
            defaultDayCount={5}
            defaultDate={WEEK_START}
            weekStartsOn={1}
            dayStartHour={startHour}
            dayEndHour={endHour}
            defaultInteractions={{
              drag: false,
              resize: false,
              selectSlot: false,
            }}
            nowIndicator={false}
            eventTooltip
            className="h-[680px] min-w-[640px]"
            classNames={{ allDaySection: "hidden" }}
            renderDayHeader={({ day }) => {
              const { total, ai } = perDay(day);
              const isToday = sameDay(day, TODAY);
              return (
                <div className="flex flex-col items-start px-2 py-2 text-left">
                  <span className="text-xs text-subtle">
                    {day.toLocaleDateString("en-US", { weekday: "short" })}
                  </span>
                  <span
                    className={cn(
                      "text-xl font-semibold tabular-nums",
                      isToday && "underline decoration-2 underline-offset-4",
                    )}
                  >
                    {day.getDate()}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {total} {total === 1 ? "visit" : "visits"} · {ai} by AI
                  </span>
                </div>
              );
            }}
            renderEvent={({ occurrence }) => {
              const d = occurrence.event.data!;
              const a = d.appointment;
              const by = a.bookedBy;
              // 30-minute visits: one row, so the name is never half-clipped.
              if (a.length < 0.75)
                return (
                  <div className="flex h-full min-w-0 items-center gap-1 overflow-hidden px-1.5 text-left text-[11px]">
                    {d.byAi ? <AiMark className="shrink-0" /> : null}
                    <span className="truncate">
                      <span className="font-medium text-foreground">
                        {a.service}
                      </span>
                      <span className="text-muted-foreground">
                        {" "}
                        · {a.patient}
                      </span>
                    </span>
                  </div>
                );
              return (
                <div className="flex h-full min-w-0 flex-col gap-0.5 overflow-hidden px-1.5 py-1 text-left text-[11px] leading-snug">
                  <span className="flex min-w-0 items-center gap-1">
                    {d.byAi ? <AiMark className="shrink-0" /> : null}
                    <span className="truncate font-medium text-foreground">
                      {a.service}
                    </span>
                  </span>
                  <span className="truncate text-muted-foreground">
                    {a.patient}
                  </span>
                  {a.length >= 1.5 && typeof by !== "string" ? (
                    <span className="truncate text-subtle">
                      {by.agent} · {by.channel}
                    </span>
                  ) : null}
                </div>
              );
            }}
            renderEventTooltip={({ occurrence }) => {
              const a = occurrence.event.data!.appointment;
              const by = a.bookedBy;
              return (
                <div className="text-xs">
                  <p className="font-medium">
                    {a.patient} · {a.service}
                  </p>
                  <p className="opacity-80">
                    {clock(a.start)} – {clock(a.start + a.length)} ·{" "}
                    {typeof by === "string"
                      ? "Booked by your staff"
                      : `Booked by AI (${by.agent}, ${by.channel.toLowerCase()}) ${by.at}`}
                  </p>
                </div>
              );
            }}
            renderDayColumnBackground={({ day, boundsStartMin }) => {
              const info = days[(day.getDay() + 6) % 7];
              if (!info?.closesAt) return null;
              // ReUI: position overlays with calc(var(--ec-hour-height) * minutes / 60).
              const offsetHours = (info.closesAt * 60 - boundsStartMin) / 60;
              return (
                <div
                  className="absolute inset-x-0 bottom-0 bg-[repeating-linear-gradient(135deg,transparent_0_6px,var(--border)_6px_7px)] px-2 pt-2 text-xs text-subtle"
                  style={{
                    top: `calc(var(--ec-hour-height) * ${offsetHours})`,
                  }}
                >
                  Closed from {clock(info.closesAt)}
                </div>
              );
            }}
          >
            <EventCalendarContent />
          </EventCalendar>
        </div>

        <p className="mt-4 text-xs text-subtle">
          Hover an appointment to see who booked it and when.
        </p>
      </section>
    </div>
  );
}
