-- Create enum for user skill levels
CREATE TYPE skill_level AS ENUM ('beginner', 'intermediate', 'advanced');

-- Create user profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  skill_level skill_level DEFAULT 'beginner',
  total_points INTEGER DEFAULT 0,
  streak_days INTEGER DEFAULT 0,
  last_active_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create assessment questions table
CREATE TABLE public.assessment_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_text TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_answer TEXT NOT NULL,
  skill_area TEXT NOT NULL,
  difficulty skill_level DEFAULT 'beginner',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user assessments table
CREATE TABLE public.user_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  answers JSONB NOT NULL,
  skill_level skill_level NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create learning modules table
CREATE TABLE public.learning_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  content TEXT NOT NULL,
  difficulty skill_level NOT NULL,
  category TEXT NOT NULL,
  estimated_duration INTEGER NOT NULL,
  points_reward INTEGER DEFAULT 10,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user module progress table
CREATE TABLE public.user_module_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  module_id UUID REFERENCES public.learning_modules(id) ON DELETE CASCADE NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  progress_percentage INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, module_id)
);

-- Create quizzes table
CREATE TABLE public.quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID REFERENCES public.learning_modules(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  questions JSONB NOT NULL,
  passing_score INTEGER DEFAULT 70,
  points_reward INTEGER DEFAULT 20,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user quiz attempts table
CREATE TABLE public.user_quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE NOT NULL,
  score INTEGER NOT NULL,
  answers JSONB NOT NULL,
  passed BOOLEAN NOT NULL,
  attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create achievements table
CREATE TABLE public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  points_required INTEGER NOT NULL,
  badge_color TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user achievements table
CREATE TABLE public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  achievement_id UUID REFERENCES public.achievements(id) ON DELETE CASCADE NOT NULL,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_module_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- RLS Policies for assessment questions (public read)
CREATE POLICY "Anyone can view assessment questions"
  ON public.assessment_questions FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for user assessments
CREATE POLICY "Users can view their own assessments"
  ON public.user_assessments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own assessments"
  ON public.user_assessments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for learning modules (public read)
CREATE POLICY "Authenticated users can view modules"
  ON public.learning_modules FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for user module progress
CREATE POLICY "Users can view their own progress"
  ON public.user_module_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own progress"
  ON public.user_module_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress"
  ON public.user_module_progress FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for quizzes (public read)
CREATE POLICY "Authenticated users can view quizzes"
  ON public.quizzes FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for user quiz attempts
CREATE POLICY "Users can view their own quiz attempts"
  ON public.user_quiz_attempts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own quiz attempts"
  ON public.user_quiz_attempts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for achievements (public read)
CREATE POLICY "Authenticated users can view achievements"
  ON public.achievements FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for user achievements
CREATE POLICY "Users can view their own achievements"
  ON public.user_achievements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own achievements"
  ON public.user_achievements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for profiles updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Function to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();