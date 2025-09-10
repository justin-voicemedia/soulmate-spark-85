import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, MessageCircle, Shield, Star } from "lucide-react";
import { useState } from "react";

interface LandingPageProps {
  onStartQuestionnaire: () => void;
  onBrowseCompanions: () => void;
}

export const LandingPage = ({ onStartQuestionnaire, onBrowseCompanions }: LandingPageProps) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary">
      {/* Header */}
      <header className="px-6 py-4 border-b bg-card/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Heart className="w-8 h-8 text-primary" />
            <span className="text-2xl font-bold">LoveCalls.ai</span>
          </div>
          <Button variant="outline">Sign In</Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="px-6 py-20 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-6">
            Find Your Perfect AI Companion
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Connect with personalized AI companions through text, voice, and video. 
            Experience meaningful conversations tailored just for you.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={onStartQuestionnaire} className="text-lg px-8 py-6">
              Start Questionnaire
            </Button>
            <Button size="lg" variant="outline" onClick={onBrowseCompanions} className="text-lg px-8 py-6">
              Browse Prebuilt Companions
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-6 py-16 bg-card">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Why Choose LoveCalls.ai?</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="text-center shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <MessageCircle className="w-12 h-12 text-primary mx-auto mb-4" />
                <CardTitle>Personalized Conversations</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  Our AI learns your preferences and adapts to create meaningful, 
                  engaging conversations that feel natural and authentic.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <Heart className="w-12 h-12 text-accent mx-auto mb-4" />
                <CardTitle>Multiple Interaction Modes</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  Connect through text chat, voice calls, and interactive widgets. 
                  Choose how you want to communicate at any moment.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <Shield className="w-12 h-12 text-primary mx-auto mb-4" />
                <CardTitle>Safe & Private</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  Your conversations are encrypted and private. We prioritize 
                  your safety and security in every interaction.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="px-6 py-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">What Our Users Say</h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="shadow-lg">
              <CardContent className="pt-6">
                <div className="flex mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-muted-foreground mb-4">
                  "The AI companion feels so real and understanding. It's like having 
                  a friend who's always there to listen and support me."
                </p>
                <p className="font-semibold">- Sarah M.</p>
              </CardContent>
            </Card>

            <Card className="shadow-lg">
              <CardContent className="pt-6">
                <div className="flex mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-muted-foreground mb-4">
                  "I love how personalized the conversations are. The AI remembers 
                  our previous chats and builds on them naturally."
                </p>
                <p className="font-semibold">- Michael R.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="px-6 py-16 bg-secondary">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6">Simple Pricing</h2>
          <p className="text-xl text-muted-foreground mb-8">
            Start with our basic plan and unlock premium features as you explore.
          </p>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-2xl mx-auto">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="text-2xl">Basic Plan</CardTitle>
                <CardDescription className="text-3xl font-bold text-primary">$19/month</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-left space-y-2">
                  <li>• Unlimited text conversations</li>
                  <li>• Voice calls (limited)</li>
                  <li>• Basic companion profiles</li>
                  <li>• Mobile app access</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="shadow-lg border-primary">
              <CardHeader>
                <CardTitle className="text-2xl">Premium Plan</CardTitle>
                <CardDescription className="text-3xl font-bold text-primary">$39/month</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-left space-y-2">
                  <li>• Everything in Basic</li>
                  <li>• Unlimited voice calls</li>
                  <li>• Premium companion profiles</li>
                  <li>• Intimate mode unlock</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 border-t bg-card">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Heart className="w-6 h-6 text-primary" />
                <span className="text-xl font-bold">LoveCalls.ai</span>
              </div>
              <p className="text-muted-foreground">
                Connecting hearts through AI-powered conversations.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Legal</h3>
              <div className="space-y-2 text-muted-foreground">
                <p><a href="/privacy" className="hover:text-primary">Privacy Policy</a></p>
                <p><a href="/terms" className="hover:text-primary">Terms of Service</a></p>
                <p><a href="/contact" className="hover:text-primary">Contact Us</a></p>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Support</h3>
              <div className="space-y-2 text-muted-foreground">
                <p><a href="/help" className="hover:text-primary">Help Center</a></p>
                <p><a href="/faq" className="hover:text-primary">FAQ</a></p>
                <p>support@lovecalls.ai</p>
              </div>
            </div>
          </div>

          <div className="border-t mt-8 pt-8 text-center text-muted-foreground">
            <p>&copy; 2024 LoveCalls.ai. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};