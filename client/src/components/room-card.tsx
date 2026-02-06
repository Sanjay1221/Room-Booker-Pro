import { MeetingRoom } from "@shared/schema";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, MapPin, Monitor, Coffee, Wifi } from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";

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
              <h3 className="font-display text-xl font-bold">{room.name}</h3>
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

        <CardContent className="pb-3">
          <div className="flex flex-wrap gap-2">
            {features.map((feature, i) => (
              <Badge key={i} variant="outline" className="text-xs bg-secondary/50 border-secondary-foreground/10 flex items-center gap-1.5">
                {getFeatureIcon(feature)}
                {feature}
              </Badge>
            ))}
          </div>
        </CardContent>

        <CardFooter className="pt-3 border-t bg-muted/20">
          <Link href={`/book/${room.id}`} className="w-full">
            <Button className="w-full bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 shadow-lg shadow-primary/20">
              Check Availability
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </motion.div>
  );
}
