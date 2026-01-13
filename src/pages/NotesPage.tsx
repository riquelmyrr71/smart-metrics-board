import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Upload, Calendar, FileText } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { StandardPageHeader } from "@/components/StandardPageHeader";

interface Note {
  id: string;
  title: string;
  content: string | null;
  image_url: string | null;
  note_date: string;
  created_at: string;
}

const NotesPage = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [noteDate, setNoteDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    try {
      const { data, error } = await supabase
        .from("notes")
        .select("*")
        .order("note_date", { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (error) {
      console.error("Error loading notes:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as anotações.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("note-images")
      .upload(filePath, file);

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return null;
    }

    const { data } = supabase.storage
      .from("note-images")
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast({
        title: "Erro",
        description: "O título é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      let imageUrl: string | null = null;

      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
        if (!imageUrl) {
          throw new Error("Falha no upload da imagem");
        }
      }

      const { error } = await supabase.from("notes").insert({
        title: title.trim(),
        content: content.trim() || null,
        image_url: imageUrl,
        note_date: noteDate,
      });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Anotação salva com sucesso!",
      });

      setTitle("");
      setContent("");
      setNoteDate(format(new Date(), "yyyy-MM-dd"));
      setImageFile(null);
      setImagePreview(null);
      loadNotes();
    } catch (error) {
      console.error("Error saving note:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar a anotação.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, imageUrl: string | null) => {
    try {
      if (imageUrl) {
        const fileName = imageUrl.split("/").pop();
        if (fileName) {
          await supabase.storage.from("note-images").remove([fileName]);
        }
      }

      const { error } = await supabase.from("notes").delete().eq("id", id);
      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Anotação excluída com sucesso!",
      });
      loadNotes();
    } catch (error) {
      console.error("Error deleting note:", error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir a anotação.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <StandardPageHeader 
        title="Anotações"
        icon={<FileText className="h-6 w-6" />}
      />
      
      <div className="p-4 md:p-8">
        <div className="max-w-6xl mx-auto">

          <div className="grid md:grid-cols-2 gap-8">
            {/* Form */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Plus className="h-5 w-5 text-primary" />
                  Nova Anotação
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">
                      Título *
                    </label>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Digite o título..."
                      className="bg-background border-border"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">
                      Data
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="date"
                        value={noteDate}
                        onChange={(e) => setNoteDate(e.target.value)}
                        className="bg-background border-border pl-10"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">
                      Conteúdo
                    </label>
                    <Textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="Digite o conteúdo da anotação..."
                      className="bg-background border-border min-h-[120px]"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">
                      Imagem
                    </label>
                    <div className="border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-primary/50 transition-colors">
                      {imagePreview ? (
                        <div className="relative">
                          <img
                            src={imagePreview}
                            alt="Preview"
                            className="max-h-48 mx-auto rounded-lg"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute top-2 right-2"
                            onClick={() => {
                              setImageFile(null);
                              setImagePreview(null);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <label className="cursor-pointer block">
                          <div className="flex flex-col items-center gap-2 text-muted-foreground">
                            <Upload className="h-8 w-8" />
                            <span className="text-sm">Clique para enviar uma imagem</span>
                          </div>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isSaving}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25"
                  >
                    {isSaving ? "Salvando..." : "Salvar Anotação"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Notes List */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Anotações Salvas ({notes.length})
              </h2>

              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  Carregando...
                </div>
              ) : notes.length === 0 ? (
                <Card className="bg-card border-border">
                  <CardContent className="py-8 text-center text-muted-foreground">
                    Nenhuma anotação encontrada.
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 scrollbar-thin">
                  {notes.map((note) => (
                    <Card key={note.id} className="bg-card border-border hover-lift">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-foreground truncate">
                              {note.title}
                            </h3>
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(note.note_date), "dd 'de' MMMM 'de' yyyy", {
                                locale: ptBR,
                              })}
                            </p>
                            {note.content && (
                              <p className="text-sm text-muted-foreground mt-2 line-clamp-3">
                                {note.content}
                              </p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(note.id, note.image_url)}
                            className="text-destructive hover:bg-destructive/10 shrink-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        {note.image_url && (
                          <div className="mt-3">
                            <img
                              src={note.image_url}
                              alt={note.title}
                              className="rounded-lg max-h-48 object-cover w-full"
                            />
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotesPage;
