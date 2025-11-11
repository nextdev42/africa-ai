import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

interface Module {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  estimated_duration: number;
  points_reward: number;
  progress_percentage?: number;
  is_completed?: boolean;
}

interface Quiz {
  id: string;
  question: string;
  options: string[];
  correct_answer: string;
}

const ModulePage = () => {
  const { moduleId } = useParams<{ moduleId: string }>();
  const navigate = useNavigate();

  const [module, setModule] = useState<Module | null>(null);
  const [progress, setProgress] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(true);

  const [quizList, setQuizList] = useState<Quiz[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!moduleId) return;
    loadModule();
  }, [moduleId]);

  const loadModule = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) return navigate("/auth");

      // Fetch user module
      const { data: moduleRow, error: moduleError } = await supabase
        .from("user_module_progress")
        .select("*")
        .eq("module_id", moduleId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!moduleRow || moduleError) {
        toast.error("Module not found");
        return navigate("/dashboard");
      }

      setModule(moduleRow);
      setProgress(moduleRow.progress_percentage || 0);
      setCompleted(moduleRow.is_completed || false);

      // Fetch real quizzes from Supabase
      fetchQuizzes(moduleRow.id);
    } catch (err) {
      console.error("[ModulePage] Failed to load module:", err);
      toast.error("Failed to load module");
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const fetchQuizzes = async (moduleId: string) => {
    try {
      const { data, error } = await supabase
        .from("quizzes")
        .select("*")
        .eq("module_id", moduleId);

      if (error || !data) throw error || new Error("No quizzes found");

      // Parse options if stored as JSON string
      const quizzes: Quiz[] = data.map((q: any) => ({
        id: q.id,
        question: q.question,
        options: typeof q.options === "string" ? JSON.parse(q.options) : q.options,
        correct_answer: q.correct_answer,
      }));

      setQuizList(quizzes);
      setCurrentQuestionIndex(0);
      setSelectedAnswer("");
    } catch (err) {
      console.error("[ModulePage] Failed to fetch quizzes:", err);
      toast.error("No quizzes available for this module.");
      setQuizList([]);
    }
  };

  const submitAnswer = async () => {
    if (!quizList.length || !selectedAnswer) return;
    setChecking(true);

    try {
      const quiz = quizList[currentQuestionIndex];
      const correct = selectedAnswer === quiz.correct_answer;

      if (correct) {
        toast.success(`Correct! +${module?.points_reward ?? 100} points`);
        await updateProgress(module?.points_reward ?? 100);

        if (currentQuestionIndex + 1 < quizList.length) {
          setCurrentQuestionIndex(currentQuestionIndex + 1);
          setSelectedAnswer("");
        } else {
          setCompleted(true);
          toast.success("🎉 Module completed!");
        }
      } else {
        toast.error("Incorrect, try again!");
      }
    } catch (err) {
      console.error("[ModulePage] submitAnswer error:", err);
      toast.error("Failed to check answer");
    } finally {
      setChecking(false);
    }
  };

  const updateProgress = async (increment: number) => {
    if (!module) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) return;

      const newProgress = Math.min(progress + increment, 100);
      const isComplete = newProgress === 100;

      await supabase
        .from("user_module_progress")
        .upsert({
          user_id: user.id,
          module_id: module.id,
          progress_percentage: newProgress,
          is_completed: isComplete,
        });

      setProgress(newProgress);
      setCompleted(isComplete);
    } catch (err) {
      console.error("[ModulePage] Failed to update progress:", err);
      toast.error("Failed to update progress");
    }
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-2xl text-primary">Loading...</div>
      </div>
    );

  if (!module)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground text-lg">Module not found.</p>
      </div>
    );

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <Card className="max-w-3xl mx-auto shadow-soft hover:shadow-medium transition-shadow">
        <CardHeader>
          <CardTitle>{module.title}</CardTitle>
          <CardDescription>{module.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p><strong>Difficulty:</strong> {module.difficulty}</p>
          <p><strong>Estimated Duration:</strong> {module.estimated_duration} min</p>
          <p><strong>Points Reward:</strong> {module.points_reward}</p>

          <div className="space-y-2">
            <Progress value={progress} />
            <p className="text-xs text-center text-muted-foreground">{progress}% complete</p>
          </div>

          {/* Quiz Section */}
          {!completed && quizList.length > 0 && (
            <Card className="mt-4 p-4 bg-card/50 space-y-4">
              <p className="text-sm text-muted-foreground">
                Question {currentQuestionIndex + 1} of {quizList.length}
              </p>
              <p className="font-semibold mb-2">{quizList[currentQuestionIndex].question}</p>
              <div className="space-y-2">
                {quizList[currentQuestionIndex].options.map((opt, idx) => (
                  <label
                    key={idx}
                    className={`block w-full border p-2 rounded cursor-pointer ${
                      selectedAnswer === opt ? "bg-primary/20 border-primary" : "bg-card"
                    }`}
                  >
                    <input
                      type="radio"
                      name="quizOption"
                      value={opt}
                      checked={selectedAnswer === opt}
                      onChange={() => setSelectedAnswer(opt)}
                      className="mr-2"
                    />
                    {opt}
                  </label>
                ))}
              </div>
              <Button
                onClick={submitAnswer}
                disabled={checking || !selectedAnswer}
                className="w-full"
              >
                {checking ? "Checking..." : "Submit Answer"}
              </Button>
            </Card>
          )}

          {completed && (
            <p className="text-center font-semibold text-green-600">
              🎉 You have completed this module!
            </p>
          )}

          <Button
            variant="outline"
            onClick={() => navigate("/dashboard")}
            className="mt-4 w-full"
          >
            Back to Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ModulePage;
