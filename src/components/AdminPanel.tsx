import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useImageGeneration } from '@/hooks/useImageGeneration';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { RefreshCw, Image as ImageIcon, Sparkles, Upload, Settings, Home, Edit3, Save, X, Users, Mail, Calendar, CreditCard, Crown, UserPlus, Shield, DollarSign, Ticket, Gift, TrendingUp, FileText, Eye, AlertCircle, CheckCircle, Clock, Ban } from 'lucide-react';
import { CompanionImageManager } from './CompanionImageManager';
import { CostAnalyticsDashboard } from './CostAnalyticsDashboard';
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
    is_tester?: boolean;
    subscription_end?: string;
    pending_invitation?: boolean;
  };
  usage_stats?: {
    total_sessions: number;
    total_minutes: number;
    last_session?: string;
    voice_minutes?: number;
    text_minutes?: number;
    voice_sessions?: number;
    text_sessions?: number;
  };
  payments?: PaymentRecord[];
}

interface PaymentRecord {
  id: string;
  user_id: string;
  amount_cents: number;
  currency: string;
  status: string;
  payment_date: string;
  payment_method?: string;
  description?: string;
  stripe_payment_intent_id?: string;
  stripe_invoice_id?: string;
  metadata?: any;
}

interface SupportTicket {
  id: string;
  user_id: string;
  ticket_number: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  category?: string;
  assigned_to?: string;
  resolution?: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  customer_satisfaction_rating?: number;
  user_email?: string;
}

interface ReferralData {
  id: string;
  referrer_user_id: string;
  referral_code: string;
  referred_email?: string;
  referred_user_id?: string;
  status: string;
  conversion_date?: string;
  reward_amount_cents?: number;
  reward_currency?: string;
  reward_given_at?: string;
  created_at: string;
  referrer_email?: string;
}

interface BillingInfo {
  id: string;
  user_id: string;
  stripe_customer_id?: string;
  payment_method_type?: string;
  card_brand?: string;
  card_last_four?: string;
  card_exp_month?: number;
  card_exp_year?: number;
  billing_email?: string;
  company_name?: string;
  billing_address?: any;
  created_at: string;
  updated_at: string;
}

interface AccountCredit {
  id: string;
  user_id: string;
  amount_cents: number;
  used_amount_cents?: number;
  currency: string;
  credit_type: string;
  description?: string;
  status: string;
  expires_at?: string;
  created_at: string;
  created_by?: string;
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
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitingTester, setInvitingTester] = useState(false);
  
  // Payment management state
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [billingInfo, setBillingInfo] = useState<BillingInfo[]>([]);
  const [billingLoading, setBillingLoading] = useState(false);
  const [accountCredits, setAccountCredits] = useState<AccountCredit[]>([]);
  const [creditsLoading, setCreditsLoading] = useState(false);
  
  // Support management state
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  
  // Referral management state
  const [referrals, setReferrals] = useState<ReferralData[]>([]);
  const [referralsLoading, setReferralsLoading] = useState(false);
  
  // User profile modal state
  const [selectedUser, setSelectedUser] = useState<ClientData | null>(null);
  const [userProfileData, setUserProfileData] = useState<{
    payments: PaymentRecord[];
    tickets: SupportTicket[];
    referrals: ReferralData[];
    billingInfo: BillingInfo | null;
    credits: AccountCredit[];
  } | null>(null);
  const [loadingUserProfile, setLoadingUserProfile] = useState(false);
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
      const { data, error } = await supabase.functions.invoke('get-clients');
      if (error) throw error;

      const clients = (data as any)?.clients || [];
      
      // Load payment history for all clients
      const userIds = clients.map((c: any) => c.user_id).filter(Boolean);
      if (userIds.length > 0) {
        const { data: paymentData, error: paymentError } = await supabase
          .from('payment_history')
          .select('*')
          .in('user_id', userIds)
          .order('payment_date', { ascending: false });
        
        if (paymentError) {
          console.error('Error loading payment history:', paymentError);
        } else {
          // Group payments by user_id
          const paymentsByUser: Record<string, any[]> = {};
          (paymentData || []).forEach((payment) => {
            if (!paymentsByUser[payment.user_id]) {
              paymentsByUser[payment.user_id] = [];
            }
            paymentsByUser[payment.user_id].push(payment);
          });
          
          // Add payment data to clients
          clients.forEach((client: any) => {
            client.payments = paymentsByUser[client.user_id] || [];
          });
        }
      }
      
      setClients(clients);
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
            subscribed: client.subscriber.subscribed,
            is_tester: client.subscriber.is_tester || false
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
            is_tester: formData.subscriber.is_tester,
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

  const inviteTester = async () => {
    if (!inviteEmail.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    setInvitingTester(true);
    try {
      const { data, error } = await supabase.functions.invoke('invite-tester', {
        body: { email: inviteEmail.trim() },
      });

      if (error) throw error;

      toast.success(`Tester account created for ${inviteEmail}`);
      setInviteEmail('');
      await loadClients(); // Refresh the list
    } catch (error) {
      console.error('Error inviting tester:', error);
      toast.error('Failed to create tester account');
    } finally {
      setInvitingTester(false);
    }
  };

  const toggleTesterStatus = async (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    if (!client?.subscriber) {
      toast.error('No subscriber record found for this user');
      return;
    }

    const newTesterStatus = !client.subscriber.is_tester;
    
    try {
      const { error } = await supabase
        .from('subscribers')
        .update({
          is_tester: newTesterStatus,
          trial_minutes_limit: newTesterStatus ? 999999 : 500, // Unlimited for testers
          updated_at: new Date().toISOString()
        })
        .eq('id', client.subscriber.id);

      if (error) throw error;

      // Update local state
      setClients(prev =>
        prev.map(c =>
          c.id === clientId && c.subscriber
            ? { 
                ...c, 
                subscriber: { 
                  ...c.subscriber, 
                  is_tester: newTesterStatus,
                  trial_minutes_limit: newTesterStatus ? 999999 : 500
                }
              }
            : c
        )
      );

      toast.success(`${newTesterStatus ? 'Enabled' : 'Disabled'} tester access for ${client.email}`);
    } catch (error) {
      console.error('Error updating tester status:', error);
      toast.error('Failed to update tester status');
    }
  };

  // Payment management functions
  const loadPayments = async () => {
    setPaymentsLoading(true);
    try {
      const { data, error } = await supabase
        .from('payment_history')
        .select('*')
        .order('payment_date', { ascending: false })
        .limit(100);

      if (error) throw error;
      setPayments(data || []);
    } catch (error) {
      console.error('Error loading payments:', error);
      toast.error('Failed to load payment history');
    } finally {
      setPaymentsLoading(false);
    }
  };

  const loadBillingInfo = async () => {
    setBillingLoading(true);
    try {
      const { data, error } = await supabase
        .from('billing_info')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setBillingInfo(data || []);
    } catch (error) {
      console.error('Error loading billing info:', error);
      toast.error('Failed to load billing information');
    } finally {
      setBillingLoading(false);
    }
  };

  const loadAccountCredits = async () => {
    setCreditsLoading(true);
    try {
      const { data, error } = await supabase
        .from('account_credits')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setAccountCredits(data || []);
    } catch (error) {
      console.error('Error loading account credits:', error);
      toast.error('Failed to load account credits');
    } finally {
      setCreditsLoading(false);
    }
  };

  // Support management functions  
  const loadSupportTickets = async () => {
    setTicketsLoading(true);
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select(`
          *,
          profiles!inner(email)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      
      const ticketsWithEmail = (data || []).map(ticket => ({
        ...ticket,
        user_email: (ticket as any).profiles?.email
      }));
      
      setSupportTickets(ticketsWithEmail);
    } catch (error) {
      console.error('Error loading support tickets:', error);
      toast.error('Failed to load support tickets');
    } finally {
      setTicketsLoading(false);
    }
  };

  // Referral management functions
  const loadReferrals = async () => {
    setReferralsLoading(true);
    try {
      const { data, error } = await supabase
        .from('referrals')
        .select(`
          *,
          referrer:profiles!referrer_user_id(email)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      
      const referralsWithEmail = (data || []).map(referral => ({
        ...referral,
        referrer_email: (referral as any).referrer?.email
      }));
      
      setReferrals(referralsWithEmail);
    } catch (error) {
      console.error('Error loading referrals:', error);
      toast.error('Failed to load referrals');
    } finally {
      setReferralsLoading(false);
    }
  };

  // User profile functions
  const loadUserProfile = async (user: ClientData) => {
    setSelectedUser(user);
    setLoadingUserProfile(true);
    
    try {
      // Load all user-related data in parallel
      const [paymentsResult, ticketsResult, referralsResult, billingResult, creditsResult] = await Promise.all([
        supabase
          .from('payment_history')
          .select('*')
          .eq('user_id', user.user_id)
          .order('payment_date', { ascending: false }),
          
        supabase
          .from('support_tickets')
          .select('*')
          .eq('user_id', user.user_id)
          .order('created_at', { ascending: false }),
          
        supabase
          .from('referrals')
          .select('*')
          .or(`referrer_user_id.eq.${user.user_id},referred_user_id.eq.${user.user_id}`)
          .order('created_at', { ascending: false }),
          
        supabase
          .from('billing_info')
          .select('*')
          .eq('user_id', user.user_id)
          .maybeSingle(),
          
        supabase
          .from('account_credits')
          .select('*')
          .eq('user_id', user.user_id)
          .order('created_at', { ascending: false })
      ]);

      setUserProfileData({
        payments: paymentsResult.data || [],
        tickets: ticketsResult.data || [],
        referrals: referralsResult.data || [],
        billingInfo: billingResult.data,
        credits: creditsResult.data || []
      });
    } catch (error) {
      console.error('Error loading user profile:', error);
      toast.error('Failed to load user profile data');
    } finally {
      setLoadingUserProfile(false);
    }
  };

  const closeUserProfile = () => {
    setSelectedUser(null);
    setUserProfileData(null);
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
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
          <TabsTrigger value="image-manager">Images</TabsTrigger>
          <TabsTrigger value="bulk-operations">Companions</TabsTrigger>
          <TabsTrigger value="clients">Clients</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="support">Support</TabsTrigger>
          <TabsTrigger value="referrals">Referrals</TabsTrigger>
          <TabsTrigger value="relationship-prompts">Prompts</TabsTrigger>
          <TabsTrigger value="cost-analytics">Analytics</TabsTrigger>
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
              <div className="flex gap-2 flex-wrap mb-4">
                <Button 
                  onClick={loadClients} 
                  disabled={clientsLoading}
                  variant="outline"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${clientsLoading ? 'animate-spin' : ''}`} />
                  Load Clients ({clients.length})
                </Button>
                
                <div className="flex gap-2 items-center">
                  <Input
                    placeholder="Enter email to invite as tester"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-64"
                    onKeyPress={(e) => e.key === 'Enter' && inviteTester()}
                  />
                  <Button 
                    onClick={inviteTester}
                    disabled={invitingTester || !inviteEmail.trim()}
                    className="flex items-center gap-2"
                  >
                    {invitingTester ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <UserPlus className="w-4 h-4" />
                    )}
                    Invite Tester
                  </Button>
                </div>
              </div>

              {clients.length > 0 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {clients.map((client) => {
                      const isEditing = editingClients.includes(client.id);
                      const isSaving = savingClients.includes(client.id);
                      const formData = clientEditFormData[client.id] || {};
                      
                      return (
                        <Card key={client.id} className="border cursor-pointer hover:shadow-md transition-shadow" onClick={() => loadUserProfile(client)}>
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
                                         onClick={(e) => e.stopPropagation()}
                                       />
                                     ) : (
                                       <div>
                                         <p className="text-sm font-medium truncate">{client.email}</p>
                                         {client.subscriber?.pending_invitation && (
                                           <span className="text-xs px-2 py-1 rounded bg-orange-100 text-orange-800 flex items-center gap-1 w-fit mt-1">
                                             <Clock className="w-3 h-3" />
                                             Pending Invitation
                                           </span>
                                         )}
                                       </div>
                                     )}
                                   </div>
                                 </div>
                                
                                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
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
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                ) : (
                                  <p className="text-sm">{client.name || 'No name set'}</p>
                                )}
                              </div>

                              {/* Subscription Status */}
                              <div>
                                <label className="text-xs text-muted-foreground">Subscription</label>
                                 <div className="flex items-center gap-2 mt-1 flex-wrap">
                                   {client.subscriber?.is_tester && (
                                     <span className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-800 flex items-center gap-1">
                                       <Shield className="w-3 h-3" />
                                       Tester
                                     </span>
                                   )}
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

                                 {/* Stripe Customer Info */}
                                 {(client.subscription?.stripe_customer_id || client.subscriber?.stripe_customer_id) && (
                                   <div className="text-xs text-muted-foreground mt-1">
                                     Stripe: {client.subscription?.stripe_customer_id || client.subscriber?.stripe_customer_id}
                                   </div>
                                 )}

                                 {/* Subscription Dates */}
                                 {client.subscription?.current_period_end && (
                                   <div className="text-xs text-muted-foreground mt-1">
                                     Expires: {formatDate(client.subscription.current_period_end)}
                                   </div>
                                 )}
                                 {client.subscriber?.subscription_end && (
                                   <div className="text-xs text-muted-foreground mt-1">
                                     Subscriber until: {formatDate(client.subscriber.subscription_end)}
                                   </div>
                                 )}
                                
                                 {/* Tester Toggle - Don't show for pending invitations */}
                                 {client.subscriber && !client.subscriber.pending_invitation && (
                                   <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                                     <Button
                                       size="sm"
                                       variant={client.subscriber.is_tester ? "destructive" : "default"}
                                       onClick={() => toggleTesterStatus(client.id)}
                                       className="h-6 px-2 text-xs"
                                     >
                                       <Shield className="w-3 h-3 mr-1" />
                                       {client.subscriber.is_tester ? 'Remove Tester' : 'Make Tester'}
                                     </Button>
                                   </div>
                                 )}
                                 {/* Show info for pending invitations */}
                                 {client.subscriber?.pending_invitation && (
                                   <div className="mt-2">
                                     <p className="text-xs text-muted-foreground">
                                       Waiting for user to sign up with this email
                                     </p>
                                   </div>
                                 )}
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
                                         <div className="flex items-center gap-2">
                                           <input
                                             type="checkbox"
                                             checked={formData.subscriber?.is_tester ?? client.subscriber.is_tester ?? false}
                                             onChange={(e) => updateClientFormData(client.id, 'subscriber', {
                                               ...formData.subscriber,
                                               is_tester: e.target.checked
                                             })}
                                             className="w-3 h-3"
                                           />
                                           <label className="text-xs">Tester Account</label>
                                         </div>
                                      </div>
                                     ) : (
                                       <div className="text-xs space-y-1">
                                         <p>{client.subscriber.trial_minutes_used || 0} / {client.subscriber.trial_minutes_limit || 500} minutes</p>
                                         {client.subscriber.is_tester && (
                                           <p className="text-purple-600 font-medium">Unlimited (Tester)</p>
                                         )}
                                         <div className="w-full bg-gray-200 rounded-full h-1">
                                           <div 
                                             className="bg-primary h-1 rounded-full" 
                                             style={{
                                               width: client.subscriber.is_tester ? '100%' : `${Math.min(100, ((client.subscriber.trial_minutes_used || 0) / (client.subscriber.trial_minutes_limit || 500)) * 100)}%`
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
                                    {(client.usage_stats.voice_minutes !== undefined || client.usage_stats.text_minutes !== undefined) && (
                                      <p>
                                        Voice: {client.usage_stats.voice_minutes ?? 0} min • Chat: {client.usage_stats.text_minutes ?? 0} min
                                      </p>
                                    )}
                                    {(client.usage_stats.voice_sessions !== undefined || client.usage_stats.text_sessions !== undefined) && (
                                      <p className="text-muted-foreground">
                                        Voice sessions: {client.usage_stats.voice_sessions ?? 0} • Chat sessions: {client.usage_stats.text_sessions ?? 0}
                                      </p>
                                    )}
                                    {client.usage_stats.last_session && (
                                      <p className="text-muted-foreground">
                                        Last: {formatDate(client.usage_stats.last_session)}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Payment History */}
                              {client.payments && client.payments.length > 0 && (
                                <div>
                                  <label className="text-xs text-muted-foreground">Recent Payments</label>
                                  <div className="text-xs space-y-1 mt-1">
                                    {client.payments.slice(0, 3).map((payment: PaymentRecord) => (
                                      <div key={payment.id} className="flex justify-between items-center">
                                        <span>${(payment.amount_cents / 100).toFixed(2)}</span>
                                        <span className={`px-1 py-0.5 rounded text-xs ${
                                          payment.status === 'succeeded' ? 'bg-green-100 text-green-800' : 
                                          payment.status === 'failed' ? 'bg-red-100 text-red-800' :
                                          'bg-yellow-100 text-yellow-800'
                                        }`}>
                                          {payment.status}
                                        </span>
                                      </div>
                                    ))}
                                    {client.payments.length > 3 && (
                                      <p className="text-muted-foreground">+{client.payments.length - 3} more payments</p>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Show if no payments but has subscription */}
                              {(!client.payments || client.payments.length === 0) && 
                               (client.subscription?.stripe_customer_id || client.subscriber?.stripe_customer_id) && (
                                <div>
                                  <label className="text-xs text-muted-foreground">Payment Status</label>
                                  <div className="text-xs mt-1 text-yellow-600">
                                    Has Stripe account but no payment records in database
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
        
        <TabsContent value="cost-analytics" className="space-y-4">
          <CostAnalyticsDashboard />
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
        
        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <DollarSign className="w-6 h-6" />
                <div>
                  <CardTitle>Payment Management</CardTitle>
                  <CardDescription>
                    Complete payment tracking, billing info, and account credits management
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex gap-2 flex-wrap">
                <Button onClick={loadPayments} disabled={paymentsLoading} variant="outline">
                  <RefreshCw className={`w-4 h-4 mr-2 ${paymentsLoading ? 'animate-spin' : ''}`} />
                  Load Payments
                </Button>
                <Button onClick={loadBillingInfo} disabled={billingLoading} variant="outline">
                  <CreditCard className={`w-4 h-4 mr-2 ${billingLoading ? 'animate-spin' : ''}`} />
                  Load Billing Info
                </Button>
                <Button onClick={loadAccountCredits} disabled={creditsLoading} variant="outline">
                  <Gift className={`w-4 h-4 mr-2 ${creditsLoading ? 'animate-spin' : ''}`} />
                  Load Credits
                </Button>
              </div>

              {/* Payment History */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Payment History</h3>
                {payments.length > 0 ? (
                  <div className="border rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted">
                          <tr>
                            <th className="text-left p-3">Date</th>
                            <th className="text-left p-3">Customer</th>
                            <th className="text-left p-3">Amount</th>
                            <th className="text-left p-3">Status</th>
                            <th className="text-left p-3">Method</th>
                            <th className="text-left p-3">Description</th>
                          </tr>
                        </thead>
                        <tbody>
                          {payments.map((payment) => (
                            <tr key={payment.id} className="border-t">
                              <td className="p-3">{new Date(payment.payment_date).toLocaleDateString()}</td>
                              <td className="p-3">{payment.user_id}</td>
                              <td className="p-3">${(payment.amount_cents / 100).toFixed(2)}</td>
                              <td className="p-3">
                                <span className={`px-2 py-1 rounded text-xs ${
                                  payment.status === 'succeeded' ? 'bg-green-100 text-green-800' :
                                  payment.status === 'failed' ? 'bg-red-100 text-red-800' :
                                  'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {payment.status}
                                </span>
                              </td>
                              <td className="p-3">{payment.payment_method || 'N/A'}</td>
                              <td className="p-3">{payment.description || 'N/A'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 border rounded-lg">
                    <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No payment records found</p>
                  </div>
                )}
              </div>

              {/* Account Credits */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Account Credits</h3>
                {accountCredits.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {accountCredits.map((credit) => (
                      <Card key={credit.id} className="border">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">${(credit.amount_cents / 100).toFixed(2)}</span>
                            <span className={`px-2 py-1 rounded text-xs ${
                              credit.status === 'active' ? 'bg-green-100 text-green-800' :
                              credit.status === 'expired' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {credit.status}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mb-1">{credit.description}</p>
                          <p className="text-xs text-muted-foreground">
                            Used: ${((credit.used_amount_cents || 0) / 100).toFixed(2)} / ${(credit.amount_cents / 100).toFixed(2)}
                          </p>
                          {credit.expires_at && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Expires: {new Date(credit.expires_at).toLocaleDateString()}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 border rounded-lg">
                    <Gift className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No account credits found</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="support" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Ticket className="w-6 h-6" />
                <div>
                  <CardTitle>Support Ticket Management</CardTitle>
                  <CardDescription>
                    Manage customer support tickets with priorities and categories
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <Button onClick={loadSupportTickets} disabled={ticketsLoading} variant="outline">
                <RefreshCw className={`w-4 h-4 mr-2 ${ticketsLoading ? 'animate-spin' : ''}`} />
                Load Support Tickets ({supportTickets.length})
              </Button>

              {supportTickets.length > 0 ? (
                <div className="space-y-4">
                  {supportTickets.map((ticket) => (
                    <Card key={ticket.id} className="border">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-medium">#{ticket.ticket_number}</span>
                              <span className={`px-2 py-1 rounded text-xs ${
                                ticket.priority === 'high' ? 'bg-red-100 text-red-800' :
                                ticket.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                                {ticket.priority}
                              </span>
                              <span className={`px-2 py-1 rounded text-xs ${
                                ticket.status === 'open' ? 'bg-blue-100 text-blue-800' :
                                ticket.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                                ticket.status === 'resolved' ? 'bg-green-100 text-green-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {ticket.status}
                              </span>
                            </div>
                            <h4 className="font-medium mb-1">{ticket.subject}</h4>
                            <p className="text-sm text-muted-foreground mb-2">
                              {ticket.user_email || 'No email'} • {new Date(ticket.created_at).toLocaleDateString()}
                            </p>
                            <p className="text-sm line-clamp-2">{ticket.description}</p>
                          </div>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => setSelectedTicket(ticket)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                        {ticket.assigned_to && (
                          <p className="text-xs text-muted-foreground">
                            Assigned to: {ticket.assigned_to}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 border rounded-lg">
                  <Ticket className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No support tickets found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="referrals" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-6 h-6" />
                <div>
                  <CardTitle>Referral Program Management</CardTitle>
                  <CardDescription>
                    Track referral performance and viral growth metrics
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <Button onClick={loadReferrals} disabled={referralsLoading} variant="outline">
                <RefreshCw className={`w-4 h-4 mr-2 ${referralsLoading ? 'animate-spin' : ''}`} />
                Load Referrals ({referrals.length})
              </Button>

              {referrals.length > 0 ? (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <Card className="border">
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold">{referrals.length}</div>
                        <div className="text-sm text-muted-foreground">Total Referrals</div>
                      </CardContent>
                    </Card>
                    <Card className="border">
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold">
                          {referrals.filter(r => r.status === 'completed').length}
                        </div>
                        <div className="text-sm text-muted-foreground">Successful Conversions</div>
                      </CardContent>
                    </Card>
                    <Card className="border">
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold">
                          ${(referrals.reduce((sum, r) => sum + (r.reward_amount_cents || 0), 0) / 100).toFixed(2)}
                        </div>
                        <div className="text-sm text-muted-foreground">Total Rewards</div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="border rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted">
                          <tr>
                            <th className="text-left p-3">Referrer</th>
                            <th className="text-left p-3">Code</th>
                            <th className="text-left p-3">Referred Email</th>
                            <th className="text-left p-3">Status</th>
                            <th className="text-left p-3">Reward</th>
                            <th className="text-left p-3">Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {referrals.map((referral) => (
                            <tr key={referral.id} className="border-t">
                              <td className="p-3">{referral.referrer_email || 'N/A'}</td>
                              <td className="p-3 font-mono text-xs">{referral.referral_code}</td>
                              <td className="p-3">{referral.referred_email || 'N/A'}</td>
                              <td className="p-3">
                                <span className={`px-2 py-1 rounded text-xs ${
                                  referral.status === 'completed' ? 'bg-green-100 text-green-800' :
                                  referral.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {referral.status}
                                </span>
                              </td>
                              <td className="p-3">
                                {referral.reward_amount_cents ? 
                                  `$${(referral.reward_amount_cents / 100).toFixed(2)}` : 'N/A'
                                }
                              </td>
                              <td className="p-3">{new Date(referral.created_at).toLocaleDateString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 border rounded-lg">
                  <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No referrals found</p>
                </div>
              )}
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
      
      {/* User Profile Modal */}
      <Dialog open={!!selectedUser} onOpenChange={closeUserProfile}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              User Profile: {selectedUser?.email}
            </DialogTitle>
            <DialogDescription>
              Comprehensive view of all user data and activity
            </DialogDescription>
          </DialogHeader>
          
          {loadingUserProfile ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="w-8 h-8 animate-spin" />
            </div>
          ) : userProfileData && selectedUser ? (
            <div className="space-y-6">
              {/* User Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Account Overview</CardTitle>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Email</label>
                    <p className="text-sm">{selectedUser.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Name</label>
                    <p className="text-sm">{selectedUser.name || 'Not set'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Member Since</label>
                    <p className="text-sm">{formatDate(selectedUser.created_at)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
                    <p className="text-sm">{formatDate(selectedUser.updated_at)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Subscription Status</label>
                    <div className="flex items-center gap-2 mt-1">
                      {selectedUser.subscriber?.is_tester && (
                        <span className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-800">Tester</span>
                      )}
                      {selectedUser.subscription ? (
                        <span className={`text-xs px-2 py-1 rounded ${getStatusBadgeColor(selectedUser.subscription.status)}`}>
                          {selectedUser.subscription.status} - {selectedUser.subscription.plan_type}
                        </span>
                      ) : selectedUser.subscriber?.subscribed ? (
                        <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-800">
                          {selectedUser.subscriber.subscription_tier || 'Active'}
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-800">Trial</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Usage Stats</label>
                    <p className="text-sm">
                      {selectedUser.usage_stats?.total_sessions || 0} sessions, {selectedUser.usage_stats?.total_minutes || 0} minutes
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Voice: {selectedUser.usage_stats?.voice_minutes ?? 0} min • Chat: {selectedUser.usage_stats?.text_minutes ?? 0} min
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Payment History */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    Payment History ({userProfileData.payments.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {userProfileData.payments.length > 0 ? (
                    <div className="border rounded-lg overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-muted">
                            <tr>
                              <th className="text-left p-2">Date</th>
                              <th className="text-left p-2">Amount</th>
                              <th className="text-left p-2">Status</th>
                              <th className="text-left p-2">Method</th>
                              <th className="text-left p-2">Description</th>
                            </tr>
                          </thead>
                          <tbody>
                            {userProfileData.payments.map((payment) => (
                              <tr key={payment.id} className="border-t">
                                <td className="p-2">{new Date(payment.payment_date).toLocaleDateString()}</td>
                                <td className="p-2">${(payment.amount_cents / 100).toFixed(2)}</td>
                                <td className="p-2">
                                  <span className={`px-2 py-1 rounded text-xs ${
                                    payment.status === 'succeeded' ? 'bg-green-100 text-green-800' :
                                    payment.status === 'failed' ? 'bg-red-100 text-red-800' :
                                    'bg-yellow-100 text-yellow-800'
                                  }`}>
                                    {payment.status}
                                  </span>
                                </td>
                                <td className="p-2">{payment.payment_method || 'N/A'}</td>
                                <td className="p-2">{payment.description || 'N/A'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No payment history</p>
                  )}
                </CardContent>
              </Card>

              {/* Support Tickets */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Ticket className="w-5 h-5" />
                    Support Tickets ({userProfileData.tickets.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {userProfileData.tickets.length > 0 ? (
                    <div className="space-y-3">
                      {userProfileData.tickets.map((ticket) => (
                        <div key={ticket.id} className="border rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">#{ticket.ticket_number}</span>
                              <span className={`px-2 py-1 rounded text-xs ${
                                ticket.priority === 'high' ? 'bg-red-100 text-red-800' :
                                ticket.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                                {ticket.priority}
                              </span>
                              <span className={`px-2 py-1 rounded text-xs ${
                                ticket.status === 'open' ? 'bg-blue-100 text-blue-800' :
                                ticket.status === 'resolved' ? 'bg-green-100 text-green-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {ticket.status}
                              </span>
                            </div>
                            <span className="text-xs text-muted-foreground">{new Date(ticket.created_at).toLocaleDateString()}</span>
                          </div>
                          <h4 className="font-medium text-sm mb-1">{ticket.subject}</h4>
                          <p className="text-sm text-muted-foreground line-clamp-2">{ticket.description}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No support tickets</p>
                  )}
                </CardContent>
              </Card>

              {/* Account Credits */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Gift className="w-5 h-5" />
                    Account Credits ({userProfileData.credits.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {userProfileData.credits.length > 0 ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      {userProfileData.credits.map((credit) => (
                        <div key={credit.id} className="border rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">${(credit.amount_cents / 100).toFixed(2)}</span>
                            <span className={`px-2 py-1 rounded text-xs ${
                              credit.status === 'active' ? 'bg-green-100 text-green-800' :
                              credit.status === 'expired' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {credit.status}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mb-1">{credit.description}</p>
                          <p className="text-xs text-muted-foreground">
                            Used: ${((credit.used_amount_cents || 0) / 100).toFixed(2)} / ${(credit.amount_cents / 100).toFixed(2)}
                          </p>
                          {credit.expires_at && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Expires: {new Date(credit.expires_at).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No account credits</p>
                  )}
                </CardContent>
              </Card>

              {/* Referrals */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Referral Activity ({userProfileData.referrals.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {userProfileData.referrals.length > 0 ? (
                    <div className="space-y-3">
                      {userProfileData.referrals.map((referral) => (
                        <div key={referral.id} className="border rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-mono">{referral.referral_code}</span>
                              <span className={`px-2 py-1 rounded text-xs ${
                                referral.status === 'completed' ? 'bg-green-100 text-green-800' :
                                referral.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {referral.status}
                              </span>
                            </div>
                            <span className="text-xs text-muted-foreground">{new Date(referral.created_at).toLocaleDateString()}</span>
                          </div>
                          <p className="text-sm">
                            {referral.referrer_user_id === selectedUser.user_id ? 
                              `Referred: ${referral.referred_email || 'N/A'}` :
                              `Referred by: ${referral.referrer_email || 'N/A'}`
                            }
                          </p>
                          {referral.reward_amount_cents && (
                            <p className="text-sm text-muted-foreground">
                              Reward: ${(referral.reward_amount_cents / 100).toFixed(2)}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No referral activity</p>
                  )}
                </CardContent>
              </Card>

              {/* Billing Information */}
              {userProfileData.billingInfo && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Billing Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Payment Method</label>
                      <p className="text-sm">
                        {userProfileData.billingInfo.card_brand && userProfileData.billingInfo.card_last_four ?
                          `${userProfileData.billingInfo.card_brand} **** ${userProfileData.billingInfo.card_last_four}` :
                          'Not set'
                        }
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Billing Email</label>
                      <p className="text-sm">{userProfileData.billingInfo.billing_email || 'Not set'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Company</label>
                      <p className="text-sm">{userProfileData.billingInfo.company_name || 'Not set'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Stripe Customer</label>
                      <p className="text-sm font-mono text-xs">{userProfileData.billingInfo.stripe_customer_id || 'Not set'}</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
};