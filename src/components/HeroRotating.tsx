import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';

interface HeroSlide {
  id: number;
  headline: string;
  videoSrc: string;
  posterSrc: string;
}

interface HeroRotatingProps {
  onStartQuestionnaire: () => void;
  onBrowseCompanions: () => void;
  onBuildCompanion: () => void;
  slideDurationMs?: number;
  transitionMs?: number;
}

const slides: HeroSlide[] = [
  {
    id: 0,
    headline: "Missing a loved one and want someone to connect with?",
    videoSrc: "/videos/hero-missing-loved-one.mp4",
    posterSrc: "/videos/hero-missing-loved-one.jpg"
  },
  {
    id: 1,
    headline: "Wish you had a friend to talk to?",
    videoSrc: "/videos/hero-friend-to-talk.mp4",
    posterSrc: "/videos/hero-friend-to-talk.jpg"
  },
  {
    id: 2,
    headline: "Feeling lonely tonight?",
    videoSrc: "/videos/hero-feeling-lonely.mp4",
    posterSrc: "/videos/hero-feeling-lonely.jpg"
  },
  {
    id: 3,
    headline: "Looking for love?",
    videoSrc: "/videos/hero-looking-for-love.mp4",
    posterSrc: "/videos/hero-looking-for-love.jpg"
  }
];

export const HeroRotating = ({ 
  onStartQuestionnaire, 
  onBrowseCompanions, 
  onBuildCompanion,
  slideDurationMs = 6000,
  transitionMs = 600 
}: HeroRotatingProps) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  const heroRef = useRef<HTMLElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  // Check for reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);
    
    const handleChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Intersection Observer for pause on scroll
  useEffect(() => {
    if (!heroRef.current || reducedMotion) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.3 }
    );

    observer.observe(heroRef.current);
    return () => observer.disconnect();
  }, [reducedMotion]);

  // Auto-rotation logic
  useEffect(() => {
    if (!isVisible || reducedMotion) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const startRotation = () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      
      intervalRef.current = setInterval(() => {
        setIsTransitioning(true);
        setTimeout(() => {
          setCurrentSlide((prev) => (prev + 1) % slides.length);
          setIsTransitioning(false);
        }, transitionMs / 2);
      }, slideDurationMs);
    };

    startRotation();
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isVisible, reducedMotion, slideDurationMs, transitionMs]);

  // Manual slide navigation
  const goToSlide = (index: number) => {
    if (index === currentSlide || isTransitioning) return;
    
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentSlide(index);
      setIsTransitioning(false);
    }, transitionMs / 2);

    // Reset interval
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (isVisible && !reducedMotion) {
      intervalRef.current = setInterval(() => {
        setIsTransitioning(true);
        setTimeout(() => {
          setCurrentSlide((prev) => (prev + 1) % slides.length);
          setIsTransitioning(false);
        }, transitionMs / 2);
      }, slideDurationMs);
    }
  };

  // Video management
  useEffect(() => {
    videoRefs.current.forEach((video, index) => {
      if (!video) return;
      
      if (index === currentSlide) {
        video.play().catch(console.warn);
      } else {
        video.pause();
      }
    });
  }, [currentSlide]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      videoRefs.current.forEach(video => {
        if (video) video.pause();
      });
    };
  }, []);

  if (reducedMotion) {
    return (
      <section ref={heroRef} className="relative h-[80vh] min-h-[540px] w-full overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${slides[0].posterSrc})` }}
        />
        <div className="absolute inset-0 bg-black/45 bg-gradient-to-b from-black/50 via-black/40 to-black/30" />
        
        <div className="relative z-10 h-full flex items-center justify-center px-6">
          <div className="max-w-4xl mx-auto text-center text-white">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              {slides[0].headline}
            </h1>
            
            <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto leading-relaxed opacity-90">
              Connect with personalized AI companions through text, voice, and video. Experience meaningful conversations tailored just for you.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button 
                id="cta-start-questionnaire"
                size="lg" 
                onClick={onStartQuestionnaire} 
                className="text-lg px-8 py-6 bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                Start Questionnaire
              </Button>
              <Button 
                id="cta-browse-companions"
                size="lg" 
                variant="secondary" 
                onClick={onBrowseCompanions} 
                className="text-lg px-8 py-6"
              >
                Browse & Choose Companions
              </Button>
              <Button 
                id="cta-build-your-own"
                size="lg" 
                variant="outline" 
                onClick={onBuildCompanion} 
                className="text-lg px-8 py-6 border-white/30 text-white hover:bg-white/10 hover:text-white"
              >
                Build Your Own
              </Button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section ref={heroRef} className="relative h-[80vh] min-h-[540px] w-full overflow-hidden">
      {/* Video Background Layer */}
      <div className="absolute inset-0">
        {slides.map((slide, index) => (
          <video
            key={slide.id}
            ref={(el) => { videoRefs.current[index] = el; }}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-${transitionMs} ${
              index === currentSlide ? 'opacity-100' : 'opacity-0'
            }`}
            src={slide.videoSrc}
            poster={slide.posterSrc}
            autoPlay
            muted
            loop
            playsInline
            preload={index === 0 ? 'auto' : 'metadata'}
          />
        ))}
      </div>
      
      {/* Dark Overlay for Text Readability */}
      <div className="absolute inset-0 bg-black/45 bg-gradient-to-b from-black/50 via-black/40 to-black/30" />
      
      {/* Content Layer */}
      <div className="relative z-10 h-full flex items-center justify-center px-6">
        <div className="max-w-4xl mx-auto text-center text-white">
          {/* Rotating Headline */}
          <h1 
            className={`text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight transition-all duration-${transitionMs} ${
              isTransitioning ? 'opacity-0 transform translate-y-4' : 'opacity-100 transform translate-y-0'
            }`}
          >
            {slides[currentSlide].headline}
          </h1>
          
          {/* Fixed Subheadline */}
          <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto leading-relaxed opacity-90">
            Connect with personalized AI companions through text, voice, and video. Experience meaningful conversations tailored just for you.
          </p>
          
          {/* Fixed CTAs in Horizontal Row */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              id="cta-start-questionnaire"
              size="lg" 
              onClick={onStartQuestionnaire} 
              className="text-lg px-8 py-6 bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              Start Questionnaire
            </Button>
            <Button 
              id="cta-browse-companions"
              size="lg" 
              variant="secondary" 
              onClick={onBrowseCompanions} 
              className="text-lg px-8 py-6"
            >
              Browse & Choose Companions
            </Button>
            <Button 
              id="cta-build-your-own"
              size="lg" 
              variant="outline" 
              onClick={onBuildCompanion} 
              className="text-lg px-8 py-6 border-white/30 text-white hover:bg-white/10 hover:text-white"
            >
              Build Your Own
            </Button>
          </div>
        </div>
      </div>
      
      {/* Slide Indicators */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-20">
        <div className="flex space-x-3">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                index === currentSlide 
                  ? 'bg-white scale-125' 
                  : 'bg-white/50 hover:bg-white/70'
              }`}
              aria-label={`Go to slide ${index + 1}`}
              aria-current={index === currentSlide ? 'true' : 'false'}
            />
          ))}
        </div>
      </div>
    </section>
  );
};