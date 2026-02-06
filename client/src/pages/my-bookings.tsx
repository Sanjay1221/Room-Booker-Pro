import { LayoutShell } from "@/components/layout-shell";
import { useMyBookings, useCancelBooking } from "@/hooks/use-bookings";
import { useUser } from "@/hooks/use-auth";
import { useRooms } from "@/hooks/use-rooms";
import { Redirect } from "wouter";
import { format, parseISO, isPast } from "date-fns";
import { Loader2, Calendar, Clock, MapPin, AlertCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
          <div className="space-y-4">
            {sortedBookings?.map((booking) => {
              const bookingDateTime = parseISO(`${booking.date}T${booking.endTime}`);
              const isExpired = isPast(bookingDateTime);
              const isCancelled = booking.status === 'cancelled';

              return (
                <Card 
                  key={booking.id} 
                  className={cn(
                    "p-5 transition-all hover:shadow-md border-l-4",
                    isCancelled ? "border-l-destructive/50 opacity-75 bg-muted/20" : 
                    isExpired ? "border-l-muted-foreground/30 bg-muted/10" : "border-l-primary"
                  )}
                >
                  <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <h3 className={cn("font-bold text-lg", isCancelled && "line-through text-muted-foreground")}>
                          {getRoomName(booking.roomId)}
                        </h3>
                        {isCancelled ? (
                          <Badge variant="destructive" className="text-xs">Cancelled</Badge>
                        ) : isExpired ? (
                          <Badge variant="secondary" className="text-xs">Completed</Badge>
                        ) : (
                          <Badge className="bg-green-600 text-white text-xs hover:bg-green-700">Confirmed</Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center gap-4 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {format(parseISO(booking.date), "EEE, MMM d, yyyy")}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {booking.startTime} - {booking.endTime}
                        </span>
                      </div>
                      {booking.purpose && (
                        <p className="text-sm pt-1 italic text-muted-foreground">"{booking.purpose}"</p>
                      )}
                    </div>

                    {!isExpired && !isCancelled && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/20">
                            Cancel
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
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </LayoutShell>
  );
}
