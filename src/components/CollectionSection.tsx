import { memo } from 'react';
import { motion } from 'framer-motion';
import { usePerformance } from '@/hooks/usePerformance';
import { OptimizedImage } from './OptimizedImage';
import collection1 from '@/assets/collection-1.jpg';
import collection2 from '@/assets/collection-2.jpg';
import collection3 from '@/assets/collection-3.jpg';

const collections = [
  {
    id: 1,
    name: 'Frost Merino Sweater',
    description: 'Premium merino knit that regulates warmth while staying breathable.',
    image: collection1,
    size: 'large',
  },
  {
    id: 2,
    name: 'Sierra Puffer Jacket',
    description: 'A tailored longline wool coat with a clean silhouette, made for modern city winters.',
    image: collection2,
    size: 'small',
  },
  {
    id: 3,
    name: 'Atlas Wool Coat',
    description: 'A tailored longline wool coat with a clean silhouette, made for modern day.',
    image: collection3,
    size: 'small',
  },
];

const CollectionCard = memo(function CollectionCard({
  item,
  isLarge,
  index,
  shouldReduceAnimations,
}: {
  item: typeof collections[0];
  isLarge: boolean;
  index: number;
  shouldReduceAnimations: boolean;
}) {
  const Wrapper = shouldReduceAnimations ? 'div' : motion.div;
  const wrapperProps = shouldReduceAnimations ? {} : {
    initial: { opacity: 0, y: 30 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.6, delay: index * 0.1 },
  };

  return (
    <Wrapper
      {...wrapperProps}
      className={`relative overflow-hidden rounded-3xl group card-hover-glow ${isLarge ? 'aspect-[4/3] md:row-span-2' : 'aspect-[4/3]'}`}
    >
      <div className={`w-full h-full ${!shouldReduceAnimations ? 'transition-transform duration-500 group-hover:scale-105' : ''}`}>
        <OptimizedImage
          src={item.image}
          alt={item.name}
          className="h-full w-full"
          preset={isLarge ? 'hero' : 'category'}
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-almans-chocolate/85 via-almans-chocolate/20 to-transparent transition-opacity duration-500 group-hover:from-almans-chocolate/90" />
      <div className="absolute bottom-6 left-6 right-6">
        <h3 className={`font-display font-bold text-almans-cream mb-2 ${isLarge ? 'text-2xl md:text-3xl' : 'text-xl md:text-2xl'}`}>
          {item.name}
        </h3>
        <p className={`text-almans-cream/80 text-sm ${!isLarge ? 'line-clamp-2' : ''}`}>
          {item.description}
        </p>
      </div>
    </Wrapper>
  );
});

export const CollectionSection = memo(function CollectionSection() {
  const { shouldReduceAnimations } = usePerformance();
  const Wrapper = shouldReduceAnimations ? 'div' : motion.div;
  const headerProps = shouldReduceAnimations ? {} : {
    initial: { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.6 },
  };

  return (
    <section className="py-16 bg-background">
      <div className="container px-4 md:px-8">
        {/* Section Header */}
        <Wrapper
          {...headerProps}
          className="mb-10 flex flex-col md:flex-row md:items-end md:justify-between gap-4"
        >
          <div>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-2">
              Autumn / Winter
            </h2>
            <h3 className="font-display text-2xl md:text-3xl font-bold text-foreground">
              collection 2026
            </h3>
          </div>
          <p className="text-muted-foreground max-w-sm">
            The Almans Autumn & Winter Collection brings together warm textures, durable fabrics, and
            minimalist silhouettes designed for the colder...
          </p>
        </Wrapper>

        {/* Collection Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {collections.map((item, index) => (
            <CollectionCard
              key={item.id}
              item={item}
              isLarge={index === 0}
              index={index}
              shouldReduceAnimations={shouldReduceAnimations}
            />
          ))}
        </div>
      </div>
    </section>
  );
});
