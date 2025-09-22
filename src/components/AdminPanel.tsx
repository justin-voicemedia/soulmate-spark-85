import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useImageGeneration } from '@/hooks/useImageGeneration';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { RefreshCw, Image as ImageIcon, Sparkles, Upload, Settings, Home, Edit3, Save, X, Users, Mail, Calendar, CreditCard, Crown } from 'lucide-react';
import { CompanionImageManager } from './CompanionImageManager';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface Companion {
  id: string;
  name: string;
  age: number;
  gender: string;
  bio: string;
  hobbies: string[];
  personality: string[];
  likes: string[];
  dislikes: string[];
  image_url: string;
}

interface ClientData {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  subscription?: {
    id: string;
    status: string;
    plan_type: string;
    current_period_start?: string;
    current_period_end?: string;
    stripe_customer_id?: string;
    spicy_unlocked?: boolean;
  };
  subscriber?: {
    id: string;
    subscribed: boolean;
    subscription_tier?: string;
    trial_start?: string;
    trial_minutes_used?: number;
    trial_minutes_limit?: number;
    stripe_customer_id?: string;
  };
  usage_stats?: {
    total_sessions: number;
    total_minutes: number;
    last_session?: string;
  };
}

export const AdminPanel = () => {
  const [companions, setCompanions] = useState<Companion[]>([]);
  const [companionsLoading, setCompanionsLoading] = useState(false);
  const [generatingImages, setGeneratingImages] = useState(false);
  const [regeneratingImages, setRegeneratingImages] = useState(false);
  const [selectedCompanions, setSelectedCompanions] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState<string[]>([]);
  const [editingCompanions, setEditingCompanions] = useState<string[]>([]);
  const [savingCompanions, setSavingCompanions] = useState<string[]>([]);
  const [editFormData, setEditFormData] = useState<Record<string, Partial<Companion>>>({});
  const [relationshipPrompts, setRelationshipPrompts] = useState<Record<string, string>>({});
  const [promptsLoading, setPromptsLoading] = useState(false);
  const [savingPrompts, setSavingPrompts] = useState(false);
  
  // Client management state
  const [clients, setClients] = useState<ClientData[]>([]);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [editingClients, setEditingClients] = useState<string[]>([]);
  const [savingClients, setSavingClients] = useState<string[]>([]);
  const [clientEditFormData, setClientEditFormData] = useState<Record<string, Partial<ClientData>>>({});
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const { generateCompanionImage } = useImageGeneration();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const loadCompanions = async () => {
    setCompanionsLoading(true);
    try {
      const { data, error } = await supabase
        .from('companions')
        .select('*')
        .eq('is_prebuilt', true);

      if (error) throw error;
      setCompanions(data || []);
    } catch (error) {
      console.error('Error loading companions:', error);
      toast.error('Failed to load companions');
    } finally {
      setCompanionsLoading(false);
    }
  };

  const loadRelationshipPrompts = async () => {
    setPromptsLoading(true);
    try {
      const { data, error } = await supabase
        .from('relationship_prompts')
        .select('*')
        .order('relationship_type');

      if (error) throw error;
      
      const promptsMap: Record<string, string> = {};
      data?.forEach(prompt => {
        promptsMap[prompt.relationship_type] = prompt.prompt_text;
      });
      setRelationshipPrompts(promptsMap);
    } catch (error) {
      console.error('Error loading relationship prompts:', error);
      toast.error('Failed to load relationship prompts');
    } finally {
      setPromptsLoading(false);
    }
  };

  // Client management functions
  const loadClients = async () => {
    setClientsLoading(true);
    try {
      // Load profiles first
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      if (!profiles || profiles.length === 0) {
        setClients([]);
        return;
      }

      // Load subscriptions and subscribers data separately for each user
      const clientsWithStats = await Promise.all(
        profiles.map(async (profile) => {
          // Load subscription data
          const { data: subscriptions } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', profile.user_id)
            .limit(1);

          // Load subscriber data
          const { data: subscribers } = await supabase
            .from('subscribers')
            .select('*')
            .eq('user_id', profile.user_id)
            .limit(1);

          // Load usage stats
          const { data: usageData } = await supabase
            .from('conversation_usage')
            .select('minutes_used, session_start, session_end')
            .eq('user_id', profile.user_id)
            .order('session_start', { ascending: false });

          const totalMinutes = usageData?.reduce((sum, session) => sum + (session.minutes_used || 0), 0) || 0;
          const totalSessions = usageData?.length || 0;
          const lastSession = usageData?.[0]?.session_start;

          return {
            id: profile.id,
            email: profile.email,
            name: profile.name,
            avatar_url: profile.avatar_url,
            created_at: profile.created_at,
            updated_at: profile.updated_at,
            user_id: profile.user_id,
            subscription: subscriptions?.[0] ? {
              id: subscriptions[0].id,
              status: subscriptions[0].status,
              plan_type: subscriptions[0].plan_type,
              current_period_start: subscriptions[0].current_period_start,
              current_period_end: subscriptions[0].current_period_end,
              stripe_customer_id: subscriptions[0].stripe_customer_id,
              spicy_unlocked: subscriptions[0].spicy_unlocked
            } : undefined,
            subscriber: subscribers?.[0] ? {
              id: subscribers[0].id,
              subscribed: subscribers[0].subscribed,
              subscription_tier: subscribers[0].subscription_tier,
              trial_start: subscribers[0].trial_start,
              trial_minutes_used: subscribers[0].trial_minutes_used,
              trial_minutes_limit: subscribers[0].trial_minutes_limit,
              stripe_customer_id: subscribers[0].stripe_customer_id
            } : undefined,
            usage_stats: {
              total_sessions: totalSessions,
              total_minutes: totalMinutes,
              last_session: lastSession
            }
          } as ClientData;
        })
      );

      setClients(clientsWithStats);
    } catch (error) {
      console.error('Error loading clients:', error);
      toast.error('Failed to load clients');
    } finally {
      setClientsLoading(false);
    }
  };

  const toggleClientEdit = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    if (!client) return;

    if (editingClients.includes(clientId)) {
      // Cancel editing
      setEditingClients(prev => prev.filter(id => id !== clientId));
      setClientEditFormData(prev => {
        const newData = { ...prev };
        delete newData[clientId];
        return newData;
      });
    } else {
      // Start editing
      setEditingClients(prev => [...prev, clientId]);
      setClientEditFormData(prev => ({
        ...prev,
        [clientId]: {
          name: client.name,
          email: client.email,
          subscriber: client.subscriber ? {
            ...client.subscriber,
            trial_minutes_limit: client.subscriber.trial_minutes_limit,
            subscribed: client.subscriber.subscribed
          } : undefined
        }
      }));
    }
  };

  const saveClient = async (clientId: string) => {
    const formData = clientEditFormData[clientId];
    if (!formData) return;

    setSavingClients(prev => [...prev, clientId]);
    try {
      // Update profile
      if (formData.name !== undefined || formData.email !== undefined) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            name: formData.name,
            email: formData.email,
            updated_at: new Date().toISOString()
          })
          .eq('id', clientId);

        if (profileError) throw profileError;
      }

      // Update subscriber if data exists
      if (formData.subscriber) {
        const client = clients.find(c => c.id === clientId);
        if (client?.subscriber) {
          const { error: subscriberError } = await supabase
            .from('subscribers')
            .update({
              trial_minutes_limit: formData.subscriber.trial_minutes_limit,
              subscribed: formData.subscriber.subscribed,
              subscription_tier: formData.subscriber.subscription_tier,
              updated_at: new Date().toISOString()
            })
            .eq('id', client.subscriber.id);

          if (subscriberError) throw subscriberError;
        }
      }

      // Update local state
      setClients(prev =>
        prev.map(c =>
          c.id === clientId
            ? { 
                ...c, 
                name: formData.name || c.name,
                email: formData.email || c.email,
                subscriber: formData.subscriber ? { ...c.subscriber!, ...formData.subscriber } : c.subscriber
              }
            : c
        )
      );

      // Exit edit mode
      setEditingClients(prev => prev.filter(id => id !== clientId));
      setClientEditFormData(prev => {
        const newData = { ...prev };
        delete newData[clientId];
        return newData;
      });

      toast.success('Client updated successfully');
    } catch (error) {
      console.error('Error saving client:', error);
      toast.error('Failed to save client');
    } finally {
      setSavingClients(prev => prev.filter(id => id !== clientId));
    }
  };

  const updateClientFormData = (clientId: string, field: string, value: any) => {
    setClientEditFormData(prev => ({
      ...prev,
      [clientId]: {
        ...prev[clientId],
        [field]: field === 'subscriber' 
          ? {
              ...prev[clientId]?.subscriber,
              ...value
            }
          : value
      }
    }));
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadgeColor = (status?: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'canceled': return 'bg-red-100 text-red-800';
      case 'past_due': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const saveRelationshipPrompts = async () => {
    setSavingPrompts(true);
    try {
      const relationshipTypes = ['casual_friend', 'romantic_partner', 'spiritual_guide', 'intimate_companion'];
      
      for (const type of relationshipTypes) {
        const promptText = relationshipPrompts[type];
        if (!promptText) continue;

        const { error } = await supabase
          .from('relationship_prompts')
          .upsert({
            relationship_type: type,
            prompt_text: promptText
          }, {
            onConflict: 'relationship_type'
          });

        if (error) throw error;
      }

      toast.success('Relationship prompts saved successfully');
    } catch (error) {
      console.error('Error saving relationship prompts:', error);
      toast.error('Failed to save relationship prompts');
    } finally {
      setSavingPrompts(false);
    }
  };

  const updateRelationshipPrompt = (type: string, text: string) => {
    setRelationshipPrompts(prev => ({
      ...prev,
      [type]: text
    }));
  };

  const toggleEdit = (companionId: string) => {
    const companion = companions.find(c => c.id === companionId);
    if (!companion) return;

    if (editingCompanions.includes(companionId)) {
      // Cancel editing
      setEditingCompanions(prev => prev.filter(id => id !== companionId));
      setEditFormData(prev => {
        const newData = { ...prev };
        delete newData[companionId];
        return newData;
      });
    } else {
      // Start editing
      setEditingCompanions(prev => [...prev, companionId]);
      setEditFormData(prev => ({
        ...prev,
        [companionId]: {
          name: companion.name,
          age: companion.age,
          bio: companion.bio,
          likes: companion.likes || [],
          dislikes: companion.dislikes || []
        }
      }));
    }
  };

  const saveCompanion = async (companionId: string) => {
    const formData = editFormData[companionId];
    if (!formData) return;

    setSavingCompanions(prev => [...prev, companionId]);
    try {
      const { error } = await supabase
        .from('companions')
        .update({
          name: formData.name,
          age: formData.age,
          bio: formData.bio,
          likes: formData.likes,
          dislikes: formData.dislikes
        })
        .eq('id', companionId);

      if (error) throw error;

      // Update local state
      setCompanions(prev =>
        prev.map(c =>
          c.id === companionId
            ? { ...c, ...formData }
            : c
        )
      );

      // Exit edit mode
      setEditingCompanions(prev => prev.filter(id => id !== companionId));
      setEditFormData(prev => {
        const newData = { ...prev };
        delete newData[companionId];
        return newData;
      });

      toast.success('Companion updated successfully');
    } catch (error) {
      console.error('Error saving companion:', error);
      toast.error('Failed to save companion');
    } finally {
      setSavingCompanions(prev => prev.filter(id => id !== companionId));
    }
  };

  const updateFormData = (companionId: string, field: keyof Companion, value: any) => {
    setEditFormData(prev => ({
      ...prev,
      [companionId]: {
        ...prev[companionId],
        [field]: value
      }
    }));
  };

  // Check if companion has a placeholder image (Unsplash default)
  const hasPlaceholderImage = (companion: Companion) => {
    return companion.image_url.includes('unsplash.com') || 
           companion.image_url.includes('placeholder') ||
           !companion.image_url;
  };

  const generateNewImagesOnly = async () => {
    const companionsWithoutImages = companions.filter(hasPlaceholderImage);
    
    if (companionsWithoutImages.length === 0) {
      toast.info('All companions already have AI-generated images');
      return;
    }

    await generateImagesForCompanions(companionsWithoutImages);
  };

  const generateSelectedImages = async () => {
    if (selectedCompanions.length === 0) {
      toast.error('Please select companions to generate images for');
      return;
    }

    const companionsToGenerate = companions.filter(c => selectedCompanions.includes(c.id));
    await generateImagesForCompanions(companionsToGenerate);
  };

  const generateImagesForCompanions = async (companionsToGenerate: Companion[]) => {
    setGeneratingImages(true);
    let successCount = 0;
    
    for (const companion of companionsToGenerate) {
      try {
        toast.info(`Generating image for ${companion.name}...`);
        
        const imageUrl = await generateCompanionImage({
          name: companion.name,
          age: companion.age,
          gender: companion.gender,
          bio: companion.bio,
          personality: companion.personality,
          hobbies: companion.hobbies
        });

        // Update the companion with the new image URL
        const { error } = await supabase
          .from('companions')
          .update({ image_url: imageUrl })
          .eq('id', companion.id);

        if (error) throw error;

        // Update local state
        setCompanions(prev => 
          prev.map(c => 
            c.id === companion.id 
              ? { ...c, image_url: imageUrl }
              : c
          )
        );

        successCount++;
        toast.success(`Generated image for ${companion.name}`);
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        console.error(`Error generating image for ${companion.name}:`, error);
        toast.error(`Failed to generate image for ${companion.name}`);
      }
    }

    setGeneratingImages(false);
    setSelectedCompanions([]); // Clear selections after generation
    toast.success(`Generated ${successCount} out of ${companionsToGenerate.length} images`);
  };

  const toggleCompanionSelection = (companionId: string) => {
    setSelectedCompanions(prev => 
      prev.includes(companionId) 
        ? prev.filter(id => id !== companionId)
        : [...prev, companionId]
    );
  };

  const selectAllCompanions = () => {
    if (selectedCompanions.length === companions.length) {
      setSelectedCompanions([]);
    } else {
      setSelectedCompanions(companions.map(c => c.id));
    }
  };

  const handleImageUpload = async (companionId: string, file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (!user) {
      toast.error('You must be logged in to upload images');
      return;
    }

    setUploadingImages(prev => [...prev, companionId]);
    
    try {
      const companion = companions.find(c => c.id === companionId);
      if (!companion) {
        throw new Error('Companion not found');
      }

      // Create a unique filename
      const fileExtension = file.name.split('.').pop();
      const fileName = `${companionId}-${Date.now()}.${fileExtension}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('companion-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('companion-images')
        .getPublicUrl(fileName);

      // Update the companion with the new image URL
      const { error: updateError } = await supabase
        .from('companions')
        .update({ image_url: publicUrl })
        .eq('id', companionId);

      if (updateError) throw updateError;

      // Update local state
      setCompanions(prev => 
        prev.map(c => 
          c.id === companionId 
            ? { ...c, image_url: publicUrl }
            : c
        )
      );

      toast.success(`Image uploaded for ${companion.name}`);
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
    } finally {
      setUploadingImages(prev => prev.filter(id => id !== companionId));
    }
  };

  const triggerFileUpload = (companionId: string) => {
    if (fileInputRef.current) {
      fileInputRef.current.setAttribute('data-companion-id', companionId);
      fileInputRef.current.click();
    }
  };

  const handleRegenerateBrokenImages = async () => {
    if (!confirm('This will regenerate all broken companion images (temporary imgen.x.ai URLs) and may take several minutes. Continue?')) {
      return;
    }

    setRegeneratingImages(true);
    
    try {
      toast.info('Starting image regeneration... This may take a few minutes.');
      
      const { data, error } = await supabase.functions.invoke('regenerate-companion-images');
      
      if (error) throw error;
      
      toast.success(`Image regeneration completed! Updated ${data.updated} companions, ${data.failed} failed.`);
      
      // Refresh the companions list to show new images
      await loadCompanions();
      
    } catch (error) {
      console.error('Error regenerating images:', error);
      toast.error('Failed to regenerate companion images');
    } finally {
      setRegeneratingImages(false);
    }
  };

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const companionId = event.target.getAttribute('data-companion-id');
    
    if (file && companionId) {
      handleImageUpload(companionId, file);
    }
    
    // Reset the input
    event.target.value = '';
  };
  
  useEffect(() => {
    loadCompanions();
    loadRelationshipPrompts();
    loadClients();
  }, []);
  
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Settings className="w-6 h-6" />
            <h1 className="text-2xl font-bold">Admin Panel</h1>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate('/')}
            className="flex items-center gap-2"
          >
            <Home className="w-4 h-4" />
            Back to Main Site
          </Button>
        </div>
        <p className="text-muted-foreground">
          Manage companion images and generate AI images for the homepage
        </p>
      </div>

      <Tabs defaultValue="bulk-operations" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="image-manager">Image Manager</TabsTrigger>
          <TabsTrigger value="bulk-operations">Manage Companions</TabsTrigger>
          <TabsTrigger value="clients">Client Management</TabsTrigger>
          <TabsTrigger value="relationship-prompts">Relationship Prompts</TabsTrigger>
        </TabsList>
        
        <TabsContent value="image-manager" className="space-y-4">
          <CompanionImageManager />
        </TabsContent>
        
        <TabsContent value="clients" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Users className="w-6 h-6" />
                <div>
                  <CardTitle>Client Management</CardTitle>
                  <CardDescription>
                    View and manage all registered clients, their subscriptions, and usage statistics
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2 flex-wrap">
                <Button 
                  onClick={loadClients} 
                  disabled={clientsLoading}
                  variant="outline"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${clientsLoading ? 'animate-spin' : ''}`} />
                  Load Clients ({clients.length})
                </Button>
              </div>

              {clients.length > 0 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {clients.map((client) => {
                      const isEditing = editingClients.includes(client.id);
                      const isSaving = savingClients.includes(client.id);
                      const formData = clientEditFormData[client.id] || {};
                      
                      return (
                        <Card key={client.id} className="border">
                          <CardContent className="p-4">
                            <div className="space-y-3">
                              {/* Header */}
                              <div className="flex items-start justify-between">
                                <div className="flex items-center gap-2">
                                  <Mail className="w-4 h-4 text-muted-foreground" />
                                  <div className="flex-1 min-w-0">
                                    {isEditing ? (
                                      <Input
                                        value={formData.email || client.email}
                                        onChange={(e) => updateClientFormData(client.id, 'email', e.target.value)}
                                        className="h-7 text-sm"
                                        placeholder="Email"
                                      />
                                    ) : (
                                      <p className="text-sm font-medium truncate">{client.email}</p>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="flex gap-1">
                                  {isEditing ? (
                                    <>
                                      <Button
                                        size="sm"
                                        onClick={() => saveClient(client.id)}
                                        disabled={isSaving}
                                        className="h-7 px-2"
                                      >
                                        {isSaving ? (
                                          <RefreshCw className="w-3 h-3 animate-spin" />
                                        ) : (
                                          <Save className="w-3 h-3" />
                                        )}
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => toggleClientEdit(client.id)}
                                        disabled={isSaving}
                                        className="h-7 px-2"
                                      >
                                        <X className="w-3 h-3" />
                                      </Button>
                                    </>
                                  ) : (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => toggleClientEdit(client.id)}
                                      className="h-7 px-2"
                                    >
                                      <Edit3 className="w-3 h-3" />
                                    </Button>
                                  )}
                                </div>
                              </div>

                              {/* Name */}
                              <div>
                                <label className="text-xs text-muted-foreground">Name</label>
                                {isEditing ? (
                                  <Input
                                    value={formData.name || client.name || ''}
                                    onChange={(e) => updateClientFormData(client.id, 'name', e.target.value)}
                                    className="h-7 text-sm mt-1"
                                    placeholder="Full name"
                                  />
                                ) : (
                                  <p className="text-sm">{client.name || 'No name set'}</p>
                                )}
                              </div>

                              {/* Subscription Status */}
                              <div>
                                <label className="text-xs text-muted-foreground">Subscription</label>
                                <div className="flex items-center gap-2 mt-1">
                                  {client.subscription ? (
                                    <>
                                      <span className={`text-xs px-2 py-1 rounded ${getStatusBadgeColor(client.subscription.status)}`}>
                                        {client.subscription.status}
                                      </span>
                                      <span className="text-xs text-muted-foreground">
                                        {client.subscription.plan_type}
                                      </span>
                                      {client.subscription.spicy_unlocked && (
                                        <Crown className="w-3 h-3 text-yellow-500" />
                                      )}
                                    </>
                                  ) : client.subscriber?.subscribed ? (
                                    <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-800">
                                      {client.subscriber.subscription_tier || 'Active'}
                                    </span>
                                  ) : (
                                    <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-800">
                                      Trial
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Trial Info */}
                              {client.subscriber && (
                                <div>
                                  <label className="text-xs text-muted-foreground">Trial Usage</label>
                                  <div className="mt-1">
                                    {isEditing ? (
                                      <div className="space-y-2">
                                        <Input
                                          type="number"
                                          value={formData.subscriber?.trial_minutes_limit || client.subscriber.trial_minutes_limit || 500}
                                          onChange={(e) => updateClientFormData(client.id, 'subscriber', {
                                            ...formData.subscriber,
                                            trial_minutes_limit: parseInt(e.target.value)
                                          })}
                                          className="h-7 text-sm"
                                          placeholder="Trial limit"
                                        />
                                        <div className="flex items-center gap-2">
                                          <input
                                            type="checkbox"
                                            checked={formData.subscriber?.subscribed ?? client.subscriber.subscribed}
                                            onChange={(e) => updateClientFormData(client.id, 'subscriber', {
                                              ...formData.subscriber,
                                              subscribed: e.target.checked
                                            })}
                                            className="w-3 h-3"
                                          />
                                          <label className="text-xs">Subscribed</label>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="text-xs space-y-1">
                                        <p>{client.subscriber.trial_minutes_used || 0} / {client.subscriber.trial_minutes_limit || 500} minutes</p>
                                        <div className="w-full bg-gray-200 rounded-full h-1">
                                          <div 
                                            className="bg-primary h-1 rounded-full" 
                                            style={{
                                              width: `${Math.min(100, ((client.subscriber.trial_minutes_used || 0) / (client.subscriber.trial_minutes_limit || 500)) * 100)}%`
                                            }}
                                          ></div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Usage Stats */}
                              {client.usage_stats && (
                                <div>
                                  <label className="text-xs text-muted-foreground">Usage Statistics</label>
                                  <div className="text-xs space-y-1 mt-1">
                                    <p>{client.usage_stats.total_sessions} sessions</p>
                                    <p>{client.usage_stats.total_minutes} total minutes</p>
                                    {client.usage_stats.last_session && (
                                      <p className="text-muted-foreground">
                                        Last: {formatDate(client.usage_stats.last_session)}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Dates */}
                              <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  <span>Joined: {formatDate(client.created_at)}</span>
                                </div>
                                {client.subscription?.current_period_end && (
                                  <div className="flex items-center gap-1">
                                    <CreditCard className="w-3 h-3" />
                                    <span>Expires: {formatDate(client.subscription.current_period_end)}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}

              {clientsLoading && (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-sm text-muted-foreground">Loading clients...</p>
                </div>
              )}

              {!clientsLoading && clients.length === 0 && (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No clients found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="relationship-prompts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Relationship Prompts</CardTitle>
              <CardDescription>
                Configure conversation prompts for different relationship types. These prompts determine how companions behave based on the user's chosen relationship style.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2 mb-4">
                <Button 
                  onClick={loadRelationshipPrompts} 
                  disabled={promptsLoading}
                  variant="outline"
                  className="mb-4"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${promptsLoading ? 'animate-spin' : ''}`} />
                  Load Current Prompts
                </Button>
                
                <Button 
                  onClick={saveRelationshipPrompts} 
                  disabled={savingPrompts}
                  className="ml-2"
                >
                  <Save className={`w-4 h-4 mr-2${savingPrompts ? ' animate-pulse' : ''}`} />
                  {savingPrompts ? 'Saving...' : 'Save All Prompts'}
                </Button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-sm font-medium mb-2 block">Casual Friend</label>
                  <p className="text-xs text-muted-foreground mb-2">
                    For users seeking friendly, platonic companionship and casual conversation
                  </p>
                  <Textarea
                    value={relationshipPrompts.casual_friend || ''}
                    onChange={(e) => updateRelationshipPrompt('casual_friend', e.target.value)}
                    placeholder="Enter prompt for casual friend relationships..."
                    className="min-h-[120px]"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Romantic Partner</label>
                  <p className="text-xs text-muted-foreground mb-2">
                    For users seeking romantic connection and emotional intimacy
                  </p>
                  <Textarea
                    value={relationshipPrompts.romantic_partner || ''}
                    onChange={(e) => updateRelationshipPrompt('romantic_partner', e.target.value)}
                    placeholder="Enter prompt for romantic partner relationships..."
                    className="min-h-[120px]"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Spiritual Guide</label>
                  <p className="text-xs text-muted-foreground mb-2">
                    For users seeking wisdom, guidance, and spiritual growth
                  </p>
                  <Textarea
                    value={relationshipPrompts.spiritual_guide || ''}
                    onChange={(e) => updateRelationshipPrompt('spiritual_guide', e.target.value)}
                    placeholder="Enter prompt for spiritual guide relationships..."
                    className="min-h-[120px]"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Intimate Companion</label>
                  <p className="text-xs text-muted-foreground mb-2">
                    For users seeking deep emotional and physical connection
                  </p>
                  <Textarea
                    value={relationshipPrompts.intimate_companion || ''}
                    onChange={(e) => updateRelationshipPrompt('intimate_companion', e.target.value)}
                    placeholder="Enter prompt for intimate companion relationships..."
                    className="min-h-[120px]"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="bulk-operations" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <ImageIcon className="w-6 h-6" />
                <div>
                  <CardTitle>Bulk Image Operations</CardTitle>
                  <CardDescription>
                    Generate AI images for multiple prebuilt companions at once
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                 <div className="flex gap-2 flex-wrap">
                   <Button 
                     onClick={loadCompanions} 
                     disabled={companionsLoading}
                     variant="outline"
                   >
                     <RefreshCw className={`w-4 h-4 mr-2 ${companionsLoading ? 'animate-spin' : ''}`} />
                     Load Companions ({companions.length})
                   </Button>
                   
                   <Button 
                     onClick={generateNewImagesOnly}
                     disabled={generatingImages || companions.length === 0}
                     variant="secondary"
                   >
                     <Sparkles className={`w-4 h-4 mr-2 ${generatingImages ? 'animate-pulse' : ''}`} />
                     Generate New Images Only ({companions.filter(hasPlaceholderImage).length})
                   </Button>
                   
                   <Button 
                     onClick={handleRegenerateBrokenImages}
                     disabled={generatingImages || regeneratingImages || companions.length === 0}
                     variant="outline"
                     className="border-orange-200 text-orange-700 hover:bg-orange-50"
                   >
                     {regeneratingImages ? (
                       <>
                         <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                         Regenerating...
                       </>
                     ) : (
                       <>
                         <RefreshCw className="w-4 h-4 mr-2" />
                         Fix Broken Images
                       </>
                     )}
                   </Button>
                 </div>

                {companions.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    <Button 
                      onClick={selectAllCompanions}
                      variant="outline"
                      size="sm"
                    >
                      {selectedCompanions.length === companions.length ? 'Deselect All' : 'Select All'}
                    </Button>
                    
                    <Button 
                      onClick={generateSelectedImages}
                      disabled={generatingImages || selectedCompanions.length === 0}
                      className="bg-primary hover:bg-primary/90"
                      size="sm"
                    >
                      <ImageIcon className={`w-4 h-4 mr-2 ${generatingImages ? 'animate-pulse' : ''}`} />
                      Generate Selected ({selectedCompanions.length})
                    </Button>
                  </div>
                )}
              </div>

              {companions.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                  {companions.map((companion) => {
                    const isEditing = editingCompanions.includes(companion.id);
                    const isSaving = savingCompanions.includes(companion.id);
                    const formData = editFormData[companion.id] || {};
                    
                    return (
                      <Card key={companion.id} className={`border transition-colors ${selectedCompanions.includes(companion.id) ? 'ring-2 ring-primary bg-primary/5' : ''}`}>
                        <CardContent className="p-6">
                          <div className="flex items-start gap-4 mb-4">
                            <Checkbox
                              checked={selectedCompanions.includes(companion.id)}
                              onCheckedChange={() => toggleCompanionSelection(companion.id)}
                              className="mt-1"
                            />
                            
                            <div className="flex-1 space-y-3">
                              {isEditing ? (
                                <div className="space-y-3">
                                  <div>
                                    <label className="text-sm font-medium mb-1 block">Name</label>
                                    <Input
                                      value={formData.name || ''}
                                      onChange={(e) => updateFormData(companion.id, 'name', e.target.value)}
                                      className="h-8"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium mb-1 block">Age</label>
                                    <Input
                                      type="number"
                                      value={formData.age || ''}
                                      onChange={(e) => updateFormData(companion.id, 'age', parseInt(e.target.value))}
                                      className="h-8"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium mb-1 block">Bio</label>
                                    <Textarea
                                      value={formData.bio || ''}
                                      onChange={(e) => updateFormData(companion.id, 'bio', e.target.value)}
                                      className="min-h-[60px]"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium mb-1 block">Likes (comma-separated)</label>
                                    <Input
                                      value={(formData.likes || []).join(', ')}
                                      onChange={(e) => updateFormData(companion.id, 'likes', e.target.value.split(',').map(s => s.trim()).filter(s => s))}
                                      className="h-8"
                                      placeholder="Reading, hiking, music..."
                                    />
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium mb-1 block">Dislikes (comma-separated)</label>
                                    <Input
                                      value={(formData.dislikes || []).join(', ')}
                                      onChange={(e) => updateFormData(companion.id, 'dislikes', e.target.value.split(',').map(s => s.trim()).filter(s => s))}
                                      className="h-8"
                                      placeholder="Loud noises, crowds..."
                                    />
                                  </div>
                                </div>
                              ) : (
                                <div>
                                  <h3 className="font-semibold text-lg">{companion.name}</h3>
                                  <p className="text-sm text-muted-foreground mb-2">
                                    {companion.age} • {companion.gender}
                                  </p>
                                  <p className="text-sm mb-2">{companion.bio}</p>
                                  {companion.likes && companion.likes.length > 0 && (
                                    <div className="mb-1">
                                      <span className="text-xs font-medium text-green-600">Likes: </span>
                                      <span className="text-xs">{companion.likes.join(', ')}</span>
                                    </div>
                                  )}
                                  {companion.dislikes && companion.dislikes.length > 0 && (
                                    <div>
                                      <span className="text-xs font-medium text-red-600">Dislikes: </span>
                                      <span className="text-xs">{companion.dislikes.join(', ')}</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            <div className="flex flex-col gap-2">
                              {hasPlaceholderImage(companion) && (
                                <span className="text-xs bg-orange-100 text-orange-600 px-2 py-1 rounded">
                                  Needs Image
                                </span>
                              )}
                              
                              <div className="flex gap-1">
                                {isEditing ? (
                                  <>
                                    <Button
                                      size="sm"
                                      onClick={() => saveCompanion(companion.id)}
                                      disabled={isSaving}
                                      className="h-8 px-2"
                                    >
                                      {isSaving ? (
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                      ) : (
                                        <Save className="w-4 h-4" />
                                      )}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => toggleEdit(companion.id)}
                                      disabled={isSaving}
                                      className="h-8 px-2"
                                    >
                                      <X className="w-4 h-4" />
                                    </Button>
                                  </>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => toggleEdit(companion.id)}
                                    className="h-8 px-2"
                                  >
                                    <Edit3 className="w-4 h-4" />
                                  </Button>
                                )}
                                
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => triggerFileUpload(companion.id)}
                                  disabled={uploadingImages.includes(companion.id) || isEditing}
                                  className="h-8 px-2"
                                >
                                  {uploadingImages.includes(companion.id) ? (
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Upload className="w-4 h-4" />
                                  )}
                                </Button>
                              </div>
                            </div>
                          </div>

                          <div className="aspect-square bg-muted rounded-lg overflow-hidden">
                            <img 
                              src={companion.image_url} 
                              alt={companion.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = `https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face`;
                              }}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}

              {generatingImages && (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-sm text-muted-foreground">Generating AI images... This may take a few minutes.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Hidden file input for image uploads */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileInputChange}
        style={{ display: 'none' }}
      />
    </div>
  );
};