import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import Dashboard from "@/pages/dashboard";
import BookingPage from "@/pages/booking-page";
import MyBookings from "@/pages/my-bookings";
import AdminDashboard from "@/pages/admin-dashboard";
import { ThemeProvider } from "@/components/theme-provider";

function Router() {
  return (
    <Switch>
      <Route path="/login" component={AuthPage} />
      <Route path="/register" component={AuthPage} />

      <Route path="/dashboard" component={Dashboard} />
      <Route path="/book" component={BookingPage} />
      <Route path="/bookings" component={MyBookings} />
      <Route path="/admin" component={AdminDashboard} />

      {/* Default redirect to login or dashboard */}
      <Route path="/">
        {() => <Redirect to="/dashboard" />}
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="meetspace-theme">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
