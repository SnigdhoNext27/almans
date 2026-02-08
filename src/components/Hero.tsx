import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { ChevronLeft, ChevronRight, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { haptics } from '@/lib/haptics';
import { usePerformance } from '@/hooks/usePerformance';
import heroImage1 from '@/assets/hero-1.jpg';
import heroImage2 from '@/assets/hero-2.jpg';
import heroImage3 from '@/assets/hero-3.jpg';
import heroImage4 from '@/assets/hero-4.jpg';

const defaultSlides = [
  {
    id: 1,
    image: heroImage1,
    subtitle: 'URBAN STYLE',
    title: 'ALMANS',
    tagline: 'Street Ready',
    description: 'Contemporary streetwear meets timeless elegance for the fashion-forward individual.',
  },
  {
    id: 2,
    image: heroImage2,
    subtitle: 'NEW COLLECTION',
    title: 'ALMANS',
    tagline: 'Autumn Essentials',
    description: 'Discover our latest collection of premium casual wear designed for the modern gentleman.',
  },
  {
    id: 3,
    image: heroImage3,
    subtitle: 'PREMIUM QUALITY',
    title: 'ALMANS',
    tagline: 'Crafted with Care',
    description: 'Every piece is made with the finest materials, ensuring comfort and durability that lasts.',
  },
  {
    id: 4,
    image: heroImage4,
    subtitle: 'THOUGHTFUL FASHION',
    title: 'ALMANS',
    tagline: 'Timeless Style',
    description: 'Almans crafts premium, sustainably-made wardrobe essentials that blend modern cuts with long-lasting materials.',
  },
];

// Slide variants
const getSlideVariants = (isLowEnd: boolean) => ({
  enter: (direction: number) => ({
    x: isLowEnd ? 0 : (direction > 0 ? 300 : -300),
    opacity: 0,
    scale: isLowEnd ? 1 : 1.05,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
    transition: { duration: isLowEnd ? 0.2 : 0.6, ease: "easeOut" as const },
  },
  exit: (direction: number) => ({
    x: isLowEnd ? 0 : (direction < 0 ? 300 : -300),
    opacity: 0,
    scale: isLowEnd ? 1 : 0.95,
    transition: { duration: isLowEnd ? 0.15 : 0.4 },
  }),
});

export function Hero() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isPaused, setIsPaused] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const { settings } = useSiteSettings();
  const navigate = useNavigate();
  const { shouldReduceAnimations, enableParallax } = usePerformance();
  
  const slideVariants = getSlideVariants(shouldReduceAnimations);
  
  // Parallax scroll setup
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"]
  });
  
  const backgroundY = useTransform(scrollYProgress, [0, 1], enableParallax ? ['0%', '25%'] : ['0%', '0%']);
  const contentY = useTransform(scrollYProgress, [0, 1], enableParallax ? ['0%', '10%'] : ['0%', '0%']);
  const brandTextY = useTransform(scrollYProgress, [0, 1], enableParallax ? ['0%', '35%'] : ['0%', '0%']);
  const scale = useTransform(scrollYProgress, [0, 1], enableParallax ? [1, 1.08] : [1, 1]);

  const slides = defaultSlides;
  const totalSlides = slides.length;

  useEffect(() => {
    if (isPaused) return;
    
    const timer = setInterval(() => {
      setDirection(1);
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    
    return () => clearInterval(timer);
  }, [isPaused, slides.length]);

  const goToSlide = (index: number) => {
    setDirection(index > currentSlide ? 1 : -1);
    setCurrentSlide(index);
  };

  const nextSlide = useCallback(() => {
    setDirection(1);
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  }, [slides.length]);

  const prevSlide = useCallback(() => {
    setDirection(-1);
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  }, [slides.length]);

  // Touch handling
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isSwipe = Math.abs(distance) > minSwipeDistance;
    
    if (isSwipe) {
      haptics.light();
      if (distance > 0) {
        nextSlide();
      } else {
        prevSlide();
      }
    }
  };

  const slide = slides[currentSlide];

  return (
    <section 
      ref={sectionRef}
      className="relative w-full overflow-hidden bg-almans-chocolate touch-pan-y"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div className="relative h-[85vh] min-h-[550px] max-h-[800px]">
        {/* Background Image with Parallax */}
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentSlide}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className="absolute inset-0"
            style={{ y: backgroundY, scale }}
          >
            <img
              src={slide.image}
              alt={slide.title}
              className="h-full w-full object-cover object-center"
            />
            {/* Gradient Overlays */}
            <div className="absolute inset-0 bg-gradient-to-r from-almans-chocolate/85 via-almans-chocolate/50 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-almans-chocolate/50 via-transparent to-almans-chocolate/20" />
          </motion.div>
        </AnimatePresence>

        {/* Large Brand Typography - Background Watermark */}
        <motion.div 
          className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none"
          style={{ y: brandTextY }}
        >
          <motion.span
            key={`brand-${currentSlide}`}
            initial={{ opacity: 0, x: 80 }}
            animate={{ opacity: 0.06, x: 0 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="font-display text-[22vw] md:text-[18vw] font-bold text-almans-cream tracking-wider whitespace-nowrap select-none"
          >
            ALMANS
          </motion.span>
        </motion.div>

        {/* Content */}
        <motion.div 
          className="container relative z-10 flex h-full items-center px-5 md:px-8"
          style={{ y: contentY }}
        >
          <div className="max-w-lg">
            <AnimatePresence mode="wait">
              <motion.div key={`content-${currentSlide}`}>
                {/* Tag Badge */}
                <motion.div
                  initial={{ opacity: 0, y: 15, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.4 }}
                  className="inline-flex items-center gap-2 mb-5 px-4 py-2 rounded-full bg-almans-cream/10 backdrop-blur-sm border border-almans-cream/15"
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-almans-gold" />
                  </motion.div>
                  <span className="text-xs font-semibold tracking-[0.2em] text-almans-cream/90 uppercase">
                    {slide.subtitle}
                  </span>
                </motion.div>

                {/* Main Title */}
                <motion.h1
                  initial={{ opacity: 0, y: 25 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -25 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-almans-cream mb-2"
                  style={{ textShadow: '0 4px 20px rgba(0,0,0,0.3)' }}
                >
                  {slide.title}
                </motion.h1>

                {/* Tagline */}
                <motion.p
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.4, delay: 0.2 }}
                  className="font-display text-xl sm:text-2xl md:text-3xl italic text-almans-gold mb-5"
                  style={{ textShadow: '0 2px 15px rgba(191, 149, 90, 0.25)' }}
                >
                  {slide.tagline}
                </motion.p>

                {/* Description */}
                <motion.p
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.4, delay: 0.3 }}
                  className="mb-8 text-sm sm:text-base text-almans-cream/80 leading-relaxed max-w-md"
                >
                  {slide.description}
                </motion.p>

                {/* CTA Buttons */}
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.4, delay: 0.4 }}
                  className="flex flex-wrap gap-3 items-center"
                >
                  {/* Shop Now Button with Glow */}
                  <motion.div
                    className="relative"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {/* Glow effect */}
                    <motion.div
                      className="absolute -inset-0.5 bg-gradient-to-r from-primary via-almans-gold to-primary rounded-lg opacity-60 blur-md"
                      animate={{
                        opacity: [0.4, 0.7, 0.4],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }}
                    />
                    
                    <Button
                      size="lg"
                      className="relative bg-gradient-to-r from-primary to-almans-brown hover:from-almans-brown hover:to-primary text-primary-foreground font-semibold text-sm px-6 py-5 rounded-lg shadow-lg transition-all duration-300 overflow-hidden"
                      onClick={() => navigate('/shop')}
                    >
                      {/* Shimmer effect */}
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -skew-x-12"
                        animate={{ x: ['-200%', '200%'] }}
                        transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 1.5 }}
                      />
                      
                      <span className="relative z-10 flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        SHOP NOW
                        <motion.span
                          animate={{ x: [0, 3, 0] }}
                          transition={{ duration: 1.2, repeat: Infinity }}
                        >
                          <ArrowRight className="w-4 h-4" />
                        </motion.span>
                      </span>
                    </Button>
                  </motion.div>

                  {/* Explore Collection Button */}
                  <Button
                    variant="outline"
                    size="lg"
                    className="border-almans-cream/25 text-almans-cream hover:bg-almans-cream/10 hover:border-almans-cream/40 backdrop-blur-sm transition-all duration-300 text-sm px-6 py-5"
                    onClick={() => navigate('/shop')}
                  >
                    EXPLORE COLLECTION
                  </Button>
                </motion.div>
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Navigation Arrows */}
        <button
          onClick={prevSlide}
          className="absolute left-3 md:left-6 top-1/2 -translate-y-1/2 z-20 flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-full bg-almans-cream/10 backdrop-blur-sm border border-almans-cream/20 text-almans-cream hover:bg-almans-cream/20 transition-all duration-200"
          aria-label="Previous slide"
        >
          <ChevronLeft className="h-5 w-5 md:h-6 md:w-6" />
        </button>
        <button
          onClick={nextSlide}
          className="absolute right-3 md:right-6 top-1/2 -translate-y-1/2 z-20 flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-full bg-almans-cream/10 backdrop-blur-sm border border-almans-cream/20 text-almans-cream hover:bg-almans-cream/20 transition-all duration-200"
          aria-label="Next slide"
        >
          <ChevronRight className="h-5 w-5 md:h-6 md:w-6" />
        </button>

        {/* Slide Indicators with Number */}
        <div className="absolute bottom-6 md:bottom-8 right-4 md:right-8 z-20 flex items-center gap-4">
          {/* Dot indicators */}
          <div className="hidden sm:flex items-center gap-2">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`h-1 rounded-full transition-all duration-300 ${
                  index === currentSlide 
                    ? 'w-8 bg-almans-gold' 
                    : 'w-2 bg-almans-cream/30 hover:bg-almans-cream/50'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>

          {/* Progress bar for current slide */}
          <div className="flex flex-col items-end gap-1">
            <div className="w-12 h-0.5 bg-almans-cream/20 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-almans-gold rounded-full"
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ duration: 5, ease: 'linear' }}
                key={currentSlide}
              />
            </div>
            
            {/* Slide Number */}
            <div className="flex items-baseline gap-1 text-almans-cream">
              <span className="text-xl md:text-2xl font-display font-bold">
                {String(currentSlide + 1).padStart(2, '0')}
              </span>
              <span className="text-xs text-almans-cream/50">
                /{String(totalSlides).padStart(2, '0')}
              </span>
            </div>
          </div>
        </div>

        {/* Mobile dot indicators */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex sm:hidden items-center gap-2">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`h-1 rounded-full transition-all duration-300 ${
                index === currentSlide 
                  ? 'w-6 bg-almans-gold' 
                  : 'w-1.5 bg-almans-cream/30'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}