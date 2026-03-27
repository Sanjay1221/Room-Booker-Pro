import { MeetingRoom } from "@shared/schema";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, MapPin, Monitor, Coffee, Wifi } from "lucide-react";
import { Link } from "wouter";

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
    <div className="hover-scale">
      <Card className="group overflow-hidden border border-border/50 bg-card hover:shadow-xl transition-all duration-300">
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
            <div className="w-full h-full flex items-center justify-center bg-slate-100">
              <span className="text-slate-400 text-sm font-medium">No Image Available</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>

        <CardHeader className="pb-2 pt-4 px-5">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-display text-lg font-bold text-foreground leading-tight tracking-tight">{room.name}</h3>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 hover:bg-green-50 gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  Available
                </Badge>
                <div className="flex items-center gap-1 text-muted-foreground text-xs font-medium">
                  <MapPin className="w-3.5 h-3.5" />
                  {room.location}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-slate-500 bg-slate-50 px-2 py-1 rounded-md text-xs font-semibold border border-slate-100">
              <Users className="w-3.5 h-3.5" />
              {room.capacity}
            </div>
          </div>
        </CardHeader>

        <CardContent className="pb-4 px-5">
          <div className="flex flex-wrap gap-1.5 mt-2">
            {features.map((feature, i) => (
              <Badge key={i} variant="secondary" className="text-[10px] bg-slate-100/80 text-slate-600 hover:bg-slate-200/80 border-transparent flex items-center gap-1 py-0.5 px-2 font-medium">
                {getFeatureIcon(feature)}
                {feature}
              </Badge>
            ))}
          </div>
        </CardContent>

        <CardFooter className="pt-0 pb-5 px-5">
          <Link href={`/book/${room.id}`} className="w-full">
            <Button className="w-full bg-primary hover:bg-primary/90 text-white font-medium shadow-sm transition-all duration-200">
              Book Room
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
