import { LayoutShell } from "@/components/layout-shell";
import { useRooms } from "@/hooks/use-rooms";
import { RoomCard } from "@/components/room-card";
import { Input } from "@/components/ui/input";
import { Search, Loader2, Users, Monitor, Video, CheckSquare, PlusCircle } from "lucide-react";
import { useState } from "react";
import { useUser } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { Badge } from "@/components/ui/badge";

const AVAILABLE_FACILITIES = ["Projector", "Video Conferencing", "Whiteboard", "Soundproof", "Large Screen"];

export default function Dashboard() {
  const { data: user, isLoading: isAuthLoading } = useUser();
  const { data: rooms, isLoading: isRoomsLoading } = useRooms();
  const [searchTerm, setSearchTerm] = useState("");
  const [minCapacity, setMinCapacity] = useState<number | "">("");
  const [selectedFacilities, setSelectedFacilities] = useState<string[]>([]);

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Redirect to="/login" />;

  const toggleFacility = (facility: string) => {
    setSelectedFacilities(prev =>
      prev.includes(facility) ? prev.filter(f => f !== facility) : [...prev, facility]
    );
  };

  const filteredRooms = rooms?.filter((room) => {
    // Basic search math (Name or Location)
    const matchesSearch =
      room.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      room.location.toLowerCase().includes(searchTerm.toLowerCase());

    // Capacity Match
    const matchesCapacity = minCapacity === "" || room.capacity >= Number(minCapacity);

    // Facility Match (Room must have ALL selected facilities)
    const matchesFacilities = selectedFacilities.every(facility =>
      room.features?.toLowerCase().includes(facility.toLowerCase())
    );

    return matchesSearch && matchesCapacity && matchesFacilities;
  });

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

          <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
            {/* Search input */}
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search rooms, locations..."
                className="pl-9 bg-white/50 backdrop-blur-sm border-border focus:ring-primary/20"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {/* Capacity Input */}
            <div className="relative w-full md:w-32">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="number"
                min="1"
                placeholder="Min Seats"
                className="pl-9 bg-white/50 backdrop-blur-sm"
                value={minCapacity}
                onChange={(e) => setMinCapacity(e.target.value === "" ? "" : Number(e.target.value))}
              />
            </div>
          </div>
        </div>

        {/* Filters Section */}
        <div className="flex flex-wrap items-center gap-2 pb-4">
          <span className="text-sm text-muted-foreground mr-2">Required Facilities:</span>
          {AVAILABLE_FACILITIES.map((facility) => {
            const isSelected = selectedFacilities.includes(facility);
            return (
              <Badge
                key={facility}
                variant={isSelected ? "default" : "outline"}
                className={`cursor-pointer transition-colors ${isSelected ? '' : 'hover:bg-muted/50'}`}
                onClick={() => toggleFacility(facility)}
              >
                {isSelected ? <CheckSquare className="w-3 h-3 mr-1 inline-block" /> : <PlusCircle className="w-3 h-3 mr-1 inline-block" />}
                {facility}
              </Badge>
            );
          })}
          {selectedFacilities.length > 0 && (
            <button
              className="text-xs text-muted-foreground hover:text-foreground underline ml-2 transition-colors"
              onClick={() => setSelectedFacilities([])}
            >
              Clear filters
            </button>
          )}
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
