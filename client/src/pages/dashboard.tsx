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
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-2">
          <div>
            <h1 className="text-4xl font-display font-bold text-foreground tracking-tight">
              Book a Space
            </h1>
            <p className="text-muted-foreground mt-2 text-lg font-medium">
              Find the perfect environment for your next meeting.
            </p>
          </div>
          
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search rooms, locations..."
              className="pl-9 bg-white border-slate-200 focus-visible:ring-2 focus-visible:ring-primary shadow-sm h-11 transition-all rounded-lg"
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
          <div className="text-center py-24 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
            <h3 className="text-xl font-semibold text-slate-800">No rooms found</h3>
            <p className="text-slate-500 mt-2 font-medium">Try adjusting your search terms.</p>
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
