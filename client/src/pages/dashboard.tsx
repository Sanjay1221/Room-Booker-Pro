import { LayoutShell } from "@/components/layout-shell";
import { useRooms } from "@/hooks/use-rooms";
import { RoomCard } from "@/components/room-card";
import { Input } from "@/components/ui/input";
import { Search, Loader2 } from "lucide-react";
import { useState } from "react";
import { useUser } from "@/hooks/use-auth";
import { Redirect } from "wouter";

export default function Dashboard() {
  const { data: user, isLoading: isAuthLoading } = useUser();
  const { data: rooms, isLoading: isRoomsLoading } = useRooms();
  const [searchTerm, setSearchTerm] = useState("");

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Redirect to="/login" />;

  const filteredRooms = rooms?.filter(
    (room) =>
      room.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      room.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      room.features?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <LayoutShell>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h1 className="text-4xl font-display font-bold text-foreground">
              Book a Space
            </h1>
            <p className="text-muted-foreground mt-2 text-lg">
              Find the perfect environment for your next meeting.
            </p>
          </div>
          
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search rooms, locations..."
              className="pl-9 bg-white/50 backdrop-blur-sm border-border focus:ring-primary/20"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Room Grid */}
        {isRoomsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-[380px] bg-muted/20 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filteredRooms?.length === 0 ? (
          <div className="text-center py-20 bg-muted/10 rounded-3xl border border-dashed border-muted">
            <h3 className="text-xl font-semibold">No rooms found</h3>
            <p className="text-muted-foreground mt-2">Try adjusting your search terms.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredRooms?.map((room) => (
              <RoomCard key={room.id} room={room} />
            ))}
          </div>
        )}
      </div>
    </LayoutShell>
  );
}
