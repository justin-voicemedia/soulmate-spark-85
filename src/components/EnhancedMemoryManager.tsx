import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Search, Plus, Trash2, Edit2, Tag, Star, Clock, X } from "lucide-react";
import { toast } from "sonner";

interface Memory {
  id: string;
  memory_key: string;
  memory_value: string;
  memory_type: string;
  category_id: string | null;
  category_name: string | null;
  tags: string[];
  importance: number;
  last_accessed_at: string | null;
  access_count: number;
  created_at: string;
}

interface Category {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
}

interface EnhancedMemoryManagerProps {
  companionId: string;
  companionName: string;
  isOpen: boolean;
  onClose: () => void;
}

export const EnhancedMemoryManager = ({ companionId, companionName, isOpen, onClose }: EnhancedMemoryManagerProps) => {
  const { user } = useAuth();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Add/Edit memory form
  const [showForm, setShowForm] = useState(false);
  const [editingMemory, setEditingMemory] = useState<Memory | null>(null);
  const [memoryKey, setMemoryKey] = useState("");
  const [memoryValue, setMemoryValue] = useState("");
  const [memoryCategoryId, setMemoryCategoryId] = useState<string | null>(null);
  const [memoryImportance, setMemoryImportance] = useState(5);
  const [memoryTags, setMemoryTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    if (isOpen) {
      loadCategories();
      searchMemories();
    }
  }, [isOpen, companionId, user]);

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('memory_categories')
        .select('*')
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const searchMemories = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('search_memories', {
        p_user_id: user.id,
        p_companion_id: companionId,
        p_search_term: searchTerm || null,
        p_category_id: selectedCategory,
        p_tags: null
      });

      if (error) throw error;
      setMemories(data || []);
    } catch (error) {
      console.error('Error searching memories:', error);
      toast.error("Failed to load memories");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (isOpen) searchMemories();
    }, 300);
    return () => clearTimeout(debounce);
  }, [searchTerm, selectedCategory]);

  const handleAddTag = () => {
    if (tagInput.trim() && !memoryTags.includes(tagInput.trim())) {
      setMemoryTags([...memoryTags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setMemoryTags(memoryTags.filter(t => t !== tag));
  };

  const handleSaveMemory = async () => {
    if (!user || !memoryKey || !memoryValue) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      const memoryData = {
        user_id: user.id,
        companion_id: companionId,
        memory_key: memoryKey,
        memory_value: memoryValue,
        category_id: memoryCategoryId,
        importance: memoryImportance,
        tags: memoryTags,
        memory_type: 'custom'
      };

      if (editingMemory) {
        const { error } = await supabase
          .from('companion_memories')
          .update(memoryData)
          .eq('id', editingMemory.id);

        if (error) throw error;
        toast.success("Memory updated successfully");
      } else {
        const { error } = await supabase
          .from('companion_memories')
          .insert(memoryData);

        if (error) throw error;
        toast.success("Memory added successfully");
      }

      resetForm();
      searchMemories();
    } catch (error: any) {
      console.error('Error saving memory:', error);
      if (error.code === '23505') {
        toast.error("A memory with this key already exists");
      } else {
        toast.error("Failed to save memory");
      }
    }
  };

  const handleEditMemory = (memory: Memory) => {
    setEditingMemory(memory);
    setMemoryKey(memory.memory_key);
    setMemoryValue(memory.memory_value);
    setMemoryCategoryId(memory.category_id);
    setMemoryImportance(memory.importance);
    setMemoryTags(memory.tags || []);
    setShowForm(true);
  };

  const handleDeleteMemory = async (memoryId: string) => {
    if (!confirm("Are you sure you want to delete this memory?")) return;

    try {
      const { error } = await supabase
        .from('companion_memories')
        .delete()
        .eq('id', memoryId);

      if (error) throw error;
      toast.success("Memory deleted successfully");
      searchMemories();
    } catch (error) {
      console.error('Error deleting memory:', error);
      toast.error("Failed to delete memory");
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingMemory(null);
    setMemoryKey("");
    setMemoryValue("");
    setMemoryCategoryId(null);
    setMemoryImportance(5);
    setMemoryTags([]);
    setTagInput("");
  };

  const getCategoryColor = (colorName: string | null) => {
    const colors: Record<string, string> = {
      blue: 'bg-blue-100 text-blue-800 border-blue-200',
      purple: 'bg-purple-100 text-purple-800 border-purple-200',
      green: 'bg-green-100 text-green-800 border-green-200',
      orange: 'bg-orange-100 text-orange-800 border-orange-200',
      red: 'bg-red-100 text-red-800 border-red-200',
      yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      pink: 'bg-pink-100 text-pink-800 border-pink-200',
      cyan: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    };
    return colors[colorName || 'blue'] || colors.blue;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Memory Manager - {companionName}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="browse" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="browse">Browse Memories</TabsTrigger>
            <TabsTrigger value="add" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Memory
            </TabsTrigger>
          </TabsList>

          <TabsContent value="browse" className="space-y-4">
            {/* Search and Filter */}
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search memories..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={selectedCategory || "all"} onValueChange={(val) => setSelectedCategory(val === "all" ? null : val)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.icon} {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Category Filters */}
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <Badge
                  key={cat.id}
                  variant={selectedCategory === cat.id ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
                >
                  {cat.icon} {cat.name}
                </Badge>
              ))}
            </div>

            {/* Memories List */}
            <div className="space-y-3">
              {isLoading ? (
                <p className="text-center text-muted-foreground py-8">Loading memories...</p>
              ) : memories.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No memories found. Add your first memory!</p>
              ) : (
                memories.map((memory) => (
                  <Card key={memory.id} className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-semibold">{memory.memory_key}</h4>
                          {memory.category_name && (
                            <Badge className={getCategoryColor(categories.find(c => c.id === memory.category_id)?.color || null)}>
                              {categories.find(c => c.id === memory.category_id)?.icon} {memory.category_name}
                            </Badge>
                          )}
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            <span>{memory.importance}/10</span>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">{memory.memory_value}</p>
                        {memory.tags && memory.tags.length > 0 && (
                          <div className="flex gap-1 flex-wrap">
                            {memory.tags.map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                <Tag className="h-3 w-3 mr-1" />
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          {memory.access_count > 0 && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Accessed {memory.access_count} times
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => handleEditMemory(memory)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDeleteMemory(memory.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="add" className="space-y-4">
            {showForm && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Memory Key *</Label>
                  <Input
                    placeholder="e.g., Favorite Food, Pet Name, Birthday"
                    value={memoryKey}
                    onChange={(e) => setMemoryKey(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Memory Value *</Label>
                  <Textarea
                    placeholder="e.g., Loves Italian food, especially carbonara"
                    value={memoryValue}
                    onChange={(e) => setMemoryValue(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={memoryCategoryId || ""} onValueChange={setMemoryCategoryId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.icon} {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Importance (1-10)</Label>
                    <Input
                      type="number"
                      min="1"
                      max="10"
                      value={memoryImportance}
                      onChange={(e) => setMemoryImportance(parseInt(e.target.value) || 5)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Tags</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a tag..."
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                    />
                    <Button type="button" onClick={handleAddTag}>Add</Button>
                  </div>
                  {memoryTags.length > 0 && (
                    <div className="flex gap-1 flex-wrap mt-2">
                      {memoryTags.map((tag) => (
                        <Badge key={tag} variant="secondary">
                          {tag}
                          <X
                            className="h-3 w-3 ml-1 cursor-pointer"
                            onClick={() => handleRemoveTag(tag)}
                          />
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-4">
                  <Button onClick={handleSaveMemory} className="flex-1">
                    {editingMemory ? "Update Memory" : "Save Memory"}
                  </Button>
                  <Button variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
