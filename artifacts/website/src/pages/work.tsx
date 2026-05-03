import { Helmet } from "react-helmet-async";
import { useWorkLogs } from "@/hooks/use-work-logs";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "lucide-react";

const StatsCard = ({ title, value }: { title: string; value: string }) => (
  <div className="bg-card border border-border rounded-xl p-6 text-center shadow-sm">
    <div className="text-3xl font-bold font-display text-primary mb-1">{value}</div>
    <div className="text-sm text-muted-foreground uppercase tracking-wider">{title}</div>
  </div>
);

export default function Work() {
  const { data: logs, isLoading } = useWorkLogs();

  return (
    <div className="container mx-auto px-4 pt-24 pb-12">
      <Helmet>
        <title>Work Log | Ankit Jaiswal</title>
        <meta name="description" content="Project history, deployment stats, and case studies." />
      </Helmet>

      <div className="text-center mb-16 max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold font-display mb-4">Work Log</h1>
        <p className="text-xl text-muted-foreground">A timeline of shipped projects and technical milestones.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
        <StatsCard title="Websites Built" value="100+" />
        <StatsCard title="Tools Shipped" value="20+" />
        <StatsCard title="SEO Experience" value="Advanced" />
      </div>

      <h2 className="text-2xl font-bold font-display mb-8">Recent Deployments</h2>

      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[300px] rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {logs?.map((log) => (
            <Card key={log.id} className="overflow-hidden hover:shadow-lg transition-shadow group">
              <div className="h-48 overflow-hidden bg-muted">
                {log.imageUrl ? (
                  <img 
                    src={log.imageUrl} 
                    alt={log.title} 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-secondary">
                    No Preview
                  </div>
                )}
              </div>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <Badge variant="secondary">{log.category}</Badge>
                  {log.date && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(log.date).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <CardTitle className="mt-2">{log.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm line-clamp-3">{log.description}</p>
                {log.stats && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-xs font-mono text-primary">{log.stats}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          {(!logs || logs.length === 0) && (
            <div className="col-span-full text-center py-12 text-muted-foreground border border-dashed rounded-xl">
              No work logs found. The database might be empty.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
