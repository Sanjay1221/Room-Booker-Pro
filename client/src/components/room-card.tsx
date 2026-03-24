import { MeetingRoom } from "@shared/schema";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, MapPin, Monitor, Coffee, Wifi, Clock, Building } from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { useRoomBookings } from "@/hooks/use-bookings";
import { format } from "date-fns";

interface RoomCardProps {
  room: MeetingRoom;
}

export function RoomCard({ room }: RoomCardProps) {
  // Parse features string into array
  const features = room.features?.split(",").map((f) => f.trim()) || [];

  const getFeatureIcon = (feature: string) => {
    const lower = feature.toLowerCase();
    if (lower.includes("wifi")) return <Wifi className="w-3 h-3" />;
    if (lower.includes("screen") || lower.includes("tv") || lower.includes("projector")) return <Monitor className="w-3 h-3" />;
    if (lower.includes("coffee")) return <Coffee className="w-3 h-3" />;
    return null;
  };

  const today = format(new Date(), "yyyy-MM-dd");
  const { data: todayBookings } = useRoomBookings(room.id, today);

  const getAvailabilityStatus = () => {
    if (!todayBookings) return null;

    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();

    let isOccupied = false;
    let nextAvailableMins = -1;

    for (const b of todayBookings) {
      const [startH, startM] = b.startTime.split(':').map(Number);
      const startMins = startH * 60 + startM;
      const [endH, endM] = b.endTime.split(':').map(Number);
      const endMins = endH * 60 + endM;

      if (currentMins >= startMins && currentMins < endMins) {
        isOccupied = true;
        nextAvailableMins = endMins + 5; // adding 5 minute buffer
      } else if (currentMins < startMins && nextAvailableMins !== -1 && nextAvailableMins >= startMins) {
        // if next available clashes with another booking
        nextAvailableMins = endMins + 5;
      }
    }

    if (isOccupied && nextAvailableMins !== -1) {
      const hours = Math.floor(nextAvailableMins / 60);
      const mins = nextAvailableMins % 60;
      const formattedTime = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
      return <span className="text-destructive font-semibold flex items-center gap-1.5"><Clock className="w-4 h-4" /> Not Available (until {formattedTime})</span>;
    }

    return <span className="text-emerald-500 font-semibold flex items-center gap-1.5"><Clock className="w-4 h-4" /> Available</span>;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="group overflow-hidden border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5">
        <div className="aspect-[16/9] w-full overflow-hidden relative bg-muted">
          {room.imageUrl ? (
            <>
              {/* Unsplash office meeting room */}
              {/* Note: In a real app, this would be the actual room image URL */}
              <img
                src={room.imageUrl}
                alt={room.name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-secondary">
              <span className="text-muted-foreground">No Image</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>

        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-display text-xl font-bold flex items-center gap-2">
                <Building className="w-5 h-5 text-primary" />
                {room.name}
              </h3>
              <div className="flex items-center gap-1 text-muted-foreground mt-1 text-sm">
                <MapPin className="w-3.5 h-3.5" />
                {room.location}
              </div>
            </div>
            <Badge variant="secondary" className="flex items-center gap-1 font-medium bg-primary/10 text-primary hover:bg-primary/20">
              <Users className="w-3.5 h-3.5" />
              {room.capacity}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="pb-3 text-sm">
          <div className="bg-muted/50 p-2.5 rounded-lg border border-border/50 flex items-center">
            {getAvailabilityStatus() || <span className="text-muted-foreground opacity-50 flex items-center gap-1">Checking availability...</span>}
          </div>
        </CardContent>

        <CardFooter className="pt-3 border-t bg-muted/20">
          <Link href="/book" className="w-full">
            <Button className="w-full bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 text-white font-semibold">
              Book
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </motion.div>
  );
}
