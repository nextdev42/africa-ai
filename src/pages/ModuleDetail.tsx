import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

const ModuleDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [module, setModule] = useState<any>(null);
  const [progress, setProgress] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!id) return;

    const fetchModule = async () => {
      setLoading(true);

      // 1. Get module info
      const { data: moduleData, error: moduleError } = await supabase
        .from("modules")
        .select("*")
        .eq("id", id)
        .single();

      if (moduleError) {
        console.error("❌ Error fetching module:", moduleError.message);
        setLoading(false);
        return;
      }
      setModule(moduleData);

      // 2. Get user progress for this module
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.data?.session?.user?.id;
      if (!userId) return;

      const { data: progressData } = await supabase
        .from("progress")
        .select("*")
        .eq("user_id", userId)
        .eq("module_id", id)
        .single();

      setProgress(progressData || { is_completed: false, progress_percentage: 0 });
      setLoading(false);
    };

    fetchModule();
  }, [id]);

  const handleMarkComplete = async () => {
    if (!module) return;
    setUpdating(true);

    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.data?.session?.user?.id;
    if (!userId) return;

    const { error } = await supabase.from("progress").upsert({
      user_id: userId,
      module_id: module.id,
      is_completed: true,
      progress_percentage: 100,
    });

    if (error) {
      console.error("❌ Error updating progress:", error.message);
      toast.error("Failed to mark complete");
    } else {
      toast.success("Module marked as complete!");
      setProgress({ ...progress, is_completed: true, progress_percentage: 100 });
    }

    setUpdating(false);
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-2xl text-primary">Loading module...</div>
      </div>
    );

  if (!module)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground text-lg">Module not found.</p>
        <Button className="ml-4" onClick={() => navigate(-1)}>Back</Button>
      </div>
    );

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">{module.title}</h1>
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
            Back
          </Button>
        </div>
      </header>

      {/* Module Content */}
      <main className="container mx-auto px-4 py-8">
        <Card className="shadow-soft hover:shadow-medium transition-shadow mb-6">
          <CardHeader>
            <CardTitle>{module.title}</CardTitle>
            <CardDescription>{module.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Example: Estimated duration & points */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">~{module.estimated_duration} min</span>
                <span className="text-primary font-medium">+{module.points_reward} points</span>
              </div>

              {/* Progress bar */}
              <Progress value={progress?.progress_percentage || 0} />
              <p className="text-xs text-center text-muted-foreground">
                {progress?.progress_percentage || 0}% complete
              </p>

              {/* Mark Complete button */}
              {!progress?.is_completed && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleMarkComplete}
                  disabled={updating}
                >
                  {updating ? "Updating..." : "Mark Complete"}
                </Button>
              )}

              {progress?.is_completed && (
                <p className="text-center text-success font-medium">✓ Completed</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Add more detailed lessons/content here */}
        <Card className="shadow-soft hover:shadow-medium transition-shadow">
          <CardHeader>
            <CardTitle>Lessons / Content</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Example: loop over lessons if module.lessons exists */}
            {module.lessons?.length ? (
              module.lessons.map((lesson: any, index: number) => (
                <Card key={lesson.id || index} className="shadow-sm p-4">
                  <h3 className="font-semibold">{lesson.title}</h3>
                  <p className="text-sm text-muted-foreground">{lesson.content}</p>
                </Card>
              ))
            ) : (
              <p className="text-muted-foreground">No lessons available yet.</p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ModuleDetail;
