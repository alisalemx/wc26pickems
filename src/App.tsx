import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import { Layout } from "@/components/Layout"
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
import { Standings } from "@/pages/Standings"
import { TempBracket } from "@/pages/TempBracket"
import { Admin } from "@/pages/Admin"

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoute />}>
          {/* Session but no chosen handle yet — Google OAuth users land here. */}
          <Route path="/welcome" element={<Welcome />} />
        </Route>
        {/* The shell is public. Matches and Groups (standings) are viewable by
            anyone; predicting, the leaderboard and Me require a session.
            RequireUsername lets anonymous visitors through, but still funnels a
            signed-in user to /welcome until they've chosen a handle. */}
        <Route element={<Layout />}>
          <Route element={<RequireUsername />}>
            <Route index element={<Matches />} />
            <Route path="standings" element={<Standings />} />
            {/* TEMP — remove with the TempBracket page when done. */}
            <Route path="temp-bracket" element={<TempBracket />} />
            <Route element={<ProtectedRoute />}>
              <Route path="leaderboard" element={<Leaderboard />} />
              <Route path="me" element={<MyPredictions />} />
              <Route element={<AdminRoute />}>
                <Route path="admin" element={<Admin />} />
              </Route>
            </Route>
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
