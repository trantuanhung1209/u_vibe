"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useThemeColor } from "@/contexts/theme-context";
import { useMemo } from "react";

interface ProjectsChartProps {
  data: Array<{
    date: string;
    count: number;
  }>;
}

export function ProjectsChart({ data }: ProjectsChartProps) {
  const { themeColor, theme } = useThemeColor();

  const chartColor = useMemo(() => {
    if (theme === "dark") {
      // Dark mode - sử dụng màu sáng hơn
      switch (themeColor) {
        case "gray":
          return "hsl(27, 79%, 60%)"; // Orange sáng
        case "amethyst":
          return "hsl(270, 80%, 70%)"; // Purple sáng
        case "bubblegum":
          return "hsl(340, 82%, 62%)"; // Pink sáng
        case "claude":
          return "hsl(24, 85%, 63%)"; // Orange sáng
        default:
          return "hsl(var(--primary))"; // Default
      }
    } else {
      // Light mode
      switch (themeColor) {
        case "gray":
          return "hsl(27, 79%, 50%)";
        case "amethyst":
          return "hsl(270, 80%, 60%)";
        case "bubblegum":
          return "hsl(340, 82%, 52%)";
        case "claude":
          return "hsl(24, 85%, 53%)";
        default:
          return "hsl(var(--primary))";
      }
    }
  }, [themeColor, theme]);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Projects Created Over Time</CardTitle>
        <CardDescription>
          Daily project creation trends
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                className="text-xs"
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return `${date.getMonth() + 1}/${date.getDate()}`;
                }}
              />
              <YAxis className="text-xs" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "2px solid hsl(var(--border))",
                  borderRadius: "8px",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  color: "hsl(var(--card-foreground))",
                }}
                labelStyle={{
                  color: "hsl(var(--foreground))",
                  fontWeight: "600",
                  marginBottom: "4px",
                }}
                itemStyle={{
                  color: "hsl(var(--foreground))",
                }}
                labelFormatter={(value) => new Date(value).toLocaleDateString()}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="count"
                stroke={chartColor}
                strokeWidth={2}
                name="Projects"
                dot={{ fill: chartColor }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
