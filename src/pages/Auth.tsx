import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GraduationCap, Sparkles } from "lucide-react";

const Auth = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [selectedForm, setSelectedForm] = useState<string>("");
  const [availableSubjects, setAvailableSubjects] = useState<string[]>([]);

  const primarySubjects = [
    "English",
    "Kiswahili",
    "Mathematics",
    "Science",
    "Social Studies",
    "Civics",
    "Vocational Skills",
    "Religion",
  ];

  const secondarySubjects = [
    "English",
    "Kiswahili",
    "Mathematics",
    "Biology",
    "Physics",
    "Chemistry",
    "Geography",
    "History",
    "Civics",
    "Commerce",
    "Bookkeeping",
  ];

  const advancedSubjects = [
    "General Studies",
    "Physics",
    "Chemistry",
    "Biology",
    "Mathematics",
    "Geography",
    "History",
    "Economics",
    "English Language",
    "Kiswahili",
    "Computer Studies",
  ];

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .single()
          .then(({ data }) => {
            if (data?.role === "teacher") navigate("/teacher/dashboard");
            else navigate("/student/dashboard");
          });
      }
    });
  }, [navigate]);

  // Update subjects dynamically based on form selection
  useEffect(() => {
    if (selectedForm.startsWith("Grade")) setAvailableSubjects(primarySubjects);
    else if (["Form 1", "Form 2", "Form 3", "Form 4"].includes(selectedForm))
      setAvailableSubjects(secondarySubjects);
    else if (["Form 5", "Form 6"].includes(selectedForm))
      setAvailableSubjects(advancedSubjects);
    else setAvailableSubjects([]);
  }, [selectedForm]);

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const fullName = formData.get("fullName") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const skillLevel = formData.get("skillLevel") as string;
    const role = formData.get("role") as string;
    const form = formData.get("form") as string;
    const subject = formData.get("subject") as string;

    console.log("Registration data:", { fullName, email, role, form, subject, skillLevel });

    try {
      // First create the auth user
      const { data: { user }, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { 
          data: { 
            full_name: fullName, 
            role: role 
          } 
        },
      });

      if (authError) {
        console.error("Auth error:", authError);
        throw authError;
      }
      
      if (!user) {
        throw new Error("Failed to create user");
      }

      console.log("User created:", user.id);

      // Prepare complete profile data with ALL required fields
      const profileData = {
        id: user.id,
        full_name: fullName,
        email: email,
        role: role,
        skill_level: skillLevel,
        form: role === "student" ? form : null,
        subject: role === "student" ? subject : null,
        interests: null,
        total_points: 0,
        streak_days: 0,
        avatar_url: null,
        current_form: null,
        institution: null
      };

      console.log("Saving profile data:", profileData);

      // Wait a moment to ensure user is fully created
      await new Promise(resolve => setTimeout(resolve, 1000));

      const { error: profileError } = await supabase
        .from("profiles")
        .insert(profileData);

      if (profileError) {
        console.error("Profile error:", profileError);
        
        // If it's a duplicate error, try update instead
        if (profileError.code === '23505') {
          const { error: updateError } = await supabase
            .from("profiles")
            .update(profileData)
            .eq("id", user.id);
            
          if (updateError) {
            throw updateError;
          }
        } else {
          throw profileError;
        }
      }

      toast.success("Account created successfully!");
      
      // Wait a moment for the profile to be saved
      setTimeout(() => {
        navigate(role === "teacher" ? "/teacher/dashboard" : "/student/dashboard");
      }, 1000);
      
    } catch (err: any) {
      console.error("Registration error:", err);
      toast.error(err.message || "Failed to sign up");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      const { error, data: { user } } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      toast.success("Signed in successfully!");
      if (user) {
        const { data } = await supabase.from("profiles").select("role").eq("id", user.id).single();
        if (data?.role === "teacher") navigate("/teacher/dashboard");
        else navigate("/student/dashboard");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to sign in");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
      <Card className="w-full max-w-md shadow-strong">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-primary to-warning">
              <GraduationCap className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold">AI Learn Tanzania</CardTitle>
          <CardDescription className="flex items-center justify-center gap-2">
            <Sparkles className="h-4 w-4" />
            Personalized AI Learning for East Africa
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            {/* SIGN IN */}
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <Label>Email</Label>
                  <Input name="email" type="email" required placeholder="you@example.com" />
                </div>
                <div>
                  <Label>Password</Label>
                  <Input name="password" type="password" required placeholder="••••••••" />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Signing in..." : "Sign In"}
                </Button>
              </form>
            </TabsContent>

            {/* SIGN UP */}
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div>
                  <Label>Full Name</Label>
                  <Input name="fullName" required placeholder="John Doe" />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input name="email" type="email" required placeholder="you@example.com" />
                </div>
                <div>
                  <Label>Password</Label>
                  <Input name="password" type="password" required minLength={6} placeholder="••••••••" />
                </div>

                <div>
                  <Label>Register As</Label>
                  <select 
                    name="role" 
                    className="w-full border rounded px-2 py-1" 
                    required 
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                  >
                    <option value="">Select Role</option>
                    <option value="teacher">Teacher</option>
                    <option value="student">Student</option>
                  </select>
                </div>

                {selectedRole === "student" && (
                  <>
                    <div>
                      <Label>Grade / Form</Label>
                      <select
                        name="form"
                        className="w-full border rounded px-2 py-1"
                        required
                        value={selectedForm}
                        onChange={(e) => setSelectedForm(e.target.value)}
                      >
                        <option value="">Select Level</option>
                        <optgroup label="Primary">
                          <option value="Grade 1">Grade 1</option>
                          <option value="Grade 2">Grade 2</option>
                          <option value="Grade 3">Grade 3</option>
                          <option value="Grade 4">Grade 4</option>
                          <option value="Grade 5">Grade 5</option>
                          <option value="Grade 6">Grade 6</option>
                        </optgroup>
                        <optgroup label="Secondary">
                          <option value="Form 1">Form 1</option>
                          <option value="Form 2">Form 2</option>
                          <option value="Form 3">Form 3</option>
                          <option value="Form 4">Form 4</option>
                        </optgroup>
                        <optgroup label="Advanced">
                          <option value="Form 5">Form 5</option>
                          <option value="Form 6">Form 6</option>
                        </optgroup>
                      </select>
                    </div>

                    {availableSubjects.length > 0 && (
                      <div>
                        <Label>Subject</Label>
                        <select name="subject" className="w-full border rounded px-2 py-1" required>
                          <option value="">Select Subject</option>
                          {availableSubjects.map((subj) => (
                            <option key={subj} value={subj}>
                              {subj}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </>
                )}

                <div>
                  <Label>Skill Level</Label>
                  <select name="skillLevel" required className="w-full border rounded px-2 py-1">
                    <option value="">Select Skill Level</option>
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Creating account..." : "Create Account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;