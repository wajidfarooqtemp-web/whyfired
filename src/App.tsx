import { Suspense, lazy } from "react";
import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import VisitTracker from "./components/VisitTracker";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
import Home from "./pages/Home";

// Loaded on first visit to the landing page along with everything
// else; every other page below is fetched only when someone
// actually navigates there, keeping that first load light.
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const ShareCase = lazy(() => import("./pages/ShareCase"));
const Stories = lazy(() => import("./pages/Stories"));
const CaseDetail = lazy(() => import("./pages/CaseDetail"));
const Admin = lazy(() => import("./pages/Admin"));
const AdminUsers = lazy(() => import("./pages/AdminUsers"));
const AdminAnalytics = lazy(() => import("./pages/AdminAnalytics"));
const Contact = lazy(() => import("./pages/Contact"));
const Patterns = lazy(() => import("./pages/Patterns"));
const HowItWorks = lazy(() => import("./pages/HowItWorks"));

function PageLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center text-cream-100/50 text-sm">
      Loading...
    </div>
  );
}

function App() {
  return (
    <div className="bg-brand-950 min-h-screen">
      <VisitTracker />
      <Navbar />
      <Suspense fallback={<PageLoading />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route
            path="/share"
            element={
              <ProtectedRoute>
                <ShareCase />
              </ProtectedRoute>
            }
          />
          <Route
            path="/stories"
            element={
              <ProtectedRoute>
                <Stories />
              </ProtectedRoute>
            }
          />
          <Route
            path="/stories/:id"
            element={
              <ProtectedRoute>
                <CaseDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/patterns"
            element={
              <ProtectedRoute>
                <Patterns />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <Admin />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <AdminRoute>
                <AdminUsers />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/analytics"
            element={
              <AdminRoute>
                <AdminAnalytics />
              </AdminRoute>
            }
          />
        </Routes>
      </Suspense>
    </div>
  );
}

export default App;
