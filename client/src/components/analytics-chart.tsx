import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useQuery } from "@tanstack/react-query";

export function RoomAnalyticsChart() {
    const { data: analytics, isLoading } = useQuery({
        queryKey: ['/api/analytics/rooms'],
        queryFn: async () => {
            const res = await fetch('/api/analytics/rooms');
            if (!res.ok) throw new Error("Failed to fetch analytics");
            return res.json();
        }
    });

    return (
        <Card>
            <CardHeader>
                <CardTitle>Room Usage Analytics</CardTitle>
                <CardDescription>Number of total bookings for each room.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] w-full">
                    {isLoading ? (
                        <div className="flex h-full items-center justify-center text-muted-foreground">Loading...</div>
                    ) : analytics?.length ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={analytics}>
                                <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px' }} />
                                <Bar dataKey="totalBookings" fill="currentColor" radius={[4, 4, 0, 0]} className="fill-primary" />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex h-full items-center justify-center text-muted-foreground">No data available yet.</div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
