import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend
} from "recharts";

const COLORS = ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe'];

export function RoomAnalyticsChart() {
    const { data: analytics, isLoading } = useQuery({
        queryKey: ['/api/analytics/rooms'],
        queryFn: async () => {
            const res = await fetch('/api/analytics/rooms');
            if (!res.ok) throw new Error("Failed to fetch analytics");
            return res.json();
        }
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!analytics || analytics.length === 0) {
        return (
            <div className="text-center p-12 text-muted-foreground border rounded-lg">
                No analytics data available yet.
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
            {/* Utilization Bar Chart */}
            <Card>
                <CardHeader>
                    <CardTitle>Room Utilization</CardTitle>
                    <CardDescription>Percentage of time each room is booked versus potential working hours.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="h-[300px] w-full mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={analytics} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                <YAxis unit="%" tick={{ fontSize: 12 }} />
                                <Tooltip
                                    cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                                    formatter={(value: number) => [`${value}%`, 'Utilization']}
                                />
                                <Bar dataKey="utilizationPercent" fill="#2563eb" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            {/* Booking Volume Pie Chart */}
            <Card>
                <CardHeader>
                    <CardTitle>Booking Volume</CardTitle>
                    <CardDescription>Total number of bookings distributed across all rooms.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={analytics}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={2}
                                    dataKey="totalBookings"
                                    nameKey="name"
                                    label={({ name, percent }) => percent > 0 ? `${name} ${(percent * 100).toFixed(0)}%` : null}
                                    labelLine={false}
                                >
                                    {analytics.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value: number) => [value, 'Total Bookings']} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
