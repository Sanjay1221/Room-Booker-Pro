import { LayoutShell } from "@/components/layout-shell";
import { useRoom } from "@/hooks/use-rooms";
import { useRoomBookings, useCreateBooking } from "@/hooks/use-bookings";
import { useUser } from "@/hooks/use-auth";
import { Redirect, useLocation, useRoute } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useState, useMemo } from "react";
import { format, addMinutes, parse, isBefore, startOfDay } from "date-fns";
import { Loader2, Calendar as CalendarIcon, Clock, Users, ArrowLeft, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

// Time slots generation helper
const generateTimeSlots = () => {
  const slots = [];
  let start = parse("08:00", "HH:mm", new Date());
  const end = parse("18:00", "HH:mm", new Date());

  while (isBefore(start, end)) {
    slots.push(format(start, "HH:mm"));
    start = addMinutes(start, 10);
  }
  return slots;
};

const TIME_SLOTS = generateTimeSlots();

export default function BookingPage() {
  const [match, params] = useRoute("/book/:id");
  const roomId = parseInt(params?.id || "0");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const { data: user, isLoading: isAuthLoading } = useUser();
  const { data: room, isLoading: isRoomLoading } = useRoom(roomId);
  
  const [date, setDate] = useState<Date | undefined>(new Date());
  const formattedDate = date ? format(date, "yyyy-MM-dd") : undefined;
  
  const { data: bookings } = useRoomBookings(roomId, formattedDate);
  const { mutate: createBooking, isPending: isBooking } = useCreateBooking();

  const [startTime, setStartTime] = useState<string | null>(null);
  const [duration, setDuration] = useState<string>("60"); // minutes
  const [purpose, setPurpose] = useState("");

  if (isAuthLoading) return null;
  if (!user) return <Redirect to="/login" />;
  if (isRoomLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!room) return <Redirect to="/dashboard" />;

  // Calculate unavailability
  const isSlotUnavailable = (slot: string) => {
    if (!bookings) return false;
    
    const timeToMinutes = (time: string) => {
      const [h, m] = time.split(':').map(Number);
      return h * 60 + m;
    };
    
    const newStart = timeToMinutes(slot);
    const newEnd = newStart + parseInt(duration); // duration is in minutes
    
    return bookings.some(b => {
      const start = timeToMinutes(b.startTime);
      const end = timeToMinutes(b.endTime);
      
      // 10-minute gap validation
      return (newStart < end + 10 && newEnd > start - 10);
    });
  };

  const handleBooking = () => {
    if (!date || !startTime) return;
    
    // Calculate end time
    const startObj = parse(startTime, "HH:mm", new Date());
    const endObj = addMinutes(startObj, parseInt(duration));
    const endTime = format(endObj, "HH:mm");

    createBooking({
      roomId: room.id,
      date: format(date, "yyyy-MM-dd"),
      startTime,
      endTime,
      purpose,
    }, {
      onSuccess: () => {
        toast({
          title: "Booking Confirmed",
          description: "Your room has been successfully booked.",
          variant: "default",
        });
        setLocation("/bookings");
      },
      onError: (error) => {
        toast({
          title: "Booking Failed",
          description: error.message || "Could not complete booking.",
          variant: "destructive",
        });
      }
    });
  };

  return (
    <LayoutShell>
      <div className="max-w-5xl mx-auto">
        <Button 
          variant="ghost" 
          className="mb-6 pl-0 hover:pl-2 transition-all hover:bg-transparent" 
          onClick={() => setLocation("/dashboard")}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Rooms
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Room Info & Picker */}
          <div className="lg:col-span-8 space-y-6">
            <Card className="border-none shadow-none bg-transparent">
              <div className="flex flex-col md:flex-row gap-6 md:items-start">
                <div className="w-full md:w-48 aspect-video md:aspect-square rounded-xl overflow-hidden bg-muted flex-shrink-0">
                  {room.imageUrl && (
                    <img src={room.imageUrl} alt={room.name} className="w-full h-full object-cover" />
                  )}
                </div>
                <div>
                  <h1 className="text-3xl font-display font-bold text-foreground">{room.name}</h1>
                  <div className="flex flex-wrap gap-4 mt-3 text-muted-foreground text-sm">
                    <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-md shadow-sm border">
                      <Users className="w-4 h-4 text-primary" />
                      <span>Capacity: {room.capacity}</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-md shadow-sm border">
                      <Clock className="w-4 h-4 text-primary" />
                      <span>08:00 - 18:00</span>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {room.features?.split(",").map((f, i) => (
                      <Badge key={i} variant="secondary">{f.trim()}</Badge>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
            
            <Separator />

            <div className="grid md:grid-cols-2 gap-8">
              {/* Date Picker */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2 text-foreground">
                  <CalendarIcon className="w-5 h-5 text-primary" />
                  Select Date
                </h3>
                <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-sm hover:shadow-md transition-shadow">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    disabled={(date) => date < startOfDay(new Date())}
                    className="rounded-md mx-auto"
                  />
                </div>
              </div>

              {/* Time Selection */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2 text-foreground">
                  <Clock className="w-5 h-5 text-primary" />
                  Select Start Time
                </h3>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                  {TIME_SLOTS.map((slot) => {
                    const unavailable = isSlotUnavailable(slot);
                    return (
                      <button
                        key={slot}
                        disabled={unavailable}
                        onClick={() => setStartTime(slot)}
                        className={cn(
                          "px-3 py-2 text-sm rounded-lg border transition-all duration-200 font-medium",
                          startTime === slot 
                            ? "bg-primary text-primary-foreground border-primary shadow-md ring-2 ring-primary/20" 
                            : unavailable
                              ? "bg-muted text-muted-foreground opacity-50 cursor-not-allowed border-transparent"
                              : "bg-white hover:border-primary/50 hover:bg-primary/5 text-foreground"
                        )}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <AnimatePresence>
              {startTime && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4 pt-4"
                >
                  <Separator />
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2.5">
                      <Label className="text-sm font-semibold text-slate-700">Duration</Label>
                      <select 
                        className="w-full h-11 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-sm transition-all"
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                      >
                        <option value="30">30 Minutes</option>
                        <option value="60">1 Hour</option>
                        <option value="90">1.5 Hours</option>
                        <option value="120">2 Hours</option>
                      </select>
                    </div>
                    <div className="space-y-2.5">
                      <Label className="text-sm font-semibold text-slate-700">Meeting Purpose</Label>
                      <Input 
                        className="h-11 rounded-md border border-slate-200 bg-white focus-visible:ring-2 focus-visible:ring-primary shadow-sm transition-all"
                        placeholder="e.g. Q4 Strategy Sync" 
                        value={purpose}
                        onChange={(e) => setPurpose(e.target.value)}
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right Column: Summary Card */}
          <div className="lg:col-span-4">
            <div className="sticky top-24">
              <Card className="bg-gradient-to-br from-white to-slate-50 border-primary/10 shadow-xl shadow-primary/5">
                <CardContent className="p-6 space-y-6">
                  <h3 className="font-display text-xl font-bold text-primary">Booking Summary</h3>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between py-2 border-b border-dashed">
                      <span className="text-muted-foreground">Room</span>
                      <span className="font-medium text-right">{room.name}</span>
                    </div>
                    
                    <div className="flex justify-between py-2 border-b border-dashed">
                      <span className="text-muted-foreground">Date</span>
                      <span className="font-medium text-right">
                        {date ? format(date, "EEE, MMM d, yyyy") : "-"}
                      </span>
                    </div>

                    <div className="flex justify-between py-2 border-b border-dashed">
                      <span className="text-muted-foreground">Time</span>
                      <span className="font-medium text-right">
                        {startTime ? (
                          <span className="flex items-center gap-1.5 text-primary bg-primary/10 px-2 py-0.5 rounded text-sm">
                            <Clock className="w-3 h-3" />
                            {startTime} ({duration}m)
                          </span>
                        ) : (
                          "Select a time"
                        )}
                      </span>
                    </div>
                  </div>

                  <Button 
                    className="w-full h-12 text-lg bg-primary hover:bg-primary/90 text-white shadow-md font-semibold transition-all duration-200"
                    disabled={!startTime || !purpose || isBooking}
                    onClick={handleBooking}
                  >
                    {isBooking ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Booking...
                      </>
                    ) : (
                      <>
                        Confirm Booking
                        <CheckCircle2 className="ml-2 h-5 w-5" />
                      </>
                    )}
                  </Button>
                  
                  <p className="text-xs text-center text-muted-foreground">
                    You can cancel this booking later from your dashboard.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </LayoutShell>
  );
}
