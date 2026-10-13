"use client"

// shadcn/ui chart block "chart-area-default" (A simple area chart)
// Source: https://ui.shadcn.com/charts (registry: https://ui.shadcn.com/r/styles/new-york-v4/chart-area-default.json)
// License: MIT (shadcn-ui/ui). Installed via shadcn CLI; built on shadcn Chart + Recharts.
// Adapted: recovered revenue per week instead of visitors per month, currency
// tooltip, the product's accent as the one series colour, a quieter card to match
// the Dashboard, a footer note about where the numbers come from, and no
// mount animation (NumberFlow stays the Dashboard's only motion).
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { usd, type TrendPoint } from "@/lib/dashboard-data"

const chartConfig = {
  recovered: {
    label: "Recovered",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig

export function RecoveredTrendChart({ data, note }: { data: TrendPoint[]; note: string }) {
  return (
    <Card className="h-full gap-4 rounded-2xl border border-border/80 bg-card/85 shadow-[inset_0_1px_0_rgb(255_255_255/0.7),0_14px_40px_-28px_color-mix(in_oklch,var(--primary)_55%,transparent)] backdrop-blur py-7 ring-0 [--card-spacing:--spacing(7)]">
      <CardHeader>
        <CardTitle className="font-serif text-2xl font-normal tracking-[-0.01em]">Recovered revenue</CardTitle>
        <CardDescription className="text-sm">Last {data.length} weeks</CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        <ChartContainer config={chartConfig} className="aspect-auto h-[180px] w-full">
          <AreaChart
            accessibilityLayer
            data={data}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="week"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              interval="preserveStartEnd"
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  indicator="line"
                  formatter={(value) => usd(Number(value))}
                />
              }
            />
            <Area
              dataKey="recovered"
              type="natural"
              fill="var(--color-recovered)"
              fillOpacity={0.12}
              stroke="var(--color-recovered)"
              strokeWidth={2}
              isAnimationActive={false}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="border-t-0 bg-transparent pt-0 pb-0">
        <p className="text-xs text-subtle">{note}</p>
      </CardFooter>
    </Card>
  )
}
