import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { BookOpen, User, LogOut, Trash2, Copy } from "lucide-react";
import { toast } from "sonner";
import MDEditor from "@uiw/react-md-editor";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

type ContentType = "lesson" | "academic";
type QuizType = "mcq" | "written" | "both";
type Language = "en" | "sw";

interface ContentItem {
  id: string;
  topic: string;
  content: string;
  quizzes?: any;
  lesson_type?: string;
  material_type?: string;
  content_type?: string;
  length?: string;
}

const TeacherPage = () => {
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<{ full_name: string } | null>(null);
  const [lessons, setLessons] = useState<ContentItem[]>([]);
  const [academicContent, setAcademicContent] = useState<ContentItem[]>([]);
  const [contentType, setContentType] = useState<ContentType>("lesson");

  const lessonFormRef = useRef<HTMLFormElement>(null);

  // Form state
  const [topic, setTopic] = useState("");
  const [lessonType, setLessonType] = useState("full_lesson");
  const [materialType, setMaterialType] = useState("text");
  const [academicFormat, setAcademicFormat] = useState("Short Story");
  const [length, setLength] = useState("");
  const [aiContent, setAiContent] = useState("");
  const [quizType, setQuizType] = useState<QuizType>("both");
  const [aiLoading, setAiLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [lang, setLang] = useState<Language>("en");
  const [includeQuiz, setIncludeQuiz] = useState(false);

  const t = {
    en: {
      createLesson: "Create Lesson",
      createAcademic: "Create Academic Content",
      topicPlaceholder: "Enter topic...",
      lessonType: "Lesson Type",
      materialType: "Material Type",
      academicFormat: "Content Type",
      length: "Length / Prompt",
      generateAI: "Generate with AI",
      aiLoading: "Generating...",
      previewMarkdown: "Toggle Preview",
      save: "Save",
      myLessons: "My Lessons",
      myAcademic: "My Academic Content",
      noLessons: "You haven't created any lessons yet.",
      noAcademic: "You haven't created any academic content yet.",
      deleteConfirm: "Are you sure you want to delete this content?",
      copy: "Copy",
      quizType: "Quiz Type",
      includeQuiz: "Include Quiz",
    },
    sw: {
      createLesson: "Unda Somo",
      createAcademic: "Unda Maudhui ya Kitaaluma",
      topicPlaceholder: "Weka mada...",
      lessonType: "Aina ya Somo",
      materialType: "Aina ya Nyenzo",
      academicFormat: "Aina ya Maudhui",
      length: "Urefu / Maelezo",
      generateAI: "Tengeneza na AI",
      aiLoading: "Inatengeneza...",
      previewMarkdown: "Onyesha Muonekano",
      save: "Hifadhi",
      myLessons: "Masomo Yangu",
      myAcademic: "Maudhui Yangu ya Kitaaluma",
      noLessons: "Bado hujaunda somo lolote.",
      noAcademic: "Bado hujaunda maudhui yoyote ya kitaaluma.",
      deleteConfirm: "Una uhakika unataka kufuta maudhui haya?",
      copy: "Nakili",
      quizType: "Aina ya Maswali",
      includeQuiz: "Weka Maswali",
    },
  }[lang];

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
      setUserProfile(profile);

      // Load lessons
      const { data: lessonData } = await supabase
        .from("lessons")
        .select("id, title, content, quizzes, type, content_type, created_at")
        .eq("teacher_id", user.id)
        .order("created_at", { ascending: false });

      const mappedLessons = lessonData?.map(lesson => ({
        id: lesson.id,
        topic: lesson.title,
        content: lesson.content,
        quizzes: lesson.quizzes,
        lesson_type: lesson.type,
        material_type: lesson.content_type
      })) || [];

      // Load academic content
      const { data: academicData } = await supabase
        .from("academic")
        .select("id, topic, content, content_type, length, created_at")
        .eq("teacher_id", user.id)
        .order("created_at", { ascending: false });

      const mappedAcademic = academicData?.map(academic => ({
        id: academic.id,
        topic: academic.topic,
        content: academic.content,
        content_type: academic.content_type,
        length: academic.length
      })) || [];

      setLessons(mappedLessons);
      setAcademicContent(mappedAcademic);
    } catch (err: any) {
      console.error("Load error:", err);
      toast.error(err.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const generateAIContent = async () => {
    if (!topic.trim()) return toast.error("Please enter a topic");
    setAiLoading(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error("Not authenticated");

      // Prepare request body based on content type
      const requestBody: any = {
        topic,
        grade: "Form 4",
        lang,
      };

      if (contentType === "lesson") {
        // Lesson request
        requestBody.contentType = "lesson";
        requestBody.lessonType = lessonType;
        requestBody.materialType = materialType;
        requestBody.quizType = quizType;
      } else {
        // Academic content request
        requestBody.contentType = "academic";
        requestBody.academicFormat = academicFormat;
        requestBody.length = length;
        // Only include quiz type if quiz is enabled for academic content
        if (includeQuiz) {
          requestBody.quizType = quizType;
        }
      }

      console.log("Sending request:", requestBody);

      const res = await fetch(
        "https://bnfaxorbbakzxtudxwil.supabase.co/functions/v1/generate-lesson",
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(requestBody),
        }
      );

      if (!res.ok) {
        const text = await res.text();
        console.error("Supabase function error:", text);
        toast.error("Failed to generate AI content");
        return;
      }

      const data = await res.json();
      setAiContent(data.content || "");
      toast.success("AI content generated successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to generate AI content");
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return toast.error("You must be logged in");

      if (contentType === "lesson") {
        // Save as lesson
        const quizzesData = {
          type: quizType,
          generated: new Date().toISOString()
        };

        const { data, error } = await supabase
          .from("lessons")
          .insert([
            {
              title: topic,
              content: aiContent,
              quizzes: quizzesData,
              teacher_id: user.id,
              type: lessonType,
              content_type: materialType,
              status: 'draft',
              form: 'standard'
            }
          ])
          .select()
          .single();

        if (error) throw error;

        const newLesson: ContentItem = {
          id: data.id,
          topic: data.title,
          content: data.content,
          quizzes: data.quizzes,
          lesson_type: data.type,
          material_type: data.content_type
        };

        setLessons(prev => [newLesson, ...prev]);
        toast.success("Lesson saved successfully!");

      } else {
        // Save as academic content
        const { data, error } = await supabase
          .from("academic")
          .insert([
            {
              topic,
              content: aiContent,
              teacher_id: user.id,
              content_type: academicFormat,
              length: length
            }
          ])
          .select()
          .single();

        if (error) throw error;

        const newAcademic: ContentItem = {
          id: data.id,
          topic: data.topic,
          content: data.content,
          content_type: data.content_type,
          length: data.length
        };

        setAcademicContent(prev => [newAcademic, ...prev]);
        toast.success("Academic content saved successfully!");
      }

      // Reset form
      setTopic("");
      setAiContent("");
      setQuizType("both");
      setLength("");
      setIncludeQuiz(false);
      
    } catch (err: any) {
      console.error("Save error:", err);
      toast.error(err.message || "Failed to save content");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (table: "lessons" | "academic", id: string) => {
    if (!confirm(t.deleteConfirm)) return;
    try {
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw error;
      
      if (table === "lessons") {
        setLessons(prev => prev.filter(l => l.id !== id));
      } else {
        setAcademicContent(prev => prev.filter(a => a.id !== id));
      }
      
      toast.success("Deleted successfully!");
    } catch (err: any) {
      toast.error(err.message || "Delete failed");
    }
  };

  const handleCopy = async (text: string, e?: React.MouseEvent) => {
    // Prevent event propagation to avoid form submission
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    try {
      if (!navigator.clipboard) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        toast.success("Copied using fallback method!");
        return;
      }

      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard!");
    } catch (err) {
      console.error('Failed to copy: ', err);
      prompt('Copy the following text manually:', text);
    }
  };

  const getQuizTypeDisplay = (quizzes: any): string => {
    if (!quizzes) return "";
    if (typeof quizzes === 'string') return quizzes;
    if (quizzes.type) return quizzes.type;
    return JSON.stringify(quizzes);
  };

  const ContentList = ({ items, table }: { items: ContentItem[], table: "lessons" | "academic" }) => (
    <>
      {items.length === 0 ? (
        <p>{table === "lessons" ? t.noLessons : t.noAcademic}</p>
      ) : (
        items.map(item => (
          <Card key={item.id} className="p-3 my-2">
            <div className="flex justify-between items-center">
              <div className="font-semibold">
                {item.topic} ({table === "lessons" ? item.lesson_type : item.content_type})
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleCopy(item.content, e);
                  }}
                >
                  <Copy className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleDelete(table, item.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => setPreviewingId(previewingId === item.id ? null : item.id)}
            >
              {previewingId === item.id ? "Hide Preview" : "Show Preview"}
            </Button>
            {previewingId === item.id && (
              <Card className="p-2 bg-muted mt-2">
                <MDEditor.Markdown source={item.content} />
                {table === "lessons" && item.quizzes && (
                  <div className="mt-2">
                    <strong>Quiz Type:</strong> {getQuizTypeDisplay(item.quizzes)}
                  </div>
                )}
              </Card>
            )}
          </Card>
        ))
      )}
    </>
  );

  if (loading) return <div>Loading...</div>;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-card shadow-sm p-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold">LearnHub Teacher</span>
        </div>
        <div className="flex items-center gap-2">
          <User className="h-4 w-4" />
          <span>{userProfile?.full_name}</span>
          <Button variant="ghost" onClick={handleLogout}>
            <LogOut />
          </Button>
        </div>
      </header>

      <main className="p-6 flex flex-col gap-6">
        {/* Toggle Buttons */}
        <div className="flex gap-4">
          <Button onClick={() => setContentType("lesson")} variant={contentType === "lesson" ? "default" : "outline"}>
            {t.createLesson}
          </Button>
          <Button onClick={() => setContentType("academic")} variant={contentType === "academic" ? "default" : "outline"}>
            {t.createAcademic}
          </Button>
        </div>

        {/* Content Creation Form */}
        <Card className="p-6">
          <form ref={lessonFormRef} onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input placeholder={t.topicPlaceholder} value={topic} onChange={(e) => setTopic(e.target.value)} required />

            {contentType === "lesson" ? (
              <>
                <Select value={lessonType} onValueChange={setLessonType}>
                  <SelectTrigger className="w-44"><SelectValue placeholder={t.lessonType} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full_lesson">Full Lesson</SelectItem>
                    <SelectItem value="summary">Summary</SelectItem>
                    <SelectItem value="quick_write">Quick Write</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={materialType} onValueChange={setMaterialType}>
                  <SelectTrigger className="w-44"><SelectValue placeholder={t.materialType} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="ppt">PPT/PDF</SelectItem>
                    <SelectItem value="google">Google Drive</SelectItem>
                  </SelectContent>
                </Select>
                
                {/* Quiz Type for Lessons (always shown) */}
                <Select value={quizType} onValueChange={(val) => setQuizType(val as QuizType)}>
                  <SelectTrigger className="w-44"><SelectValue placeholder={t.quizType} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mcq">MCQ</SelectItem>
                    <SelectItem value="written">Written</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </>
            ) : (
              <>
                <Select value={academicFormat} onValueChange={setAcademicFormat}>
                  <SelectTrigger className="w-44"><SelectValue placeholder={t.academicFormat} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Short Story">Short Story</SelectItem>
                    <SelectItem value="Procedural">Procedural</SelectItem>
                    <SelectItem value="Persuasive">Persuasive</SelectItem>
                    <SelectItem value="Textbook Page">Textbook Page</SelectItem>
                  </SelectContent>
                </Select>
                <Input placeholder={t.length} value={length} onChange={(e) => setLength(e.target.value)} />
                
                {/* Quiz Toggle for Academic Content */}
                <div className="flex items-center space-x-2">
                  <Switch
                    id="include-quiz"
                    checked={includeQuiz}
                    onCheckedChange={setIncludeQuiz}
                  />
                  <Label htmlFor="include-quiz">{t.includeQuiz}</Label>
                </div>

                {/* Quiz Type for Academic (only shown when includeQuiz is true) */}
                {includeQuiz && (
                  <Select value={quizType} onValueChange={(val) => setQuizType(val as QuizType)}>
                    <SelectTrigger className="w-44"><SelectValue placeholder={t.quizType} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mcq">MCQ</SelectItem>
                      <SelectItem value="written">Written</SelectItem>
                      <SelectItem value="both">Both</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </>
            )}

            <div className="flex gap-2">
              <Button type="button" onClick={generateAIContent} disabled={aiLoading}>
                {aiLoading ? t.aiLoading : t.generateAI}
              </Button>
              <Button type="submit" disabled={formLoading || !aiContent}>
                {t.save}
              </Button>
              <Button type="button" onClick={() => setShowPreview(p => !p)}>
                {t.previewMarkdown}
              </Button>
            </div>
          </form>

          {/* Moved preview outside the form to prevent accidental form submission */}
          {showPreview && (
            <Card className="p-3 bg-muted mt-4">
              <MDEditor.Markdown source={aiContent || "AI content will appear here"} />
              {/* Show quiz type in preview based on content type and settings */}
              {(contentType === "lesson" || (contentType === "academic" && includeQuiz)) && quizType && (
                <div className="mt-2"><strong>Quiz Type:</strong> {quizType}</div>
              )}
              <Button 
                type="button"
                variant="ghost" 
                onClick={(e) => handleCopy(aiContent, e)}
                className="mt-2"
              >
                <Copy className="inline h-4 w-4 mr-1" /> {t.copy}
              </Button>
            </Card>
          )}
        </Card>

        {/* Saved Content */}
        <Card className="p-4">
          <h2 className="font-bold mb-2">{t.myLessons} ({lessons.length})</h2>
          <ContentList items={lessons} table="lessons" />
        </Card>

        <Card className="p-4">
          <h2 className="font-bold mb-2">{t.myAcademic} ({academicContent.length})</h2>
          <ContentList items={academicContent} table="academic" />
        </Card>
      </main>
    </div>
  );
};

export default TeacherPage;