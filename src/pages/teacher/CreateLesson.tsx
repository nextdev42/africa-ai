import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Upload } from "lucide-react";

const CreateLesson = () => {
  const navigate = useNavigate();

  // -------------------- STATES --------------------
  const [title, setTitle] = useState("");
  const [lessonType, setLessonType] = useState("full_lesson");
  const [contentType, setContentType] = useState("text");
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [lang, setLang] = useState<"en" | "sw">("en"); // language toggle

  // -------------------- TRANSLATIONS --------------------
  const t = {
    en: {
      pageTitle: "Create a Lesson",
      titlePlaceholder: "Lesson Title",
      lessonType: "Lesson Type",
      contentType: "Content Source",
      pasteText: "Paste Text",
      uploadPDF: "Upload PDF",
      uploadPPT: "Upload Presentation",
      pasteLesson: "Paste your lesson text or notes here...",
      uploadPrompt: "Upload a file (PDF or PPT)",
      saving: "Saving...",
      create: "Create Lesson",
      onlyTeachers: "Only teachers can create lessons",
      mustLogin: "You must be logged in to create a lesson",
      success: "Lesson created successfully!",
    },
    sw: {
      pageTitle: "Unda Somo",
      titlePlaceholder: "Kichwa cha Somo",
      lessonType: "Aina ya Somo",
      contentType: "Chanzo cha Maudhui",
      pasteText: "Andika Maandishi",
      uploadPDF: "Pakia PDF",
      uploadPPT: "Pakia Uwasilishaji (PPT)",
      pasteLesson: "Weka maandiko ya somo lako hapa...",
      uploadPrompt: "Pakia faili (PDF au PPT)",
      saving: "Inahifadhi...",
      create: "Unda Somo",
      onlyTeachers: "Walimu pekee ndio wanaweza kuunda masomo",
      mustLogin: "Lazima uingie ili kuunda somo",
      success: "Somo limeundwa kwa mafanikio!",
    },
  }[lang];

  // -------------------- FILE UPLOAD --------------------
  const uploadLessonFile = async () => {
    if (!file) return null;

    try {
      const fileName = `${Date.now()}-${file.name}`;
      const { error } = await supabase.storage
        .from("lesson_files")
        .upload(fileName, file);

      if (error) throw error;

      const {
        data: { publicUrl },
      } = supabase.storage.from("lesson_files").getPublicUrl(fileName);

      return publicUrl;
    } catch (err) {
      console.error("File upload error:", err);
      toast.error("Failed to upload file");
      return null;
    }
  };

  // -------------------- SUBMIT HANDLER --------------------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error(t.mustLogin);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role !== "teacher") {
        toast.error(t.onlyTeachers);
        return;
      }

      let fileUrl = null;
      if (contentType !== "text") {
        fileUrl = await uploadLessonFile();
      }

      const { error } = await supabase.from("lessons").insert([
        {
          title,
          type: lessonType,
          content_type: contentType,
          content: contentType === "text" ? content : null,
          file_url: fileUrl,
          teacher_id: user.id,
        },
      ]);

      if (error) throw error;

      toast.success(t.success);
      navigate("/teacher/dashboard");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // -------------------- JSX --------------------
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-3xl mx-auto bg-card rounded-xl shadow-lg p-8 space-y-6">
        {/* Language Toggle */}
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setLang(lang === "en" ? "sw" : "en")}
          >
            {lang === "en" ? "🇹🇿 Badili Kiswahili" : "🇬🇧 Switch to English"}
          </Button>
        </div>

        <h1 className="text-2xl font-bold text-center">{t.pageTitle}</h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Title */}
          <Input
            placeholder={t.titlePlaceholder}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          {/* Lesson Type */}
          <div>
            <label className="block text-sm font-medium mb-2">
              {t.lessonType}
            </label>
            <Select value={lessonType} onValueChange={setLessonType}>
              <SelectTrigger>
                <SelectValue placeholder="Select Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full_lesson">
                  {lang === "en" ? "Full Lesson" : "Somo Kamili"}
                </SelectItem>
                <SelectItem value="quick_write">
                  {lang === "en" ? "Quick Write" : "Uandishi Mfupi"}
                </SelectItem>
                <SelectItem value="test_prep">
                  {lang === "en" ? "Test Prep" : "Maandalizi ya Mtihani"}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Content Type */}
          <div>
            <label className="block text-sm font-medium mb-2">
              {t.contentType}
            </label>
            <Select value={contentType} onValueChange={setContentType}>
              <SelectTrigger>
                <SelectValue placeholder="Select Content Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">{t.pasteText}</SelectItem>
                <SelectItem value="pdf">{t.uploadPDF}</SelectItem>
                <SelectItem value="ppt">{t.uploadPPT}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Dynamic Input */}
          {contentType === "text" ? (
            <Textarea
              placeholder={t.pasteLesson}
              rows={8}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
            />
          ) : (
            <div className="border-2 border-dashed border-muted p-6 rounded-xl flex flex-col items-center justify-center">
              <Upload className="h-8 w-8 text-primary mb-2" />
              <p className="text-sm text-muted-foreground mb-2">
                {file ? file.name : t.uploadPrompt}
              </p>
              <Input
                type="file"
                accept={contentType === "pdf" ? ".pdf" : ".ppt,.pptx"}
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                required
              />
            </div>
          )}

          {/* Submit */}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? t.saving : t.create}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default CreateLesson;
