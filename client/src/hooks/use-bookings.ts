import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type { InsertBooking } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function useMyBookings() {
  return useQuery({
    queryKey: [api.bookings.list.path],
    queryFn: async () => {
      const res = await fetch(api.bookings.list.path);
      if (!res.ok) throw new Error("Failed to fetch bookings");
      return api.bookings.list.responses[200].parse(await res.json());
    },
  });
}

export function useRoomBookings(roomId: number, date?: string) {
  return useQuery({
    queryKey: [api.bookings.listByRoom.path, roomId, date],
    queryFn: async () => {
      // Only fetch if we have a date
      if (!date) return [];
      
      const url = buildUrl(api.bookings.listByRoom.path, { id: roomId });
      // Use URLSearchParams for query params
      const params = new URLSearchParams({ date });
      const res = await fetch(`${url}?${params.toString()}`);
      
      if (!res.ok) throw new Error("Failed to fetch room schedule");
      return api.bookings.listByRoom.responses[200].parse(await res.json());
    },
    enabled: !!roomId && !!date,
  });
}

export function useCreateBooking() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: InsertBooking) => {
      const res = await fetch(api.bookings.create.path, {
        method: api.bookings.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        if (res.status === 409) {
          throw new Error("This time slot is already booked.");
        }
        if (res.status === 400) {
          const err = await res.json();
          throw new Error(err.message || "Invalid booking details.");
        }
        throw new Error("Failed to create booking");
      }
      return api.bookings.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.bookings.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.bookings.listByRoom.path] });
      toast({
        title: "Booking Confirmed!",
        description: "Your meeting room has been successfully reserved.",
      });
    },
    onError: (error) => {
      toast({
        title: "Booking Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useCancelBooking() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.bookings.cancel.path, { id });
      const res = await fetch(url, { method: api.bookings.cancel.method });
      
      if (!res.ok) {
        throw new Error("Failed to cancel booking");
      }
      return api.bookings.cancel.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.bookings.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.bookings.listByRoom.path] });
      toast({
        title: "Booking Cancelled",
        description: "The reservation has been cancelled.",
      });
    },
    onError: (error) => {
      toast({
        title: "Cancellation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
