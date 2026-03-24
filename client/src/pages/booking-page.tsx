import { LayoutShell } from "@/components/layout-shell";
import { useCreateBooking, useMultipleRoomBookings } from "@/hooks/use-bookings";
import { useRooms } from "@/hooks/use-rooms";
import { useUser } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Redirect, useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState, useMemo } from "react";
import { format, addMinutes, parse, isBefore, startOfDay } from "date-fns";
import { Loader2, Calendar as CalendarIcon, Clock, Users, ArrowLeft, CheckCircle2, Sparkles, MapPin, Mail, Building } from "lucide-react";
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

// Helper to convert HH:mm to minutes for easy comparison
const timeToMinutes = (timeValue: string) => {
  const [hours, minutes] = timeValue.split(':').map(Number);
  return hours * 60 + minutes;
};

const TIME_SLOTS = generateTimeSlots();

const AVAILABLE_REQUIREMENTS = [
  "Projector",
  "Whiteboard",
  "Video Conferencing",
  "Soundproof",
  "Large Screen",
  "Catering Area",
  "Executive Chairs"
];

export default function BookingPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: user, isLoading: isAuthLoading } = useUser();
  const { data: rooms } = useRooms();

  const [date, setDate] = useState<Date | undefined>(new Date());
  const [members, setMembers] = useState<string>("1");
  const parsedMembers = parseInt(members, 10) || 1;
  const formattedDate = date ? format(date, "yyyy-MM-dd") : undefined;

  const { mutate: createBooking, isPending: isBooking } = useCreateBooking();

  const [startTime, setStartTime] = useState<string | null>(null);
  const [duration, setDuration] = useState<string>("60"); // minutes
  const [purpose, setPurpose] = useState("");
  const [requirements, setRequirements] = useState<string[]>([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Calculate Suitable Rooms
  const suitableRooms = useMemo(() => {
    if (!rooms || rooms.length === 0) return [];

    return rooms
      .filter(r => r.capacity >= parsedMembers)
      .filter(r => {
        if (requirements.length === 0) return true;
        if (!r.features) return false;
        const roomFeatures = r.features.toLowerCase();
        return requirements.every(req => roomFeatures.includes(req.toLowerCase()));
      })
      .sort((a, b) => a.capacity - b.capacity);
  }, [rooms, parsedMembers, requirements]);

  const roomIds = useMemo(() => suitableRooms.map(r => r.id), [suitableRooms]);
  const bookingsQueries = useMultipleRoomBookings(roomIds, formattedDate);
  const existingBookingsByRoom = useMemo(() => {
    const map: Record<number, any[]> = {};
    roomIds.forEach((id, index) => {
      map[id] = bookingsQueries[index]?.data || [];
    });
    return map;
  }, [roomIds, bookingsQueries]);

  if (isAuthLoading) return null;
  if (!user) return <Redirect to="/login" />;

  const isRoomAvailableAtSlot = (roomId: number, slotStartMins: number, slotEndMins: number) => {
    const roomBookings = existingBookingsByRoom[roomId] || [];
    for (const b of roomBookings) {
      const existingStartMins = timeToMinutes(b.startTime);
      const existingEndMins = timeToMinutes(b.endTime);

      const bufferStart = existingStartMins - 10;
      const bufferEnd = existingEndMins + 10;

      const standardOverlap = (slotStartMins < existingEndMins) && (slotEndMins > existingStartMins);
      const bufferOverlap = (slotStartMins < bufferEnd) && (slotEndMins > bufferStart);

      if (standardOverlap || bufferOverlap) {
        return false;
      }
    }
    return true;
  };

  const isSlotUnavailable = (slot: string) => {
    if (suitableRooms.length === 0) return true; // No rooms match criteria at all

    const slotStartMins = timeToMinutes(slot);
    const slotEndMins = slotStartMins + parseInt(duration); // duration is in minutes

    return !suitableRooms.some(room => isRoomAvailableAtSlot(room.id, slotStartMins, slotEndMins));
  };

  // Calculate Recommended Room based on selected time (or just smallest if no time selected)
  const recommendedRoom = useMemo(() => {
    if (suitableRooms.length === 0) return null;
    if (!startTime) return suitableRooms[0];

    const slotStartMins = timeToMinutes(startTime);
    const slotEndMins = slotStartMins + parseInt(duration);

    // Find the smallest room that is actually available at this time
    return suitableRooms.find(room => isRoomAvailableAtSlot(room.id, slotStartMins, slotEndMins)) || null;
  }, [suitableRooms, startTime, duration, existingBookingsByRoom]);

  const calculateEndTime = () => {
    if (!startTime) return "";
    const startObj = parse(startTime, "HH:mm", new Date());
    const endObj = addMinutes(startObj, parseInt(duration));
    return format(endObj, "HH:mm");
  };

  const handleBooking = () => {
    if (!date || !startTime || !recommendedRoom) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    // 1. One-Day Advance Booking Rule Validation
    const [reqHour, reqMin] = startTime.split(':').map(Number);
    const meetingDateTime = new Date(date);
    meetingDateTime.setHours(reqHour, reqMin, 0, 0);

    const now = new Date();
    const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    if (meetingDateTime.getTime() < twentyFourHoursFromNow.getTime()) {
      toast({
        title: "Booking Failed",
        description: "Meeting rooms must be booked at least 1 day in advance.",
        variant: "destructive"
      });
      return;
    }

    setShowConfirmModal(true);
  };

  const confirmAndSubmitBooking = () => {
    if (!date || !startTime) return;

    createBooking({
      members: parsedMembers,
      requirements,
      date: format(date, "yyyy-MM-dd"),
      startTime,
      endTime: calculateEndTime(),
      purpose,
    }, {
      onSuccess: () => {
        setShowConfirmModal(false);
        setLocation("/bookings");
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
            <Card className="border p-6 rounded-2xl bg-gradient-to-r from-primary/10 via-background to-secondary/30 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-20 -mt-20"></div>
              <div className="relative z-10 flex flex-col gap-2">
                <div className="inline-flex items-center gap-2 mb-2 text-primary">
                  <Sparkles className="w-5 h-5" />
                  <span className="text-sm font-semibold tracking-wider uppercase">Premium Booking</span>
                </div>
                <h1 className="text-4xl font-display font-bold text-foreground">Find Your Perfect Space</h1>
                <p className="text-muted-foreground text-lg max-w-xl">We'll automatically match your team with the ideal meeting room based on your requirements and schedule.</p>
              </div>
            </Card>

            <Separator />

            <div className="space-y-4 pt-4">
              <Label className="text-lg font-semibold flex items-center gap-2">
                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                  <Users className="w-5 h-5" />
                </div>
                Team Size
              </Label>
              <div className="relative max-w-[240px]">
                <Input
                  type="number"
                  min="1"
                  required
                  className="pl-10 h-12 text-lg rounded-xl border-border/60 hover:border-primary/40 focus:border-primary bg-background shadow-sm transition-all shadow-primary/5"
                  placeholder="Number of participants"
                  value={members}
                  onChange={(e) => setMembers(e.target.value)}
                />
                <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              </div>
            </div>



            <Separator />

            <div className="space-y-4 pt-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                Required Facilities <span className="text-muted-foreground text-sm font-normal">(Optional)</span>
              </h3>
              <div className="flex flex-wrap gap-2.5">
                {AVAILABLE_REQUIREMENTS.map((req) => {
                  const isSelected = requirements.includes(req);
                  return (
                    <button
                      key={req}
                      onClick={() => {
                         setRequirements(prev =>
                           isSelected ? prev.filter(r => r !== req) : [...prev, req]
                         );
                      }}
                      className={cn(
                        "px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 border flex items-center gap-2",
                        isSelected 
                          ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20 scale-105" 
                          : "bg-background text-muted-foreground border-border/60 hover:border-primary/40 hover:bg-primary/5 hover:text-foreground hover:scale-105"
                      )}
                    >
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                      {req}
                    </button>
                  );
                })}
              </div>
            </div>

            <Separator />

            <div className="grid md:grid-cols-2 gap-8">
              {/* Date Picker */}
              <div className="space-y-4">
                <Label className="text-lg font-semibold flex items-center gap-2">
                  <div className="p-2 bg-primary/10 rounded-lg text-primary">
                    <CalendarIcon className="w-5 h-5" />
                  </div>
                  Date
                </Label>
                <div className="border border-border/60 rounded-2xl p-4 bg-background shadow-sm hover:shadow-md transition-shadow hover:border-primary/20">
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
                <Label className="text-lg font-semibold flex items-center gap-2">
                  <div className="p-2 bg-primary/10 rounded-lg text-primary">
                    <Clock className="w-5 h-5" />
                  </div>
                  Start Time
                </Label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar p-1">
                  {TIME_SLOTS.map((slot, i) => {
                    const unavailable = isSlotUnavailable(slot);
                    return (
                      <motion.button
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2, delay: Math.min(i * 0.02, 0.4) }}
                        key={slot}
                        disabled={unavailable}
                        onClick={() => setStartTime(slot)}
                        className={cn(
                          "px-3 py-2.5 text-sm rounded-xl border transition-all duration-300 font-medium flex-col flex items-center justify-center gap-1",
                          startTime === slot
                            ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/30 ring-4 ring-primary/20 scale-105 z-10"
                            : unavailable
                              ? "bg-muted/30 text-muted-foreground opacity-40 cursor-not-allowed border-transparent"
                              : "bg-background border-border/60 hover:border-primary/50 hover:bg-primary/5 hover:text-primary hover:shadow-md hover:-translate-y-0.5"
                        )}
                      >
                        <span className="text-base">{slot}</span>
                        {unavailable ? (
                          <span className="text-[10px] uppercase font-bold tracking-wider text-destructive/80">Taken</span>
                        ) : (
                          <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-500/80">Available</span>
                        )}
                      </motion.button>
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
                  <div className="grid md:grid-cols-2 gap-6 bg-secondary/30 p-5 rounded-2xl border border-border/50">
                    <div className="space-y-2">
                      <Label className="font-semibold text-foreground/80">Duration</Label>
                      <select
                        className="w-full h-11 rounded-xl border border-border bg-background px-4 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-shadow shadow-sm"
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                      >
                        <option value="30">30 Minutes</option>
                        <option value="60">1 Hour</option>
                        <option value="90">1.5 Hours</option>
                        <option value="120">2 Hours</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label className="font-semibold text-foreground/80">Meeting Purpose</Label>
                      <Input
                        placeholder="e.g. Q4 Strategy Sync"
                        value={purpose}
                        onChange={(e) => setPurpose(e.target.value)}
                        className="h-11 rounded-xl border-border bg-background shadow-sm focus-visible:ring-primary"
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
              <Card className="bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-2xl shadow-primary/5 rounded-2xl overflow-hidden">
                <div className="h-1.5 w-full bg-gradient-to-r from-primary via-accent to-primary"></div>
                <CardContent className="p-6 sm:p-8 space-y-7">
                  <h3 className="font-display text-2xl font-bold text-foreground">Booking Summary</h3>

                  {recommendedRoom ? (
                    <motion.div 
                      key={recommendedRoom.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-gradient-to-br from-primary/10 to-transparent rounded-xl p-5 border border-primary/20 space-y-4 hover:shadow-md transition-shadow relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Building className="w-24 h-24" />
                      </div>
                      <div className="relative z-10">
                        <div className="flex items-center gap-2 text-primary font-semibold text-sm uppercase tracking-wider mb-1">
                          <Sparkles className="w-4 h-4" />
                          Best Match
                        </div>
                        <div className="font-display font-bold text-2xl text-foreground">{recommendedRoom.name}</div>
                        <div className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 w-fit px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-500/20">
                          <CheckCircle2 className="w-4 h-4" />
                          Available Now
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-4 text-sm bg-background/50 backdrop-blur-sm rounded-lg p-3 border border-border/50">
                           <div className="flex flex-col gap-1">
                             <div className="flex items-center gap-1.5 text-muted-foreground"><MapPin className="w-3.5 h-3.5"/> Location</div>
                             <span className="font-medium text-foreground truncate">{recommendedRoom.location}</span>
                           </div>
                           <div className="flex flex-col gap-1">
                             <div className="flex items-center gap-1.5 text-muted-foreground"><Users className="w-3.5 h-3.5"/> Seats Left</div>
                             <span className="font-medium text-emerald-600">{Math.max(0, recommendedRoom.capacity - parsedMembers)} / {recommendedRoom.capacity}</span>
                           </div>
                        </div>

                        {recommendedRoom.features && (
                          <div className="pt-3 text-sm">
                            <div className="flex flex-wrap gap-1.5">
                              {recommendedRoom.features.split(',').slice(0, 3).map((f, i) => (
                                <Badge key={i} variant="secondary" className="px-2 py-0.5 bg-background border-border/50 text-xs font-medium">
                                  {f.trim()}
                                </Badge>
                              ))}
                              {recommendedRoom.features.split(',').length > 3 && (
                                <Badge variant="secondary" className="px-2 py-0.5 bg-background border-border/50 text-xs font-medium">
                                  +{recommendedRoom.features.split(',').length - 3} more
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="bg-destructive/10 rounded-xl p-5 border border-destructive/20 text-destructive text-center space-y-2"
                    >
                      <Building className="w-8 h-8 mx-auto opacity-50" />
                      <p className="font-semibold text-lg">No Rooms Found</p>
                      <p className="text-sm opacity-80">Adjust your time, date, or requirements to find an available room.</p>
                    </motion.div>
                  )}

                  <div className="space-y-3.5 p-5 bg-secondary/30 rounded-xl border border-border/50">
                    <div className="flex justify-between items-center py-1">
                      <span className="text-muted-foreground text-sm flex items-center gap-2"><Users className="w-4 h-4" /> Members</span>
                      <span className="font-semibold text-foreground">{members || "-"}</span>
                    </div>

                    <div className="h-px w-full bg-border/50" />

                    <div className="flex justify-between items-center py-1">
                      <span className="text-muted-foreground text-sm flex items-center gap-2"><CalendarIcon className="w-4 h-4" /> Date</span>
                      <span className="font-semibold text-foreground">
                        {date ? format(date, "MMM d, yyyy") : "-"}
                      </span>
                    </div>

                    <div className="h-px w-full bg-border/50" />

                    <div className="flex justify-between items-center py-1">
                      <span className="text-muted-foreground text-sm flex items-center gap-2"><Clock className="w-4 h-4" /> Time</span>
                      <span className="font-semibold text-foreground">
                        {startTime ? (
                          <span className="text-primary bg-primary/10 px-2 py-1 rounded-md text-sm">
                            {startTime} - {calculateEndTime()}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/50 italic text-sm">Not selected</span>
                        )}
                      </span>
                    </div>
                  </div>

                  <Button
                    className={cn(
                      "w-full h-14 text-lg font-bold rounded-xl transition-all duration-300 shadow-xl",
                      (!startTime || !purpose || isBooking || !recommendedRoom)
                        ? "bg-muted text-muted-foreground shadow-none"
                        : "bg-primary hover:bg-primary/90 text-white hover:scale-[1.02] hover:shadow-primary/25 active:scale-[0.98]"
                    )}
                    disabled={!startTime || !purpose || isBooking || !recommendedRoom}
                    onClick={handleBooking}
                  >
                    {isBooking ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        Confirm Booking
                        <Sparkles className="ml-2 h-5 w-5 opacity-70" />
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

      <AlertDialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Booking</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to book this room? This cannot be undone automatically, though you may cancel the booking later.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="bg-muted p-4 rounded-md space-y-2 text-sm my-4">
            <div className="flex justify-between"><span className="text-muted-foreground">Room:</span> <span className="font-medium">{recommendedRoom?.name}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Date:</span> <span className="font-medium">{date && format(date, "MMM d, yyyy")}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Time:</span> <span className="font-medium">{startTime} – {calculateEndTime()}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Members:</span> <span className="font-medium">{parsedMembers}</span></div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBooking}>Back to Edit</AlertDialogCancel>
            <AlertDialogAction onClick={confirmAndSubmitBooking} disabled={isBooking}>
              {isBooking ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Confirm Booking
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </LayoutShell>
  );
}
