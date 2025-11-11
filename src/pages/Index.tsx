import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { GraduationCap, Brain, Trophy, Sparkles, ArrowRight } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="flex justify-center mb-6 animate-float">
            <div className="p-6 rounded-3xl bg-gradient-to-br from-primary via-warning to-secondary shadow-strong">
              <GraduationCap className="h-16 w-16 text-white" />
            </div>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-primary via-warning to-secondary bg-clip-text text-transparent">
            AI Learn Tanzania
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
            Your personalized AI-powered learning platform for mastering AI tools and technologies across East Africa
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
            <Button
              size="lg"
              onClick={() => navigate("/auth")}
              className="text-lg px-8 shadow-medium hover:shadow-strong transition-all group"
            >
              Get Started
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate("/auth")}
              className="text-lg px-8"
            >
              Sign In
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="p-6 rounded-2xl bg-card shadow-soft hover:shadow-medium transition-all">
            <div className="p-3 rounded-xl bg-primary/10 w-fit mb-4">
              <Brain className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-bold mb-2">Personalized Learning</h3>
            <p className="text-muted-foreground">
              AI-powered assessment creates a custom learning journey tailored to your skill level
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-card shadow-soft hover:shadow-medium transition-all">
            <div className="p-3 rounded-xl bg-secondary/10 w-fit mb-4">
              <Sparkles className="h-8 w-8 text-secondary" />
            </div>
            <h3 className="text-xl font-bold mb-2">Interactive Modules</h3>
            <p className="text-muted-foreground">
              Engaging content with quizzes and hands-on exercises to reinforce your learning
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-card shadow-soft hover:shadow-medium transition-all">
            <div className="p-3 rounded-xl bg-warning/10 w-fit mb-4">
              <Trophy className="h-8 w-8 text-warning" />
            </div>
            <h3 className="text-xl font-bold mb-2">Gamification</h3>
            <p className="text-muted-foreground">
              Earn points, maintain streaks, and unlock achievements as you progress
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-3xl mx-auto text-center bg-gradient-to-r from-primary/10 to-secondary/10 rounded-3xl p-12 shadow-medium">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Start Your AI Journey?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Join thousands of learners across East Africa mastering AI technologies
          </p>
          <Button
            size="lg"
            onClick={() => navigate("/auth")}
            className="text-lg px-12 shadow-medium hover:shadow-strong transition-all"
          >
            Begin Learning Today
          </Button>
        </div>
      </section>
    </div>
  );
};

export default Index;
