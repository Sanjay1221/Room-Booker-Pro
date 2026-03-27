import { LayoutShell } from "@/components/layout-shell";
import { useUser } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { Loader2, Users, Building, Calendar, Settings } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { RoomAnalyticsChart } from "@/components/analytics-chart";
import { BarChart3, Plus } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AdminDashboard() {
    const { data: user, isLoading: isAuthLoading } = useUser();
    const queryClient = useQueryClient();
    const { toast } = useToast();

    const { data: bookings, isLoading: isBookingsLoading } = useQuery({
        queryKey: ['/api/admin/bookings'],
        queryFn: async () => {
            const res = await fetch("/api/admin/bookings");
            if (!res.ok) throw new Error("Failed to fetch admin bookings");
            return res.json();
        },
        enabled: !!user?.isAdmin,
    });

    const { data: rooms, isLoading: isRoomsLoading } = useQuery({
        queryKey: [api.rooms.list.path],
        queryFn: async () => {
            const res = await fetch(api.rooms.list.path);
            if (!res.ok) throw new Error("Failed to fetch rooms");
            return res.json();
        },
    });

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        capacity: 10,
        location: "",
        features: "",
        imageUrl: ""
    });

    const { mutate: createRoom, isPending: isCreatingRoom } = useMutation({
        mutationFn: async (data: any) => {
            // Convert capacity to a number just in case
            const payload = { ...data, capacity: Number(data.capacity) };
            const res = await fetch("/api/rooms", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || "Failed to create room");
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [api.rooms.list.path] });
            toast({ title: "Room Created", description: "The new room has been added successfully." });
            setIsDialogOpen(false);
            setFormData({ name: "", capacity: 10, location: "", features: "", imageUrl: "" });
        },
        onError: (error) => toast({ title: "Failed to Create", description: error.message, variant: "destructive" })
    });

    const { mutate: adminCancelBooking } = useMutation({
        mutationFn: async (id: number) => {
            const res = await fetch(`/api/admin/bookings/${id}/cancel`, { method: "POST" });
            if (!res.ok) throw new Error("Failed to cancel booking");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/admin/bookings'] });
            toast({ title: "Booking Cancelled", description: "The reservation was overridden and cancelled." });
        },
        onError: (error) => toast({ title: "Failed to Cancel", description: error.message, variant: "destructive" })
    });

    if (isAuthLoading) return null;
    if (!user) return <Redirect to="/login" />;
    if (!user.isAdmin) return <Redirect to="/dashboard" />;

    const isLoading = isBookingsLoading || isRoomsLoading;

    const getRoomName = (roomId: number) => {
        return rooms?.find((r: any) => r.id === roomId)?.name || "Unknown Room";
    };

    return (
        <LayoutShell>
            <div className="space-y-6 max-w-6xl mx-auto">
                <div>
                    <h1 className="text-3xl font-display font-bold">Admin Dashboard</h1>
                    <p className="text-muted-foreground mt-1">Manage meeting rooms and system-wide bookings.</p>
                </div>

                {isLoading ? (
                    <div className="flex justify-center items-center py-24">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : (
                    <Tabs defaultValue="bookings" className="space-y-6">
                        <div className="flex overflow-x-auto pb-2">
                            <TabsList className="bg-muted min-w-max">
                                <TabsTrigger value="bookings" className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4" /> All Bookings
                                </TabsTrigger>
                                <TabsTrigger value="analytics" className="flex items-center gap-2">
                                    <BarChart3 className="w-4 h-4" /> Analytics
                                </TabsTrigger>
                                <TabsTrigger value="rooms" className="flex items-center gap-2">
                                    <Building className="w-4 h-4" /> Room Management
                                </TabsTrigger>
                                <TabsTrigger value="users" disabled className="flex items-center gap-2 opacity-50">
                                    <Users className="w-4 h-4" /> Users (Pro)
                                </TabsTrigger>
                                <TabsTrigger value="settings" disabled className="flex items-center gap-2 opacity-50">
                                    <Settings className="w-4 h-4" /> Settings
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        <TabsContent value="bookings" className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Global Bookings</CardTitle>
                                    <CardDescription>View and manage reservations across all users.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="rounded-md border">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>System ID</TableHead>
                                                    <TableHead>Room</TableHead>
                                                    <TableHead>User ID</TableHead>
                                                    <TableHead>Date & Time</TableHead>
                                                    <TableHead>Members</TableHead>
                                                    <TableHead>Purpose</TableHead>
                                                    <TableHead>Status</TableHead>
                                                    <TableHead className="text-right">Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {bookings?.length === 0 ? (
                                                    <TableRow>
                                                        <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                                                            No active bookings in the system.
                                                        </TableCell>
                                                    </TableRow>
                                                ) : (
                                                    bookings?.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((booking: any) => (
                                                        <TableRow key={booking.id} className={booking.status === "cancelled" ? "opacity-50" : ""}>
                                                            <TableCell className="font-mono text-xs text-muted-foreground">#{booking.id}</TableCell>
                                                            <TableCell className="font-medium">{getRoomName(booking.roomId)}</TableCell>
                                                            <TableCell>User {booking.userId}</TableCell>
                                                            <TableCell>
                                                                <div className="text-sm">{format(parseISO(booking.date), "MMM d, yyyy")}</div>
                                                                <div className="text-xs text-muted-foreground">{booking.startTime} - {booking.endTime}</div>
                                                            </TableCell>
                                                            <TableCell>{booking.members}</TableCell>
                                                            <TableCell className="max-w-[200px] truncate" title={booking.purpose}>{booking.purpose || "—"}</TableCell>
                                                            <TableCell>
                                                                <Badge variant={booking.status === "cancelled" ? "secondary" : "default"}>
                                                                    {booking.status}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                {booking.status !== "cancelled" && (
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        className="text-destructive h-7 text-xs border-destructive/20 hover:bg-destructive/10 leading-none"
                                                                        onClick={() => adminCancelBooking(booking.id)}
                                                                    >
                                                                        Force Cancel
                                                                    </Button>
                                                                )}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="analytics" className="space-y-4">
                            <RoomAnalyticsChart />
                        </TabsContent>

                        <TabsContent value="rooms" className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <CardTitle>Meeting Rooms</CardTitle>
                                            <CardDescription>Overview of available physical spaces.</CardDescription>
                                        </div>
                                        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                                            <DialogTrigger asChild>
                                                <Button size="sm" className="gap-2">
                                                    <Plus className="w-4 h-4" /> Add Room
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent>
                                                <DialogHeader>
                                                    <DialogTitle>Create Meeting Room</DialogTitle>
                                                    <DialogDescription>Add a new room to your organization. Provide an image URL for the thumbnail.</DialogDescription>
                                                </DialogHeader>
                                                <div className="space-y-4 py-4">
                                                    <div className="space-y-2">
                                                        <Label>Room Name</Label>
                                                        <Input placeholder="E.g. Alpha Room" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="space-y-2">
                                                            <Label>Capacity</Label>
                                                            <Input type="number" min="1" value={formData.capacity} onChange={e => setFormData({ ...formData, capacity: parseInt(e.target.value) || 1 })} />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label>Location</Label>
                                                            <Input placeholder="E.g. 1st Floor" value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} />
                                                        </div>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Features</Label>
                                                        <Input placeholder="E.g. Projector, Whiteboard, Video Conferencing" value={formData.features} onChange={e => setFormData({ ...formData, features: e.target.value })} />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Image URL</Label>
                                                        <Input placeholder="https://unsplash.com/.../image.jpg" value={formData.imageUrl} onChange={e => setFormData({ ...formData, imageUrl: e.target.value })} />
                                                        <p className="text-xs text-muted-foreground">Provide a direct link to a public image to use as the room's thumbnail.</p>
                                                    </div>
                                                    <Button className="w-full mt-2" onClick={() => createRoom(formData)} disabled={isCreatingRoom || !formData.name || !formData.capacity || !formData.location}>
                                                        {isCreatingRoom ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                                        Create Room
                                                    </Button>
                                                </div>
                                            </DialogContent>
                                        </Dialog>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="rounded-md border">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Name</TableHead>
                                                    <TableHead>Location</TableHead>
                                                    <TableHead>Capacity</TableHead>
                                                    <TableHead>Features</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {rooms?.map((room: any) => (
                                                    <TableRow key={room.id}>
                                                        <TableCell className="font-medium">{room.name}</TableCell>
                                                        <TableCell>{room.location}</TableCell>
                                                        <TableCell>{room.capacity} seats</TableCell>
                                                        <TableCell>
                                                            <div className="flex flex-wrap gap-1">
                                                                {room.features?.split(",").map((f: string, i: number) => (
                                                                    <Badge key={i} variant="outline" className="text-[10px]">{f.trim()}</Badge>
                                                                ))}
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                )}
            </div>
        </LayoutShell>
    );
}
