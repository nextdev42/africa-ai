import { useState, useCallback, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  GraduationCap, 
  Trophy, 
  Flame, 
  BookOpen, 
  LogOut, 
  Award, 
  CheckCircle, 
  X, 
  RefreshCw, 
  Star, 
  Zap, 
  Crown, 
  RotateCcw, 
  Lock, 
  User, 
  Gem, 
  TrendingUp 
} from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from 'react-markdown';
import Confetti from 'react-confetti';
import UserBadges from "@/components/ui/UserBadges";
import { useUserProgress } from "@/hooks/useUserProgress";

type QuizQuestion = {
  id: string;
  question: string;
  options: string[];
  correct_answer: string;
};

type Module = {
  id: string;
  user_id: string;
  module_id: string;
  title: string;
  description: string;
  difficulty: string;
  estimated_duration: number;
  points_reward: number;
  progress_percentage: number;
  is_completed: boolean;
  detailed_content: string | null;
  interest?: string;
  quizzes?: QuizQuestion[];
  level?: number;
  is_read_only?: boolean;
};

type BadgeType = {
  id: string;
  name: string;
  description: string;
  icon: string;
  module_id: string;
  earned_at: string;
};

type Profile = {
  id: string;
  full_name: string;
  role: string;
  skill_level: string;
  form?: string;
  subject?: string;
  total_points: number;
  streak_days: number;
  created_at: string;
  updated_at: string;
  email?: string;
  avatar_url?: string;
};

// Helper functions for avatar initials
const getInitials = (name: string | null | undefined): string => {
  if (!name) return 'U';
  
  return name
    .split(' ')
    .map(part => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');
};

const getColorFromName = (name: string | null | undefined): string => {
  if (!name) return 'bg-blue-500';
  
  const colors = [
    'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 
    'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500',
    'bg-orange-500', 'bg-cyan-500', 'bg-rose-500', 'bg-violet-500'
  ];
  
  const index = name.length % colors.length;
  return colors[index];
};

// Custom Progress component with status colors
const ColoredProgress = ({ value, className = "" }: { value: number; className?: string }) => {
  const getProgressColorClass = (val: number) => {
    if (val === 100) return "bg-green-500";
    if (val === 0) return "bg-yellow-500";
    return "bg-blue-500";
  };

  return (
    <div className={`relative h-2 w-full overflow-hidden rounded-full bg-secondary ${className}`}>
      <div
        className={`h-full w-full flex-1 transition-all ${getProgressColorClass(value)}`}
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </div>
  );
};

const Dashboard = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [quizResults, setQuizResults] = useState<Record<string, boolean>>({});
  const [completedQuizzes, setCompletedQuizzes] = useState<Set<string>>(new Set());
  const [loadingQuizzes, setLoadingQuizzes] = useState<boolean>(false);
  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const [earnedBadge, setEarnedBadge] = useState<BadgeType | null>(null);
  const [showLevelUpModal, setShowLevelUpModal] = useState(false);
  const [incorrectQuizzes, setIncorrectQuizzes] = useState<Set<string>>(new Set());
  const [isCompletingModule, setIsCompletingModule] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'achievements'>('dashboard');
  const [userId, setUserId] = useState<string | null>(null);

  // Fetch session and user ID
  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      if (!data.session) {
        navigate("/auth");
        return null;
      }
      setUserId(data.session.user.id);
      return data.session;
    },
  });

  // Use the custom hook for user progress
  const { 
    data: levelProgression, 
    isLoading: isLevelLoading,
    error: levelError,
    refetch: refetchLevel 
  } = useUserProgress(userId);

  // Fetch profile
  const { 
    data: profile, 
    isLoading: isProfileLoading,
    error: profileError 
  } = useQuery({
    queryKey: ['profile', userId],
    queryFn: async (): Promise<Profile | null> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      
      if (error) {
        console.error("Error fetching profile:", error);
        throw error;
      }
      
      return data;
    },
    enabled: !!userId,
  });

  // Fetch user badges
  const { 
    data: userBadges = [], 
    isLoading: isBadgesLoading 
  } = useQuery({
    queryKey: ['userBadges', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_badges")
        .select("*")
        .eq("user_id", userId)
        .order('earned_at', { ascending: false });

      if (error) throw error;
      return data as BadgeType[];
    },
    enabled: !!userId,
  });

  // Fetch modules with deduplication
  const { 
    data: modules = [], 
    isLoading: isModulesLoading,
    error: modulesError,
    refetch: refetchModules 
  } = useQuery({
    queryKey: ['modules', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_module_progress")
        .select("*")
        .eq("user_id", userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!data) return [];

      // Remove duplicates by module_id
      const uniqueModules = data.reduce((acc: Module[], current) => {
        const existingIndex = acc.findIndex(module => module.module_id === current.module_id);
        
        if (existingIndex === -1) {
          acc.push(current);
        } else {
          const existing = acc[existingIndex];
          if (current.is_completed && !existing.is_completed) {
            acc[existingIndex] = current;
          } else if (current.progress_percentage > existing.progress_percentage) {
            acc[existingIndex] = current;
          }
        }
        return acc;
      }, []);

      return uniqueModules;
    },
    enabled: !!userId,
  });

  // Calculate points reward
  const calculatePointsReward = useCallback((duration: number, difficulty: string): number => {
    const basePoints = Math.round(duration / 10);
    const difficultyMultiplier = {
      beginner: 1,
      intermediate: 1.5,
      advanced: 2
    };
    const multiplier = difficultyMultiplier[difficulty as keyof typeof difficultyMultiplier] || 1;
    const calculatedPoints = Math.round(basePoints * multiplier);
    return Math.max(5, Math.round(calculatedPoints / 5) * 5);
  }, []);

  // Memoized modules with consistent points
  const modulesWithConsistentPoints = useMemo(() => {
    return modules.map(module => ({
      ...module,
      points_reward: module.points_reward > 0 ? module.points_reward : calculatePointsReward(module.estimated_duration, module.difficulty)
    }));
  }, [modules, calculatePointsReward]);

  // Get status text based on progress
  const getStatusText = useCallback((module: Module) => {
    if (module.is_completed) return 'Completed';
    if (module.progress_percentage === 0) return 'Not Started';
    return 'In Progress';
  }, []);

  // Get status color for badges
  const getStatusColor = useCallback((module: Module) => {
    if (module.is_completed) return 'bg-green-100 text-green-800 border-green-200';
    if (module.progress_percentage === 0) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-blue-100 text-blue-800 border-blue-200';
  }, []);

  // Calculate quiz score percentage
  const calculateQuizScore = useCallback((module: Module, currentAnswers: Record<string, string>) => {
    const moduleQuizzes = module.quizzes || [];
    if (moduleQuizzes.length === 0) return 0;

    let correctCount = 0;
    moduleQuizzes.forEach(quiz => {
      if (currentAnswers[quiz.id] === quiz.correct_answer) {
        correctCount++;
      }
    });

    return (correctCount / moduleQuizzes.length) * 100;
  }, []);

  // Award badge mutation
  const awardBadgeMutation = useMutation({
    mutationFn: async ({ userId, module }: { userId: string; module: Module }) => {
      const badgeName = `${module.difficulty.charAt(0).toUpperCase() + module.difficulty.slice(1)} Badge`;
      const badgeDescription = `Completed ${module.title}`;
      
      const { data, error } = await supabase
        .from("user_badges")
        .insert({
          user_id: userId,
          name: badgeName,
          description: badgeDescription,
          icon: "star",
          module_id: module.module_id,
          earned_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (badge) => {
      queryClient.invalidateQueries({ queryKey: ['userBadges'] });
      setEarnedBadge(badge);
      setShowBadgeModal(true);
    }
  });

  // Check for level up
  const checkLevelUp = useCallback((previousLevel: string, currentLevel: string) => {
    return previousLevel !== currentLevel;
  }, []);

  // Complete module mutation
  const completeModuleMutation = useMutation({
    mutationFn: async ({ module, score }: { module: Module; score: number }) => {
      if (!profile) throw new Error("No profile found");

      const previousLevel = levelProgression?.current_level || "Beginner Level 1";
      const hasPassingScore = score >= 85;

      // Update module to read-only and completed
      const { error: completeError } = await supabase
        .from("user_module_progress")
        .update({ 
          progress_percentage: 100, 
          is_completed: true,
          is_read_only: true
        })
        .eq("module_id", module.module_id)
        .eq("user_id", profile.id);

      if (completeError) throw completeError;

      // Award module points regardless of score
      const modulePoints = module.points_reward;
      const totalPoints = (profile.total_points || 0) + modulePoints;
      
      await supabase
        .from("profiles")
        .update({ total_points: totalPoints })
        .eq("id", profile.id);

      let earnedBadge = null;

      // Only award badge and progression if score is 85% or higher
      if (hasPassingScore) {
        // Award badge
        const badgeResult = await awardBadgeMutation.mutateAsync({ 
          userId: profile.id, 
          module 
        });
        earnedBadge = badgeResult;

        // Check for level up by refetching level progression
        await refetchLevel();
        const newLevelProgression = await queryClient.fetchQuery({
          queryKey: ['userProgress', userId],
          queryFn: () => fetch(`/api/levels/${userId}`).then(res => res.json())
        });

        if (newLevelProgression && checkLevelUp(previousLevel, newLevelProgression.current_level)) {
          setTimeout(() => {
            setShowLevelUpModal(true);
          }, 1500);
        }
      }

      return { earnedBadge, hasPassingScore, modulePoints };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['modules'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      refetchLevel(); // Refresh level progression
      
      if (result.hasPassingScore) {
        toast.success(`Module completed! 🎉 +${result.modulePoints} points earned! Badge awarded!`);
      } else {
        toast.success(`Module completed! +${result.modulePoints} points earned! Score below 85% - no badge awarded. You can retake the quiz to improve your score.`);
      }
    },
    onError: (error: any) => {
      toast.error(`Failed to complete module: ${error.message}`);
    }
  });

  // Generate new modules mutation
  const generateModulesMutation = useMutation({
    mutationFn: async (userId: string) => {
      const completedModules = modulesWithConsistentPoints.filter(m => m.is_completed).length;

      const response = await fetch("/api/generateModules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          userId,
          currentLevel: levelProgression?.current_level || "Beginner Level 1",
          completedModules: completedModules,
          studentSubject: profile?.subject,
          studentForm: profile?.form
        }),
      });
      
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const result = await response.json();
      
      if (result.modules && result.modules.length > 0) {
        const modulesWithInitialState = result.modules.map((module: Module, index: number) => {
          const consistentPoints = calculatePointsReward(module.estimated_duration, module.difficulty);
          return {
            ...module,
            progress_percentage: 0,
            is_completed: false,
            points_reward: consistentPoints,
            level: Math.floor(completedModules / 3) + 1,
            is_read_only: false
          };
        });
        
        // Save to database
        const modulesToInsert = modulesWithInitialState.map(module => ({
          user_id: userId,
          module_id: module.id,
          title: module.title,
          description: module.description,
          difficulty: module.difficulty,
          estimated_duration: module.estimated_duration,
          points_reward: module.points_reward,
          progress_percentage: 0,
          is_completed: false,
          detailed_content: module.detailed_content,
          level: module.level,
          is_read_only: false
        }));

        const { error } = await supabase
          .from("user_module_progress")
          .insert(modulesToInsert);

        if (error) {
          if (error.code === '23505') {
            throw new Error("Modules already exist");
          }
          throw error;
        }

        return modulesWithInitialState;
      }
      throw new Error("No modules returned from API");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modules'] });
      toast.success("New learning modules generated for your level!");
    },
    onError: (error: any) => {
      if (error.message === "Modules already exist") {
        toast.info("Modules already exist, loading current progress");
        queryClient.invalidateQueries({ queryKey: ['modules'] });
      } else {
        toast.error(`Failed to generate learning modules: ${error.message}`);
      }
    },
  });

  // Generate quizzes for module - REMOVED FALLBACK QUIZZES
  const generateQuizzesForModule = async (module: Module): Promise<QuizQuestion[]> => {
    setLoadingQuizzes(true);
    try {
      const response = await fetch("/api/generateQuizzes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          moduleTitle: module.title,
          moduleContent: module.detailed_content || module.description,
          difficulty: module.difficulty,
          studentSubject: profile?.subject
        }),
      });
      
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const result = await response.json();

      if (result.quizzes && result.quizzes.length > 0) {
        return result.quizzes;
      } else {
        throw new Error("No quizzes returned from API");
      }
    } catch (err: any) {
      console.error("Error generating quizzes:", err);
      throw new Error("Failed to generate quizzes. Please try again.");
    } finally {
      setLoadingQuizzes(false);
    }
  };

  // Module handlers
  const openModule = useCallback(async (module: Module) => {
    setSelectedModule(module);
    
    // For completed/read-only modules, preserve the state
    if (!module.is_completed && !module.is_read_only) {
      setAnswers({});
      setQuizResults({});
      setCompletedQuizzes(new Set());
      setIncorrectQuizzes(new Set());
    }

    // Generate quizzes if needed
    if ((!module.quizzes || module.quizzes.length === 0) && !module.is_completed && !module.is_read_only) {
      try {
        const quizzes = await generateQuizzesForModule(module);
        setSelectedModule(prev => prev ? { ...prev, quizzes } : null);
      } catch (err) {
        console.error("Failed to generate quizzes:", err);
        toast.error("Failed to load quizzes. Please try again.");
      }
    }
  }, []);

  const closeModule = useCallback(() => {
    setSelectedModule(null);
    setLoadingQuizzes(false);
    setIsCompletingModule(false);
  }, []);

  // Quiz handlers
  const handleAnswerSelect = useCallback((quizId: string, answer: string) => {
    if (selectedModule?.is_read_only || selectedModule?.is_completed) {
      toast.info("This module is completed and in read-only mode.");
      return;
    }
    setAnswers(prev => ({ ...prev, [quizId]: answer }));
  }, [selectedModule]);

  // Retry incorrect answers function
  const retryIncorrectAnswers = useCallback(() => {
    if (!selectedModule || selectedModule.is_read_only) return;

    // Clear only incorrect answers and their results
    const newAnswers = { ...answers };
    const newQuizResults = { ...quizResults };
    const newCompletedQuizzes = new Set(completedQuizzes);
    
    incorrectQuizzes.forEach(quizId => {
      delete newAnswers[quizId];
      delete newQuizResults[quizId];
      newCompletedQuizzes.delete(quizId);
    });

    setAnswers(newAnswers);
    setQuizResults(newQuizResults);
    setCompletedQuizzes(newCompletedQuizzes);
    setIncorrectQuizzes(new Set());
    
    toast.info("Retry your incorrect answers!");
  }, [selectedModule, answers, quizResults, completedQuizzes, incorrectQuizzes]);

  // Retry all quizzes function
  const retryAllQuizzes = useCallback(() => {
    if (!selectedModule || selectedModule.is_read_only) return;

    setAnswers({});
    setQuizResults({});
    setCompletedQuizzes(new Set());
    setIncorrectQuizzes(new Set());
    
    toast.info("Starting fresh with all quizzes!");
  }, [selectedModule]);

  // Complete module handler
  const handleCompleteModule = useCallback(async () => {
    if (!selectedModule || !profile) return;

    setIsCompletingModule(true);
    try {
      const score = calculateQuizScore(selectedModule, answers);
      await completeModuleMutation.mutateAsync({ module: selectedModule, score });
    } catch (error) {
      console.error("Error completing module:", error);
    } finally {
      setIsCompletingModule(false);
    }
  }, [selectedModule, profile, answers, calculateQuizScore, completeModuleMutation]);

  // Reset module for retake
  const resetModuleForRetake = useCallback(async () => {
    if (!selectedModule || !profile) return;

    try {
      const { error } = await supabase
        .from("user_module_progress")
        .update({ 
          progress_percentage: 0,
          is_completed: false,
          is_read_only: false
        })
        .eq("module_id", selectedModule.module_id)
        .eq("user_id", profile.id);

      if (error) throw error;

      // Reset local state
      setAnswers({});
      setQuizResults({});
      setCompletedQuizzes(new Set());
      setIncorrectQuizzes(new Set());
      
      // Refresh module data
      queryClient.invalidateQueries({ queryKey: ['modules'] });
      refetchLevel(); // Refresh level progression
      toast.success("Module reset! You can now retake the quiz.");
    } catch (error: any) {
      toast.error(`Failed to reset module: ${error.message}`);
    }
  }, [selectedModule, profile, queryClient, refetchLevel]);

  const submitQuizAnswer = useCallback(async (quiz: QuizQuestion) => {
    if (!selectedModule || selectedModule.is_read_only || selectedModule.is_completed) {
      toast.info("This module is completed and in read-only mode.");
      return;
    }

    const userAnswer = answers[quiz.id];
    if (!userAnswer) {
      toast.error("Please select an answer");
      return;
    }

    const isCorrect = userAnswer === quiz.correct_answer;
    setQuizResults(prev => ({ ...prev, [quiz.id]: isCorrect }));
    setCompletedQuizzes(prev => new Set(prev).add(quiz.id));

    if (isCorrect) {
      toast.success("✅ Correct answer!");
      // Remove from incorrect quizzes if it was there
      setIncorrectQuizzes(prev => {
        const newSet = new Set(prev);
        newSet.delete(quiz.id);
        return newSet;
      });
      
      // Award quiz points
      const quizPoints = 5;
      const newPoints = (profile?.total_points || 0) + quizPoints;
      
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ total_points: newPoints })
        .eq("id", profile?.id);

      if (!profileError) {
        queryClient.invalidateQueries({ queryKey: ['profile'] });
      }

      // Update progress
      const moduleQuizzes = selectedModule.quizzes || [];
      const completedCount = completedQuizzes.size + 1;
      const progressPercentage = Math.min(
        Math.floor((completedCount / moduleQuizzes.length) * 100),
        100
      );

      const { error } = await supabase
        .from("user_module_progress")
        .update({ progress_percentage: progressPercentage })
        .eq("module_id", selectedModule.module_id)
        .eq("user_id", profile?.id);

      if (!error) {
        queryClient.invalidateQueries({ queryKey: ['modules'] });
      }
    } else {
      toast.error("❌ Incorrect answer. Try again!");
      // Add to incorrect quizzes for retry functionality
      setIncorrectQuizzes(prev => new Set(prev).add(quiz.id));
    }
  }, [selectedModule, answers, profile, completedQuizzes, queryClient]);

  // Helper function for read-only quiz display
  const getReadOnlyOptionColor = useCallback((option: string, quiz: QuizQuestion, userAnswer: string | undefined) => {
    if (option === quiz.correct_answer) return 'bg-green-50 border-green-200 text-green-800';
    if (userAnswer && option === userAnswer && option !== quiz.correct_answer) return 'bg-red-50 border-red-200 text-red-800';
    return 'bg-gray-50 border-gray-200 text-gray-600';
  }, []);

  const calculateDayStreak = useCallback(() => profile?.streak_days || 0, [profile]);

  const getLevelIcon = useCallback((level: string) => {
    if (level.includes('Beginner')) return <Star className="h-4 w-4" />;
    if (level.includes('Intermediate')) return <Zap className="h-4 w-4" />;
    return <Crown className="h-4 w-4" />;
  }, []);

  const loading = isProfileLoading || isModulesLoading || isLevelLoading;

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse text-2xl text-primary">Loading...</div>
    </div>
  );

  if (profileError || modulesError || levelError) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-red-600 mb-4">Error Loading Data</h2>
        <p className="text-muted-foreground mb-4">
          {profileError?.message || modulesError?.message || levelError?.message}
        </p>
        <Button onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    </div>
  );

  // Achievements Tab Content
  const renderAchievementsTab = () => {
    if (!userId) {
      return (
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <Gem className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-gray-500 text-lg">Loading user info...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-8">
        {/* Achievements Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full mb-4">
            <Award className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-br from-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
            Your Achievements
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Celebrate your learning journey! Each badge represents a milestone in your educational path.
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600">Total Badges</p>
                  <p className="text-3xl font-bold text-blue-900">{userBadges.length}</p>
                </div>
                <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                  <Award className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600">Completed Modules</p>
                  <p className="text-3xl font-bold text-green-900">
                    {modulesWithConsistentPoints.filter(m => m.is_completed).length}
                  </p>
                </div>
                <div className="p-3 rounded-full bg-green-100 text-green-600">
                  <CheckCircle className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600">Current Level</p>
                  <p className="text-xl font-bold text-purple-900">
                    {levelProgression?.current_level}
                  </p>
                </div>
                <div className="p-3 rounded-full bg-purple-100 text-purple-600">
                  <Crown className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* UserBadges Component */}
        <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-gray-50/50">
          <CardContent className="p-8">
            <UserBadges userId={userId} />
          </CardContent>
        </Card>

        {/* Learning Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Learning Progress
            </CardTitle>
            <CardDescription>
              Your journey towards mastering {profile?.subject || "your chosen subject"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="font-medium">Level Progression</span>
                <span className="text-sm text-muted-foreground">
                  {levelProgression?.completed_modules}/{levelProgression?.total_modules_needed} modules
                </span>
              </div>
              <ColoredProgress 
                value={levelProgression ? (levelProgression.completed_modules / levelProgression.total_modules_needed) * 100 : 0} 
              />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{levelProgression?.current_level}</span>
                <span>{levelProgression?.next_level}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Dashboard Tab Content
  const renderDashboardTab = () => (
    <>
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        {/* Student Info Card - Updated with email and avatar initials */}
        <Card className="lg:col-span-2">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-muted-foreground">Student Information</p>
                <h3 className="text-lg font-semibold">{profile?.full_name}</h3>
                {profile?.email && (
                  <p className="text-sm text-muted-foreground mt-1">{profile.email}</p>
                )}
              </div>
              <div className="flex items-center gap-3">
                {profile?.avatar_url ? (
                  <img 
                    src={profile.avatar_url} 
                    alt="Profile" 
                    className="w-12 h-12 rounded-full border-2 border-primary/20 object-cover"
                  />
                ) : (
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-lg ${getColorFromName(profile?.full_name)} border-2 border-primary/20`}>
                    {getInitials(profile?.full_name)}
                  </div>
                )}
              </div>
            </div>
            
            <div className="space-y-3">
              {/* Academic Level */}
              {profile?.form && (
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium">Academic Level</span>
                  </div>
                  <Badge variant="default" className="bg-blue-100 text-blue-800">
                    {profile.form}
                  </Badge>
                </div>
              )}

              {/* Chosen Subject */}
              {profile?.subject ? (
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium">Chosen Subject</span>
                  </div>
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    {profile.subject}
                  </Badge>
                </div>
              ) : (
                <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-yellow-600" />
                    <span className="text-sm font-medium">Subject</span>
                  </div>
                  <Badge variant="default" className="bg-yellow-100 text-yellow-800">
                    Not Selected
                  </Badge>
                </div>
              )}

              {/* Skill Level */}
              {profile?.skill_level && (
                <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-orange-600" />
                    <span className="text-sm font-medium">Learning Level</span>
                  </div>
                  <Badge variant="default" className="bg-orange-100 text-orange-800 capitalize">
                    {profile.skill_level}
                  </Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Total Points Card */}
        <Card>
          <CardContent className="pt-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Points</p>
              <p className="text-3xl font-bold text-primary">{profile?.total_points || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">Earned from modules & quizzes</p>
            </div>
            <Trophy className="h-6 w-6 text-primary p-3 rounded-full bg-primary/10" />
          </CardContent>
        </Card>

        {/* Day Streak Card */}
        <Card>
          <CardContent className="pt-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Day Streak</p>
              <p className="text-3xl font-bold text-warning">{calculateDayStreak()}</p>
              <p className="text-xs text-muted-foreground mt-1">Consecutive learning days</p>
            </div>
            <Flame className="h-6 w-6 text-warning p-3 rounded-full bg-warning/10" />
          </CardContent>
        </Card>

        {/* Current Level Card */}
        <Card>
          <CardContent className="pt-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Progress Level</p>
              <div className="flex items-center gap-2">
                {getLevelIcon(levelProgression?.current_level || "Beginner Level 1")}
                <Badge variant="secondary">{levelProgression?.current_level}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {levelProgression?.completed_modules}/{levelProgression?.total_modules_needed} modules
              </p>
            </div>
            <Award className="h-6 w-6 text-secondary p-3 rounded-full bg-secondary/10" />
          </CardContent>
        </Card>
      </div>

      {/* Progress Overview Section */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            Learning Progress Overview
          </CardTitle>
          <CardDescription>
            Track your progress and see how close you are to leveling up
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Current Level Progress */}
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="font-medium">Progress to {levelProgression?.next_level}</span>
                <span className="font-semibold text-primary">
                  {levelProgression?.completed_modules}/{levelProgression?.total_modules_needed} modules
                </span>
              </div>
              <ColoredProgress 
                value={levelProgression ? (levelProgression.completed_modules / levelProgression.total_modules_needed) * 100 : 0} 
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  {getLevelIcon(levelProgression?.current_level || "Beginner Level 1")}
                  {levelProgression?.current_level}
                </span>
                <span className="flex items-center gap-1">
                  {getLevelIcon(levelProgression?.next_level || "Beginner Level 2")}
                  {levelProgression?.next_level}
                </span>
              </div>
            </div>

            {/* Progress Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{levelProgression?.completed_modules || 0}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {modulesWithConsistentPoints.filter(m => m.progress_percentage > 0 && !m.is_completed).length}
                </p>
                <p className="text-xs text-muted-foreground">In Progress</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-600">
                  {modulesWithConsistentPoints.filter(m => m.progress_percentage === 0).length}
                </p>
                <p className="text-xs text-muted-foreground">Not Started</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {userBadges.length}
                </p>
                <p className="text-xs text-muted-foreground">Badges</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Badges Summary Card */}
      <Card className="mb-8">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Badges Earned</p>
              <p className="text-3xl font-bold text-purple-600">{userBadges.length}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Complete modules with 85%+ score to earn badges
              </p>
            </div>
            <div className="flex items-center gap-2">
              {userBadges.slice(0, 3).map((badge, index) => (
                <div key={badge.id} className="relative">
                  <div className="p-3 rounded-full bg-purple-100 text-purple-600">
                    <Star className="h-6 w-6" />
                  </div>
                  {index === 2 && userBadges.length > 3 && (
                    <div className="absolute -top-1 -right-1 bg-purple-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                      +{userBadges.length - 3}
                    </div>
                  )}
                </div>
              ))}
              {userBadges.length === 0 && (
                <div className="p-3 rounded-full bg-gray-100 text-gray-400">
                  <Star className="h-6 w-6" />
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Level Progression - Enhanced */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Level Progression Path
          </CardTitle>
          <CardDescription>
            Complete modules with 85% or higher score to level up and unlock new challenges
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Main Progress Bar */}
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="font-medium">Journey to {levelProgression?.next_level}</span>
                <span className="font-semibold">
                  {levelProgression ? Math.round((levelProgression.completed_modules / levelProgression.total_modules_needed) * 100) : 0}% Complete
                </span>
              </div>
              <ColoredProgress 
                value={levelProgression ? (levelProgression.completed_modules / levelProgression.total_modules_needed) * 100 : 0} 
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{levelProgression?.current_level}</span>
                <span>{levelProgression?.next_level}</span>
              </div>
            </div>

            {/* Level Milestones */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className={`p-2 rounded-lg border ${
                levelProgression?.current_level.includes('Beginner') 
                  ? 'bg-blue-50 border-blue-200' 
                  : 'bg-gray-50 border-gray-200'
              }`}>
                <p className="text-xs font-medium">Beginner</p>
                <p className="text-xs text-muted-foreground">0-3 modules</p>
              </div>
              <div className={`p-2 rounded-lg border ${
                levelProgression?.current_level.includes('Intermediate') 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-gray-50 border-gray-200'
              }`}>
                <p className="text-xs font-medium">Intermediate</p>
                <p className="text-xs text-muted-foreground">3-6 modules</p>
              </div>
              <div className={`p-2 rounded-lg border ${
                levelProgression?.current_level.includes('Advanced') 
                  ? 'bg-purple-50 border-purple-200' 
                  : 'bg-gray-50 border-gray-200'
              }`}>
                <p className="text-xs font-medium">Advanced</p>
                <p className="text-xs text-muted-foreground">6+ modules</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Learning Modules Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" /> 
            Your Learning Path
            {profile?.subject && (
              <Badge variant="outline" className="ml-2 text-sm">
                Focus: {profile.subject}
              </Badge>
            )}
          </h2>
          <div className="text-sm text-muted-foreground">
            {modulesWithConsistentPoints.length} module(s)
          </div>
        </div>

        {modulesWithConsistentPoints.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center py-12">
              <BookOpen className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No Learning Modules Yet</h3>
              <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                Get started by generating your personalized learning modules based on your subject and level.
              </p>
              {profile?.subject && profile?.form && (
                <p className="text-sm text-primary mb-6">
                  Your focus: <strong>{profile.subject}</strong> for <strong>{profile.form}</strong>
                </p>
              )}
              <Button 
                onClick={() => profile && generateModulesMutation.mutate(profile.id)} 
                disabled={generateModulesMutation.isPending || !profile}
                size="lg"
              >
                {generateModulesMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Generating Modules...
                  </>
                ) : (
                  "Generate Learning Modules"
                )}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {modulesWithConsistentPoints.map((module) => (
              <ModuleCard 
                key={module.id} 
                module={module} 
                onOpenModule={openModule}
                getStatusText={getStatusText}
                getStatusColor={getStatusColor}
              />
            ))}
          </div>
        )}
      </div>

      {/* Badges Section */}
      {userBadges.length > 0 && (
        <div className="mt-12">
          <h2 className="text-2xl font-bold flex items-center gap-2 mb-6">
            <Award className="h-6 w-6 text-purple-600" /> Your Badges
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {userBadges.map((badge) => (
              <Card key={badge.id} className="relative overflow-hidden">
                <CardContent className="pt-6 flex items-center gap-4">
                  <div className="p-3 rounded-full bg-purple-100 text-purple-600">
                    <Star className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{badge.name}</h3>
                    <p className="text-sm text-muted-foreground">{badge.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Earned {new Date(badge.earned_at).toLocaleDateString()}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      {/* Confetti for celebrations */}
      {showBadgeModal && <Confetti recycle={false} numberOfPieces={200} />}
      {showLevelUpModal && <Confetti recycle={false} numberOfPieces={300} />}

      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-primary to-warning">
                <GraduationCap className="h-6 w-6 text-primary-foreground" />
              </div>
              <div className="flex items-center gap-3">
                <div>
                  <h1 className="text-xl font-bold">AI Learn Tanzania</h1>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-muted-foreground">
                      Welcome, {profile?.full_name || 'User'}
                    </p>
                    {profile?.avatar_url ? (
                      <img 
                        src={profile.avatar_url} 
                        alt="Profile" 
                        className="w-6 h-6 rounded-full border border-primary/20 object-cover"
                      />
                    ) : (
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white font-semibold text-xs ${getColorFromName(profile?.full_name)} border border-primary/20`}>
                        {getInitials(profile?.full_name)}
                      </div>
                    )}
                  </div>
                  {profile?.form && (
                    <span className="text-primary font-medium">- {profile.form}</span>
                  )}
                  {profile?.subject && (
                    <span className="ml-1 text-primary font-medium">• {profile.subject}</span>
                  )}
                  {profile?.skill_level && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Skill Level: <span className="capitalize">{profile.skill_level}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  refetchModules();
                  refetchLevel();
                }}
                disabled={isModulesLoading || isLevelLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isModulesLoading || isLevelLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => supabase.auth.signOut().then(() => navigate("/auth"))}
              >
                <LogOut className="h-4 w-4 mr-2" /> Sign Out
              </Button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex space-x-1">
            <Button
              variant={activeTab === 'dashboard' ? "default" : "ghost"}
              onClick={() => setActiveTab('dashboard')}
              className="flex items-center gap-2"
            >
              <TrendingUp className="h-4 w-4" />
              Dashboard
            </Button>
            <Button
              variant={activeTab === 'achievements' ? "default" : "ghost"}
              onClick={() => setActiveTab('achievements')}
              className="flex items-center gap-2"
            >
              <Award className="h-4 w-4" />
              Achievements
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {activeTab === 'dashboard' ? renderDashboardTab() : renderAchievementsTab()}
      </main>

      {/* Badge Celebration Modal */}
      <Dialog open={showBadgeModal} onOpenChange={setShowBadgeModal}>
        <DialogContent className="max-w-md text-center">
          <DialogHeader>
            <DialogTitle className="flex flex-col items-center gap-4">
              <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center animate-bounce">
                <Star className="h-10 w-10 text-white" />
              </div>
              <span className="text-2xl">Badge Earned! 🎉</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-primary">{earnedBadge?.name}</h3>
            <p className="text-muted-foreground">{earnedBadge?.description}</p>
            <p className="text-sm text-muted-foreground">
              Great job! You've achieved 85% or higher and earned this badge!
            </p>
            <Button 
              onClick={() => setShowBadgeModal(false)} 
              className="w-full"
              size="lg"
            >
              Continue Learning
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Level Up Modal */}
      <Dialog open={showLevelUpModal} onOpenChange={setShowLevelUpModal}>
        <DialogContent className="max-w-md text-center">
          <DialogHeader>
            <DialogTitle className="flex flex-col items-center gap-4">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center animate-pulse">
                <Crown className="h-12 w-12 text-white" />
              </div>
              <span className="text-3xl">Level Up! 🚀</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-primary">
              Congratulations!
            </h3>
            <p className="text-lg">
              You've reached <strong>{levelProgression?.current_level}</strong>
            </p>
            <p className="text-muted-foreground">
              You've completed modules with 85%+ scores and unlocked new challenges!
            </p>
            <div className="flex gap-2">
              <Button 
                onClick={() => setShowLevelUpModal(false)} 
                className="flex-1"
                variant="outline"
              >
                Continue
              </Button>
              <Button 
                onClick={() => {
                  setShowLevelUpModal(false);
                  profile && generateModulesMutation.mutate(profile.id);
                }}
                className="flex-1"
                disabled={generateModulesMutation.isPending}
              >
                {generateModulesMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Generating...
                  </>
                ) : (
                  "New Modules"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Module Dialog - Keep the same as before */}
      <Dialog open={!!selectedModule} onOpenChange={(open) => !open && closeModule()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>{selectedModule?.title}</span>
                {selectedModule?.is_read_only && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Lock className="h-3 w-3" />
                    Read Only
                  </Badge>
                )}
              </div>
              <Button variant="ghost" size="icon" onClick={closeModule}>
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>

          {selectedModule && (
            <div className="space-y-6">
              {/* Module Info */}
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="text-center p-3 bg-muted rounded-lg">
                  <p className="font-semibold">Duration</p>
                  <p>{selectedModule.estimated_duration} min</p>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <p className="font-semibold">Points Reward</p>
                  <p>{selectedModule.points_reward}</p>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <p className="font-semibold">Your Progress</p>
                  <p>{selectedModule.progress_percentage}%</p>
                </div>
              </div>

              {/* Progress Bar with Status */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Module Progress</span>
                  <span>{selectedModule.progress_percentage}%</span>
                </div>
                
                {/* Progress Bar */}
                <ColoredProgress 
                  value={selectedModule.progress_percentage} 
                  className="w-full"
                />
                
                {/* Status Labels */}
                <div className="flex justify-between text-xs">
                  <span className={`px-2 py-1 rounded ${
                    selectedModule.progress_percentage === 0 
                      ? 'bg-yellow-100 text-yellow-800 font-medium' 
                      : 'text-muted-foreground'
                  }`}>
                    Not Started
                  </span>
                  <span className={`px-2 py-1 rounded ${
                    selectedModule.progress_percentage > 0 && selectedModule.progress_percentage < 100 
                      ? 'bg-blue-100 text-blue-800 font-medium' 
                      : 'text-muted-foreground'
                  }`}>
                    In Progress
                  </span>
                  <span className={`px-2 py-1 rounded ${
                    selectedModule.is_completed 
                      ? 'bg-green-100 text-green-800 font-medium' 
                      : 'text-muted-foreground'
                  }`}>
                    Completed
                  </span>
                </div>
              </div>

              {/* Current Score Display */}
              {selectedModule.quizzes && selectedModule.quizzes.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-semibold text-blue-800">Current Quiz Score</h4>
                      <p className="text-blue-600 text-sm">
                        {((Object.values(quizResults).filter(Boolean).length / selectedModule.quizzes.length) * 100).toFixed(1)}% correct
                      </p>
                    </div>
                    <div className="text-right">
                      <h4 className="font-semibold text-blue-800">Required for Badge</h4>
                      <p className="text-blue-600 text-sm">85% or higher</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Module Content */}
              <div className="prose prose-lg max-w-none border rounded-lg p-6 bg-card">
                {selectedModule.detailed_content ? (
                  <ReactMarkdown>
                    {selectedModule.detailed_content}
                  </ReactMarkdown>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-semibold mb-2">Learning Content</p>
                    <p className="mb-4">{selectedModule.description}</p>
                    <p className="text-sm">
                      This module focuses on {selectedModule.title.toLowerCase()}. 
                      Work through the quizzes below to test your understanding.
                    </p>
                  </div>
                )}
              </div>

              {/* Quizzes Section */}
              <div className="border-t pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-primary">
                    Knowledge Check {selectedModule.is_completed && "(Completed)"}
                  </h3>
                  
                  {/* Retry Buttons - Only show if there are incorrect answers and module is not read-only */}
                  {!selectedModule.is_read_only && incorrectQuizzes.size > 0 && (
                    <div className="flex gap-2">
                      <Button
                        onClick={retryIncorrectAnswers}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        <RotateCcw className="h-4 w-4" />
                        Retry Incorrect ({incorrectQuizzes.size})
                      </Button>
                      <Button
                        onClick={retryAllQuizzes}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        <RefreshCw className="h-4 w-4" />
                        Retry All
                      </Button>
                    </div>
                  )}
                </div>

                {/* Quiz Loading State */}
                {loadingQuizzes && (
                  <div className="text-center py-8">
                    <div className="flex flex-col items-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
                      <p className="text-muted-foreground">Loading quizzes...</p>
                    </div>
                  </div>
                )}

                {/* No Quizzes State */}
                {!loadingQuizzes && (!selectedModule.quizzes || selectedModule.quizzes.length === 0) && (
                  <div className="text-center py-8">
                    <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">
                      {selectedModule.is_completed 
                        ? "No quizzes available for this completed module." 
                        : "No quizzes available yet. Complete the module content first."
                      }
                    </p>
                  </div>
                )}

                {/* Quizzes Loaded */}
                {!loadingQuizzes && selectedModule.quizzes && selectedModule.quizzes.length > 0 && (
                  <div className="space-y-4">
                    {selectedModule.quizzes.map((quiz) => (
                      <Card key={quiz.id} className={`p-4 ${incorrectQuizzes.has(quiz.id) ? 'border-red-200 bg-red-50' : ''}`}>
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                          {quiz.question}
                          {incorrectQuizzes.has(quiz.id) && (
                            <Badge variant="destructive" className="text-xs">
                              Needs Retry
                            </Badge>
                          )}
                        </h4>
                        <div className="space-y-2">
                          {quiz.options.map((option, index) => (
                            <label 
                              key={index} 
                              className={`flex items-center gap-2 p-3 rounded border transition-colors ${
                                selectedModule.is_read_only 
                                  ? getReadOnlyOptionColor(option, quiz, answers[quiz.id])
                                  : answers[quiz.id] === option 
                                    ? quizResults[quiz.id] === true
                                      ? 'bg-green-50 border-green-200 text-green-800'
                                      : quizResults[quiz.id] === false
                                      ? 'bg-red-50 border-red-200 text-red-800'
                                      : 'bg-blue-50 border-blue-200 text-blue-800'
                                    : 'hover:bg-gray-50 cursor-pointer'
                              } ${incorrectQuizzes.has(quiz.id) ? 'border-red-100' : ''}`}
                            >
                              <input
                                type="radio"
                                name={`quiz-${quiz.id}`}
                                value={option}
                                checked={answers[quiz.id] === option}
                                onChange={() => handleAnswerSelect(quiz.id, option)}
                                className="mr-2"
                                disabled={selectedModule.is_read_only || loadingQuizzes}
                              />
                              {option}
                              {selectedModule.is_read_only && option === quiz.correct_answer && (
                                <CheckCircle className="h-4 w-4 text-green-600 ml-auto" />
                              )}
                            </label>
                          ))}
                        </div>
                        {!selectedModule.is_read_only && (
                          <Button
                            onClick={() => submitQuizAnswer(quiz)}
                            className="mt-3"
                            disabled={!answers[quiz.id] || loadingQuizzes}
                            variant={incorrectQuizzes.has(quiz.id) ? "destructive" : "default"}
                          >
                            {quizResults[quiz.id] !== undefined 
                              ? quizResults[quiz.id] 
                                ? '✓ Correct - +5 points!' 
                                : '✗ Incorrect - Try Again' 
                              : 'Submit Answer'
                            }
                          </Button>
                        )}
                        {selectedModule.is_read_only && answers[quiz.id] && (
                          <div className="mt-3 p-2 rounded bg-gray-50">
                            <p className="text-sm">
                              <strong>Your answer:</strong> {answers[quiz.id]}
                              {answers[quiz.id] === quiz.correct_answer ? (
                                <span className="text-green-600 ml-2">✓ Correct</span>
                              ) : (
                                <span className="text-red-600 ml-2">✗ Incorrect</span>
                              )}
                            </p>
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {/* Module Completion Status */}
              <div className="pt-4 border-t">
                {selectedModule.is_read_only ? (
                  <div className="text-center space-y-4">
                    <div className="flex items-center justify-center gap-2 text-green-600 mb-2">
                      <CheckCircle className="h-5 w-5" />
                      <span className="font-semibold">Module Completed</span>
                    </div>
                    <p className="text-green-600">
                      ✅ This module is completed and in read-only mode.
                    </p>
                    {calculateQuizScore(selectedModule, answers) < 85 && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <p className="text-yellow-800 font-semibold mb-2">
                          Score: {calculateQuizScore(selectedModule, answers).toFixed(1)}%
                        </p>
                        <p className="text-yellow-700 text-sm mb-3">
                          You scored below 85%. You can retake this module to try for a badge and progression.
                        </p>
                        <Button
                          onClick={resetModuleForRetake}
                          variant="outline"
                          className="flex items-center gap-2"
                        >
                          <RotateCcw className="h-4 w-4" />
                          Retake Module
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="text-center">
                      <p className="text-muted-foreground text-sm mb-2">
                        {incorrectQuizzes.size > 0 
                          ? `You have ${incorrectQuizzes.size} incorrect answer(s) to retry. Complete all quizzes to finish this module.`
                          : "Complete all quizzes above to finish this module"
                        }
                      </p>
                      {incorrectQuizzes.size > 0 && (
                        <div className="flex justify-center gap-2 mt-2">
                          <Button
                            onClick={retryIncorrectAnswers}
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-2"
                          >
                            <RotateCcw className="h-4 w-4" />
                            Retry Incorrect Answers
                          </Button>
                          <Button
                            onClick={retryAllQuizzes}
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-2"
                          >
                            <RefreshCw className="h-4 w-4" />
                            Start Over
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Complete Module Button */}
                    {Object.keys(answers).length === (selectedModule.quizzes?.length || 0) && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h4 className="font-semibold text-blue-800">Ready to Complete Module</h4>
                            <p className="text-blue-600 text-sm">
                              Current score: {calculateQuizScore(selectedModule, answers).toFixed(1)}%
                            </p>
                          </div>
                          <Button
                            onClick={handleCompleteModule}
                            disabled={isCompletingModule}
                            className="flex items-center gap-2"
                            size="lg"
                          >
                            {isCompletingModule ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Completing...
                              </>
                            ) : (
                              <>
                                <CheckCircle className="h-4 w-4" />
                                Complete Module
                              </>
                            )}
                          </Button>
                        </div>
                        <p className="text-blue-700 text-sm">
                          {calculateQuizScore(selectedModule, answers) >= 85 
                            ? "🎉 Great job! You've achieved 85% or higher and will receive a badge and progression!"
                            : "⚠️ Score below 85%. You can complete the module but won't receive a badge. Consider retaking quizzes to improve your score."
                          }
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Memoized Module Card Component
const ModuleCard = ({ 
  module, 
  onOpenModule,
  getStatusText,
  getStatusColor
}: { 
  module: Module; 
  onOpenModule: (module: Module) => void;
  getStatusText: (module: Module) => string;
  getStatusColor: (module: Module) => string;
}) => {
  const statusText = getStatusText(module);
  const statusColor = getStatusColor(module);
  
  return (
    <Card className="shadow-soft hover:shadow-medium transition-all hover:translate-y-[-2px]">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{module.title}</CardTitle>
            <CardDescription className="mt-2 line-clamp-2">{module.description}</CardDescription>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge variant={module.difficulty === "beginner" ? "secondary" : "default"}>
              {module.difficulty}
            </Badge>
            {module.is_completed && (
              <CheckCircle className="h-5 w-5 text-green-500" />
            )}
            {module.is_read_only && (
              <Lock className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="flex items-center justify-between mb-4">
          <ColoredProgress 
            value={module.progress_percentage} 
            className="flex-1 mr-4"
          />
          <span className="text-sm font-medium">{module.progress_percentage}%</span>
        </div>

        {/* Status Badge */}
        <div className="flex items-center justify-between mb-4">
          <div className={`px-2 py-1 rounded border text-xs font-medium ${statusColor}`}>
            {statusText}
            {module.is_read_only && " (Read Only)"}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
          <div className="text-center p-2 bg-muted rounded-lg">
            <p className="font-semibold">Duration</p>
            <p>{module.estimated_duration} min</p>
          </div>
          <div className="text-center p-2 bg-muted rounded-lg">
            <p className="font-semibold">Points</p>
            <p>{module.points_reward}</p>
          </div>
        </div>

        <Button 
          onClick={() => onOpenModule(module)} 
          className="w-full"
          size="lg"
          variant={module.is_completed ? "outline" : "default"}
        >
          <BookOpen className="h-4 w-4 mr-2" />
          {module.is_completed ? "Review Module" : "Open Module"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default Dashboard;