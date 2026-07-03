import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import { Layout } from "@/components/Layout"
import { ScrollToTop } from "@/components/ScrollToTop"
import {
  ProtectedRoute,
  RequireUsername,
  AdminRoute,
} from "@/components/ProtectedRoute"
import { Login } from "@/pages/Login"
import { Welcome } from "@/pages/Welcome"
import { Matches } from "@/pages/Matches"
import { Leaderboard } from "@/pages/Leaderboard"
import { MyPredictions } from "@/pages/MyPredictions"
import { PlayerPage } from "@/pages/PlayerPage"
import { Tournament } from "@/pages/Tournament"
import { Admin } from "@/pages/Admin"

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoute />}>
          {/* Session but no chosen handle yet — Google OAuth users land here. */}
          <Route path="/welcome" element={<Welcome />} />
        </Route>
        {/* The shell is public. Matches and the Tournament view are viewable by
            anyone; predicting, the leaderboard and Me require a session.
            RequireUsername lets anonymous visitors through, but still funnels a
            signed-in user to /welcome until they've chosen a handle. */}
        <Route element={<Layout />}>
          <Route element={<RequireUsername />}>
            <Route index element={<Matches />} />
            <Route path="tournament" element={<Tournament />} />
            <Route element={<ProtectedRoute />}>
              <Route path="leaderboard" element={<Leaderboard />} />
              <Route path="me" element={<MyPredictions />} />
              <Route path="player/:userId" element={<PlayerPage />} />
              <Route element={<AdminRoute />}>
                <Route path="admin" element={<Admin />} />
              </Route>
            </Route>
          </Route>
        </Route>
        {/* Old /standings links → the renamed Tournament page. */}
        <Route
          path="/standings"
          element={<Navigate to="/tournament" replace />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
