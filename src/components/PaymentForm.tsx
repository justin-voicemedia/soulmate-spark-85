import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, CreditCard, Heart, Shield, Zap } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface PaymentFormProps {
  onSuccess: () => void;
}

export const PaymentForm = ({ onSuccess }: PaymentFormProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'basic' | 'premium'>('basic');

  const plans = {
    basic: {
      name: "Basic Plan",
      price: "$19",
      period: "/month",
      features: [
        "Unlimited text conversations",
        "Voice calls (limited)",
        "Basic companion profiles",
        "Mobile app access",
        "Email support"
      ]
    },
    premium: {
      name: "Premium Plan", 
      price: "$39",
      period: "/month",
      popular: true,
      features: [
        "Everything in Basic",
        "Unlimited voice calls",
        "Premium companion profiles",
        "Intimate mode unlock",
        "Priority support",
        "Advanced customization"
      ]
    }
  };

  const handlePayment = async (planType: 'basic' | 'premium') => {
    if (!user) return;
    
    setLoading(true);
    
    // Simulate payment processing - replace with actual Stripe integration
    setTimeout(() => {
      setLoading(false);
      onSuccess();
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary py-8">
      {/* Header */}
      <header className="px-6 pb-8">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Heart className="w-8 h-8 text-primary" />
            <span className="text-2xl font-bold">LoveCalls.ai</span>
          </div>
        </div>
      </header>

      <div className="px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
            <p className="text-xl text-muted-foreground">
              Select a subscription plan to start connecting with your AI companion
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Basic Plan */}
            <Card 
              className={`cursor-pointer transition-all duration-300 hover:shadow-xl ${
                selectedPlan === 'basic' ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => setSelectedPlan('basic')}
            >
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">{plans.basic.name}</CardTitle>
                <div className="flex items-center justify-center">
                  <span className="text-4xl font-bold text-primary">{plans.basic.price}</span>
                  <span className="text-muted-foreground ml-1">{plans.basic.period}</span>
                </div>
                <CardDescription>Perfect for getting started</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {plans.basic.features.map((feature, index) => (
                    <li key={index} className="flex items-center">
                      <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Premium Plan */}
            <Card 
              className={`cursor-pointer transition-all duration-300 hover:shadow-xl relative ${
                selectedPlan === 'premium' ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => setSelectedPlan('premium')}
            >
              {plans.premium.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-primary to-accent text-white">
                  Most Popular
                </Badge>
              )}
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">{plans.premium.name}</CardTitle>
                <div className="flex items-center justify-center">
                  <span className="text-4xl font-bold text-primary">{plans.premium.price}</span>
                  <span className="text-muted-foreground ml-1">{plans.premium.period}</span>
                </div>
                <CardDescription>Full access to all features</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {plans.premium.features.map((feature, index) => (
                    <li key={index} className="flex items-center">
                      <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Payment Button */}
          <div className="text-center mt-8">
            <Button 
              size="lg" 
              onClick={() => handlePayment(selectedPlan)}
              disabled={loading}
              className="px-12 py-6 text-lg"
            >
              <CreditCard className="w-5 h-5 mr-2" />
              {loading ? "Processing..." : `Subscribe to ${plans[selectedPlan].name}`}
            </Button>
          </div>

          {/* Security Notice */}
          <div className="max-w-2xl mx-auto mt-8">
            <Card className="bg-muted/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6 text-green-500 mr-2" />
                  <span className="font-semibold">Secure Payment</span>
                </div>
                <div className="text-center text-sm text-muted-foreground">
                  <p>Your payment information is encrypted and secure.</p>
                  <p>Cancel anytime • No long-term contracts • 7-day free trial</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Features Highlight */}
          <div className="grid md:grid-cols-3 gap-6 mt-12">
            <Card className="text-center">
              <CardContent className="pt-6">
                <Heart className="w-12 h-12 text-primary mx-auto mb-4" />
                <h3 className="font-semibold mb-2">AI Companions</h3>
                <p className="text-sm text-muted-foreground">
                  Personalized AI companions that remember your preferences
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardContent className="pt-6">
                <Zap className="w-12 h-12 text-primary mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Instant Connection</h3>
                <p className="text-sm text-muted-foreground">
                  Text, voice, and video interactions available 24/7
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardContent className="pt-6">
                <Shield className="w-12 h-12 text-primary mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Privacy First</h3>
                <p className="text-sm text-muted-foreground">
                  Your conversations are private and encrypted
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};