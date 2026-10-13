"use client"

// shadcn/ui chart block "chart-radial-text" (A radial chart with text)
// Source: https://ui.shadcn.com/charts (registry: https://ui.shadcn.com/r/styles/new-york-v4/chart-radial-text.json)
// License: MIT (shadcn-ui/ui). Installed via shadcn CLI; built on shadcn Chart + Recharts.
// Adapted: shows a share (22 of 48 after hours), so the arc's end angle is the
// share of a full turn instead of a fixed 250°; ink instead of a chart colour, so
// the green accent stays unique to the action; the centre reads "22 / of 48";
// shown as an open section (heading + hairline divider, no card surface) to match
// the stat row; the track uses the muted token instead of Recharts' default #eee;
// no mount animation.
import {
  Label,
  PolarGrid,
  PolarRadiusAxis,
  RadialBar,
  RadialBarChart,
} from "recharts"

import { ChartContainer, type ChartConfig } from "@/components/ui/chart"

const chartConfig = {
  afterHours: {
    label: "After hours",
    color: "var(--foreground)",
  },
} satisfies ChartConfig

export function AfterHoursShare({ afterHours, total }: { afterHours: number; total: number }) {
  const share = total > 0 ? afterHours / total : 0
  const chartData = [{ key: "afterHours", value: afterHours, fill: "var(--color-afterHours)" }]
  return (
    <section aria-labelledby="after-hours-h" className="flex h-full flex-col rounded-2xl border border-border/80 bg-card/85 shadow-[inset_0_1px_0_rgb(255_255_255/0.7),0_14px_40px_-28px_color-mix(in_oklch,var(--primary)_55%,transparent)] backdrop-blur p-7">
      <div>
        <h2 id="after-hours-h" className="font-serif text-2xl leading-tight tracking-[-0.01em]">After hours</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">Conversations outside opening hours</p>
      </div>
      <div className="flex flex-1 items-center justify-center pt-6">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square h-[170px]"
          role="img"
          aria-label={`${afterHours} of ${total} conversations were after hours`}
        >
          <RadialBarChart
            data={chartData}
            startAngle={90}
            endAngle={90 - 360 * share}
            outerRadius={78}
            innerRadius={68}
          >
            <PolarGrid
              gridType="circle"
              radialLines={false}
              stroke="none"
              className="first:fill-muted last:fill-background"
              polarRadius={[78, 68]}
            />
            <RadialBar
              dataKey="value"
              background={{ fill: "var(--muted)" }}
              cornerRadius={10}
              isAnimationActive={false}
            />
            <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        <tspan
                          x={viewBox.cx}
                          y={viewBox.cy}
                          className="fill-foreground text-2xl font-semibold tabular-nums"
                        >
                          {afterHours}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 22}
                          className="fill-muted-foreground text-xs"
                        >
                          of {total}
                        </tspan>
                      </text>
                    )
                  }
                }}
              />
            </PolarRadiusAxis>
          </RadialBarChart>
        </ChartContainer>
      </div>
      <p className="pt-3 text-center text-xs text-muted-foreground">
        {Math.round(share * 100)}% came in when no one would have picked up.
      </p>
    </section>
  )
}
