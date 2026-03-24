import { LayoutShell } from "@/components/layout-shell";
import { useMyBookings, useCancelBooking } from "@/hooks/use-bookings";
import { useUser } from "@/hooks/use-auth";
import { useRooms } from "@/hooks/use-rooms";
import { Redirect } from "wouter";
import { format, parseISO, isPast } from "date-fns";
import { Loader2, Calendar, Clock, MapPin, AlertCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

export default function MyBookings() {
  const { data: user, isLoading: isAuthLoading } = useUser();
  const { data: bookings, isLoading: isBookingsLoading } = useMyBookings();
  const { data: rooms } = useRooms();
  const { mutate: cancelBooking, isPending: isCancelling } = useCancelBooking();

  if (isAuthLoading) return null;
  if (!user) return <Redirect to="/login" />;

  // Helper to get room name since booking might just have roomId
  const getRoomName = (roomId: number) => {
    return rooms?.find(r => r.id === roomId)?.name || "Unknown Room";
  };

  const sortedBookings = bookings?.sort((a, b) => {
    return new Date(b.date + 'T' + b.startTime).getTime() - new Date(a.date + 'T' + a.startTime).getTime();
  });

  return (
    <LayoutShell>
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-display font-bold">My Bookings</h1>
          <p className="text-muted-foreground mt-1">Manage your upcoming and past reservations.</p>
        </div>

        {isBookingsLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : sortedBookings?.length === 0 ? (
          <div className="text-center py-16 bg-muted/30 rounded-3xl border border-dashed">
            <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold">No bookings yet</h3>
            <p className="text-muted-foreground mt-2 mb-6">You haven't made any room reservations yet.</p>
            <Button onClick={() => window.location.href = '/dashboard'}>Book a Room</Button>
          </div>
        ) : (
          <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Room Name</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedBookings?.map((booking) => {
                  const bookingDateTime = parseISO(`${booking.date}T${booking.endTime}`);
                  const isExpired = isPast(bookingDateTime);
                  const isCancelled = booking.status === 'cancelled';

                  return (
                    <TableRow key={booking.id} className={cn(isCancelled && "opacity-60 bg-muted/40")}>
                      <TableCell className="font-medium">
                        {getRoomName(booking.roomId)}
                        {booking.purpose && (
                          <div className="text-xs text-muted-foreground font-normal truncate max-w-[200px]">
                            {booking.purpose}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                          {format(parseISO(booking.date), "MMM d, yyyy")}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 whitespace-nowrap">
                          <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                          {booking.startTime} - {booking.endTime}
                        </div>
                      </TableCell>
                      <TableCell>
                        {isCancelled ? (
                          <Badge variant="destructive" className="text-xs">Cancelled</Badge>
                        ) : isExpired ? (
                          <Badge variant="secondary" className="text-xs">Completed</Badge>
                        ) : (
                          <Badge className="bg-green-600 text-white text-xs hover:bg-green-700">Confirmed</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {!isExpired && !isCancelled && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive h-8 px-2">
                                <XCircle className="w-4 h-4 mr-1.5" /> Cancel
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Cancel Booking?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to cancel your reservation for <strong>{getRoomName(booking.roomId)}</strong> on {booking.date}? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Keep it</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => cancelBooking(booking.id)}
                                  className="bg-destructive hover:bg-destructive/90"
                                >
                                  Yes, Cancel
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </LayoutShell>
  );
}
