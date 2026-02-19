import { useState, useEffect, memo } from 'react';
import { motion } from 'framer-motion';
import { CategoryCard } from './CategoryCard';
import { CategoriesGridSkeleton } from './CategoryCardSkeleton';
import { supabase } from '@/integrations/supabase/client';
import { useProducts } from '@/hooks/useProducts';
import { usePerformance } from '@/hooks/usePerformance';

interface Category {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
}

// Define static categories including coming soon ones
const STATIC_CATEGORIES = [
  { name: 'Shirts', slug: 'shirts' },
  { name: 'T-Shirts', slug: 't-shirts' },
  { name: 'Pants', slug: 'pants' },
  { name: 'Trousers', slug: 'trousers' },
  { name: 'Caps', slug: 'caps' },
  { name: 'Gadgets', slug: 'gadgets', isComingSoon: true },
  { name: 'Accessories', slug: 'accessories', isComingSoon: true },
];

export const ShopCategoriesGrid = memo(function ShopCategoriesGrid() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const { products, loading: productsLoading } = useProducts();
  const { shouldReduceAnimations, enableDecorations } = usePerformance();

  useEffect(() => {
    const fetchCategories = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('categories')
        .select('id, name, slug, image_url, display_order')
        .order('display_order', { ascending: true });
      
      if (data) {
        setCategories(data);
      }
      setLoading(false);
    };
    
    fetchCategories();
  }, []);

  // Merge static categories with database categories
  const displayCategories = STATIC_CATEGORIES.map((staticCat) => {
    const dbCategory = categories.find(
      c => c.slug === staticCat.slug || c.name.toLowerCase() === staticCat.name.toLowerCase()
    );
    
    const productCount = products.filter(
      p => p.category.toLowerCase() === staticCat.name.toLowerCase()
    ).length;

    return {
      id: dbCategory?.id || staticCat.slug,
      name: staticCat.name,
      slug: dbCategory?.slug || staticCat.slug,
      image_url: dbCategory?.image_url || null,
      productCount,
      isComingSoon: staticCat.isComingSoon || false,
    };
  });

  // Show skeleton while loading
  if (loading || productsLoading) {
    return <CategoriesGridSkeleton count={shouldReduceAnimations ? 4 : 7} />;
  }

  const Wrapper = shouldReduceAnimations ? 'div' : motion.div;
  const headerProps = shouldReduceAnimations ? {} : {
    initial: { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.6 },
  };

  return (
    <section className="py-14 bg-gradient-to-b from-secondary/20 via-accent/5 to-background relative overflow-hidden">
      {/* Decorative Background Elements - disabled on low-end */}
      {enableDecorations && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-accent/10 rounded-full blur-3xl" />
        </div>
      )}

      <div className="container px-4 md:px-8 relative z-10">
        {/* Section Header */}
        <Wrapper
          {...headerProps}
          className="text-center mb-12"
        >
          <span className="text-primary font-medium text-sm tracking-widest uppercase mb-2 block">
            Explore Our Collection
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-3">
            Shop By Category
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Discover premium fashion essentials organized by category. 
            Click on any category to explore our curated collection.
          </p>
        </Wrapper>

        {/* Categories Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {displayCategories.map((cat, index) => (
            <CategoryCard
              key={cat.id}
              name={cat.name}
              slug={cat.slug}
              image={cat.image_url}
              productCount={cat.productCount}
              isComingSoon={cat.isComingSoon}
              index={shouldReduceAnimations ? 0 : index}
            />
          ))}
        </div>
      </div>
    </section>
  );
});
