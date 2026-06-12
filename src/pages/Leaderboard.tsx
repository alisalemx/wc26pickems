import { useAuth } from "@/hooks/useAuth"
import { useLeaderboard } from "@/hooks/queries"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/EmptyState"
import { ListSkeleton } from "@/components/ListSkeleton"
import { cn } from "@/lib/utils"

const MEDALS = ["🥇", "🥈", "🥉"]

export function Leaderboard() {
  const { session } = useAuth()
  const { data, isLoading } = useLeaderboard()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>🏆</span> Leaderboard
        </CardTitle>
        <CardDescription className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
          <Badge variant="gold">+3</Badge> exact score
          <span className="text-muted-foreground/40">·</span>
          <Badge variant="default">+1</Badge> correct outcome
          <span className="text-muted-foreground/40">·</span>
          <span className="font-semibold text-foreground">up to ×4</span> in the
          knockouts
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <ListSkeleton count={5} className="space-y-2" itemClassName="h-10 w-full" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead>Player</TableHead>
                <TableHead className="text-center">Exact</TableHead>
                <TableHead className="text-center">Outcome</TableHead>
                <TableHead className="text-right">Pts</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.map((row, i) => {
                const isMe = row.user_id === session?.user.id
                return (
                  <TableRow
                    key={row.user_id}
                    className={cn(isMe && "bg-primary/10 border-l-2 border-l-primary")}
                  >
                    <TableCell className="font-medium">
                      {MEDALS[i] ?? i + 1}
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-2">
                        <span className="truncate font-medium">
                          @{row.username}
                        </span>
                        {isMe && (
                          <Badge variant="outline" className="px-1 py-0 text-[10px]">
                            you
                          </Badge>
                        )}
                      </span>
                    </TableCell>
                    <TableCell className="text-center tabular-nums text-muted-foreground">
                      {row.exact_count}
                    </TableCell>
                    <TableCell className="text-center tabular-nums text-muted-foreground">
                      {row.outcome_count}
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {row.total_points}
                    </TableCell>
                  </TableRow>
                )
              })}
              {data?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="p-0">
                    <EmptyState className="py-8">No players yet.</EmptyState>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
