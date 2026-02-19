import { useState, useMemo, useEffect, memo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, ChevronRight, Shirt, Package, Sparkles, Search, X, LayoutGrid, LayoutList } from 'lucide-react';
import { ProductCard } from './ProductCard';
import { ProductGridSkeleton } from './ProductCardSkeleton';
import { useProducts, Product } from '@/hooks/useProducts';
import { usePerformance } from '@/hooks/usePerformance';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { supabase } from '@/integrations/supabase/client';
import { ProductFiltersPanel, ActiveFilterTags, ProductFilters } from './ProductFilters';
import { OptimizedImage } from './OptimizedImage';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

interface CategoryData {
  id: string;
  name: string;
  image_url: string | null;
  has_sizes: boolean;
}

const CATEGORY_ORDER = ['T-Shirts', 'Shirts', 'Pants', 'Trousers', 'Caps', 'Accessories'];

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'T-Shirts': <Shirt className="h-5 w-5" />,
  'Shirts': <Shirt className="h-5 w-5" />,
  'Pants': <Package className="h-5 w-5" />,
  'Trousers': <Package className="h-5 w-5" />,
  'Caps': <Sparkles className="h-5 w-5" />,
  'Accessories': <Sparkles className="h-5 w-5" />,
};

const CATEGORY_COLORS: Record<string, string> = {
  'T-Shirts': 'from-blue-500/10 to-blue-600/5 border-blue-200',
  'Shirts': 'from-emerald-500/10 to-emerald-600/5 border-emerald-200',
  'Pants': 'from-amber-500/10 to-amber-600/5 border-amber-200',
  'Trousers': 'from-purple-500/10 to-purple-600/5 border-purple-200',
  'Caps': 'from-rose-500/10 to-rose-600/5 border-rose-200',
  'Accessories': 'from-cyan-500/10 to-cyan-600/5 border-cyan-200',
};

interface CategorySectionProps {
  category: string;
  products: Product[];
  onViewAll: (category: string) => void;
  bannerImage?: string | null;
}

const CategorySection = memo(function CategorySection({ 
  category, 
  products, 
  onViewAll, 
  bannerImage,
  shouldReduceAnimations = false,
}: CategorySectionProps & { shouldReduceAnimations?: boolean }) {
  if (products.length === 0) return null;

  const colorClass = CATEGORY_COLORS[category] || 'from-primary/10 to-primary/5 border-primary/20';
  const icon = CATEGORY_ICONS[category] || <Package className="h-5 w-5" />;
  
  const Wrapper = shouldReduceAnimations ? 'div' : motion.div;
  const wrapperProps = shouldReduceAnimations ? {} : {
    initial: { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.6 },
  };

  return (
    <Wrapper {...wrapperProps} className="mb-12">
      {/* Category Banner */}
      {bannerImage && (
        <div className="relative h-36 md:h-48 rounded-t-2xl overflow-hidden">
          <OptimizedImage
            src={bannerImage}
            alt={`${category} collection`}
            className="w-full h-full"
            preset="category"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-foreground/70 via-foreground/40 to-transparent" />
          <div className="absolute inset-0 flex items-center justify-between px-6 md:px-8">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-background/20 backdrop-blur-md rounded-xl border border-background/30">
                {icon}
              </div>
              <div className="text-primary-foreground">
                <h3 className="font-display text-2xl md:text-4xl font-bold drop-shadow-lg">
                  {category}
                </h3>
                <p className="text-sm text-primary-foreground/80">
                  {products.length} {products.length === 1 ? 'item' : 'items'} available
                </p>
              </div>
            </div>
            <Button 
              variant="secondary" 
              size="sm" 
              className="gap-1 bg-background/20 backdrop-blur-md hover:bg-background/30 text-primary-foreground border border-background/30 hidden sm:flex"
              onClick={() => onViewAll(category)}
            >
              See All <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
      
      {/* Category Header fallback (no banner) */}
      {!bannerImage && (
        <div className={`bg-gradient-to-r ${colorClass} border rounded-t-2xl p-5 flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-background rounded-xl shadow-sm border border-border/50">
              {icon}
            </div>
            <div>
              <h3 className="font-display text-xl md:text-2xl font-bold text-foreground">
                {category}
              </h3>
              <p className="text-sm text-muted-foreground">
                {products.length} {products.length === 1 ? 'item' : 'items'} available
              </p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-primary hover:text-primary/80 gap-1 hidden sm:flex"
            onClick={() => onViewAll(category)}
          >
            See All <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
      
      {/* Products Grid */}
      <div className={`border border-t-0 rounded-b-2xl p-4 md:p-6 bg-card/30 backdrop-blur-sm`}>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
          {products.slice(0, 5).map((product, index) => (
            <ProductCard key={product.id} product={product} index={index} />
          ))}
        </div>
        {products.length > 5 && (
          <div className="text-center mt-6">
            <Button 
              variant="outline" 
              onClick={() => onViewAll(category)}
              className="gap-2 rounded-full px-6"
            >
              View all {products.length} items in {category}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
        <Button 
          variant="link" 
          size="sm" 
          className="text-primary gap-1 sm:hidden mt-4 w-full"
          onClick={() => onViewAll(category)}
        >
          See All {category} <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </Wrapper>
  );
});

// Quick Category Navigation
function CategoryNav({ 
  categories, 
  activeCategory, 
  onSelect 
}: { 
  categories: string[]; 
  activeCategory: string;
  onSelect: (cat: string) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-wrap gap-2 mb-8 justify-center"
    >
      <Button
        variant={activeCategory === 'all' ? 'default' : 'outline'}
        size="sm"
        onClick={() => onSelect('all')}
        className="rounded-full px-6"
      >
        All Products
      </Button>
      {categories.map(cat => (
        <Button
          key={cat}
          variant={activeCategory === cat ? 'default' : 'outline'}
          size="sm"
          onClick={() => onSelect(cat)}
          className="rounded-full gap-1.5 px-5"
        >
          {CATEGORY_ICONS[cat]}
          {cat}
        </Button>
      ))}
    </motion.div>
  );
}

export function ProductsSection() {
  const { products, loading, error } = useProducts();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Initialize from URL params
  const urlSearch = searchParams.get('search') || '';
  const urlCategory = searchParams.get('category') || '';
  const urlSale = searchParams.get('sale') === 'true';
  
  const [searchQuery, setSearchQuery] = useState(urlSearch);
  const [categoryData, setCategoryData] = useState<Record<string, CategoryData>>({});
  const [sortBy, setSortBy] = useState('newest');
  const [activeCategory, setActiveCategory] = useState(urlCategory || 'all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showSaleOnly, setShowSaleOnly] = useState(urlSale);
  
  // Sync URL params with state
  useEffect(() => {
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const sale = searchParams.get('sale') === 'true';
    
    if (search !== searchQuery) {
      setSearchQuery(search);
    }
    if (category && category !== activeCategory) {
      setActiveCategory(category);
    } else if (!category && !search && activeCategory !== 'all') {
      // Don't reset if user manually selected a category
    }
    if (sale !== showSaleOnly) {
      setShowSaleOnly(sale);
    }
  }, [searchParams]);
  
  // Update URL when filters change
  const updateUrlParams = (newSearch?: string, newCategory?: string) => {
    const params = new URLSearchParams();
    const searchVal = newSearch !== undefined ? newSearch : searchQuery;
    const catVal = newCategory !== undefined ? newCategory : activeCategory;
    
    if (searchVal) params.set('search', searchVal);
    if (catVal && catVal !== 'all') params.set('category', catVal);
    
    setSearchParams(params, { replace: true });
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    updateUrlParams(value, undefined);
  };

  const handleCategoryChange = (category: string) => {
    setActiveCategory(category);
    updateUrlParams(undefined, category);
  };
  
  // Advanced filters state
  const [filters, setFilters] = useState<ProductFilters>({
    priceRange: [0, 10000],
    sizes: [],
    colors: [],
  });

  // Calculate max price and available filter options from products
  const { maxPrice, availableSizes, availableColors } = useMemo(() => {
    const prices = products.map(p => p.price);
    const max = Math.ceil(Math.max(...prices, 10000) / 100) * 100;
    
    const sizes = new Set<string>();
    const colors = new Set<string>();
    
    products.forEach(p => {
      p.sizes.forEach(s => sizes.add(s));
      // Colors would come from product.colors if available
    });
    
    // Common colors for now (you can extend based on your product data)
    ['Black', 'White', 'Blue', 'Red', 'Green', 'Gray', 'Navy', 'Brown', 'Beige'].forEach(c => colors.add(c));
    
    return {
      maxPrice: max,
      availableSizes: Array.from(sizes),
      availableColors: Array.from(colors),
    };
  }, [products]);

  // Initialize price range once we know max price
  useEffect(() => {
    if (maxPrice > 0 && filters.priceRange[1] === 10000) {
      setFilters(prev => ({ ...prev, priceRange: [0, maxPrice] }));
    }
  }, [maxPrice]);

  // Fetch category data including banners
  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase
        .from('categories')
        .select('id, name, image_url, has_sizes');
      
      if (data) {
        const catMap: Record<string, CategoryData> = {};
        data.forEach((cat) => {
          catMap[cat.name] = cat as CategoryData;
        });
        setCategoryData(catMap);
      }
    };
    fetchCategories();
  }, []);

  const categories = useMemo(() => {
    const cats = [...new Set(products.map(p => p.category))];
    return cats.sort((a, b) => {
      const aIndex = CATEGORY_ORDER.indexOf(a);
      const bIndex = CATEGORY_ORDER.indexOf(b);
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      return a.localeCompare(b);
    });
  }, [products]);

  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Sale filter - show only products with sale badge
    if (showSaleOnly) {
      result = result.filter(p => p.badge === 'sale' || p.originalPrice);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(p => 
        p.name.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query)
      );
    }

    // Category filter
    if (activeCategory !== 'all') {
      result = result.filter(p => p.category === activeCategory);
    }

    // Price range filter
    result = result.filter(p => 
      p.price >= filters.priceRange[0] && p.price <= filters.priceRange[1]
    );

    // Size filter
    if (filters.sizes.length > 0) {
      result = result.filter(p => 
        p.sizes.some(s => filters.sizes.includes(s))
      );
    }

    // Note: Color filter would work if products have colors field
    // if (filters.colors.length > 0) {
    //   result = result.filter(p => 
    //     p.colors?.some(c => filters.colors.includes(c))
    //   );
    // }

    // Sort
    switch (sortBy) {
      case 'price-low':
        result.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        result.sort((a, b) => b.price - a.price);
        break;
      case 'popular':
        result.sort((a, b) => (b.stock > 10 ? 1 : 0) - (a.stock > 10 ? 1 : 0));
        break;
      case 'newest':
      default:
        break;
    }

    return result;
  }, [products, searchQuery, activeCategory, sortBy, filters, showSaleOnly]);

  // Count active filters
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.priceRange[0] > 0 || filters.priceRange[1] < maxPrice) count++;
    count += filters.sizes.length;
    count += filters.colors.length;
    return count;
  }, [filters, maxPrice]);

  const clearAllFilters = () => {
    setFilters({
      priceRange: [0, maxPrice],
      sizes: [],
      colors: [],
    });
    setSearchQuery('');
    setActiveCategory('all');
    setShowSaleOnly(false);
    setSearchParams({}, { replace: true });
  };

  // Group products by category
  const productsByCategory = useMemo(() => {
    const grouped: Record<string, typeof filteredProducts> = {};
    categories.forEach(cat => {
      grouped[cat] = filteredProducts.filter(p => p.category === cat);
    });
    return grouped;
  }, [filteredProducts, categories]);

  const handleViewAll = (category: string) => {
    setActiveCategory(category);
    document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
  };

  const isFiltering = searchQuery || activeCategory !== 'all' || activeFiltersCount > 0 || showSaleOnly;
  const showCategorySections = !isFiltering && filteredProducts.length > 0;

  if (loading) {
    return (
      <section id="products" className="py-20 bg-gradient-to-b from-background to-secondary/20">
        <div className="container px-4 md:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-10 text-center"
          >
            <span className="text-primary font-medium text-sm tracking-widest uppercase mb-2 block">
              Our Collection
            </span>
            <h2 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4 tracking-wide">
              ALL PRODUCTS
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Loading our premium fashion collection...
            </p>
          </motion.div>
          <ProductGridSkeleton count={8} />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section id="products" className="py-20 bg-gradient-to-b from-background to-secondary/20">
        <div className="container px-4 md:px-8 flex items-center justify-center min-h-[400px]">
          <p className="text-destructive">{error}</p>
        </div>
      </section>
    );
  }

  return (
    <section id="products" className="py-16 bg-gradient-to-b from-background via-secondary/5 to-background relative overflow-hidden">
      {/* Subtle Background Pattern */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-accent/10 rounded-full blur-3xl" />
      </div>

      <div className="container px-4 md:px-8 relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-10 text-center"
        >
          <span className="text-primary font-medium text-sm tracking-widest uppercase mb-2 block">
            Our Collection
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-3 tracking-wide">
            ALL PRODUCTS
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Discover our premium fashion essentials. Filter by category or search for exactly what you need.
          </p>
        </motion.div>

        {/* Quick Category Navigation */}
        <CategoryNav 
          categories={categories}
          activeCategory={activeCategory}
          onSelect={handleCategoryChange}
        />

        {/* Search & Filter Bar */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between bg-card/50 backdrop-blur-sm rounded-2xl p-4 border border-border/50"
        >
          {/* Search */}
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-12 pr-10 h-12 rounded-xl border-border/50 bg-background/50"
            />
            {searchQuery && (
              <button
                onClick={() => handleSearchChange('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Sort, Filter & View Toggle */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Mobile Filter Button */}
            <ProductFiltersPanel
              filters={filters}
              onFiltersChange={setFilters}
              maxPrice={maxPrice}
              availableSizes={availableSizes}
              availableColors={availableColors}
              activeFiltersCount={activeFiltersCount}
              onClearAll={clearAllFilters}
            />
            
            {/* Sort */}
            <div className="flex items-center gap-2 flex-1 sm:flex-none">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full sm:w-[180px] h-10 rounded-xl border-border/50 bg-background/50">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="price-low">Price: Low to High</SelectItem>
                  <SelectItem value="price-high">Price: High to Low</SelectItem>
                  <SelectItem value="popular">Most Popular</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* View Mode Toggle */}
            <div className="hidden sm:flex items-center border border-border rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 ${viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-secondary'}`}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 ${viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-secondary'}`}
              >
                <LayoutList className="h-4 w-4" />
              </button>
            </div>
          </div>
        </motion.div>

        {/* Active Filter Tags */}
        <ActiveFilterTags
          filters={filters}
          onFiltersChange={setFilters}
          maxPrice={maxPrice}
          onClearAll={clearAllFilters}
        />

        {/* Results count when filtering */}
        {isFiltering && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-between mb-6 px-2"
          >
            <p className="text-muted-foreground">
              Showing <span className="font-medium text-foreground">{filteredProducts.length}</span> {filteredProducts.length === 1 ? 'product' : 'products'}
              {activeCategory !== 'all' && <span> in <span className="font-medium text-primary">{activeCategory}</span></span>}
            </p>
            {activeCategory !== 'all' && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setActiveCategory('all')}
                className="gap-1"
              >
                <X className="h-4 w-4" />
                Clear filter
              </Button>
            )}
          </motion.div>
        )}

        {/* Products Display */}
        {filteredProducts.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-16 bg-card/30 rounded-2xl border border-border/50"
          >
            <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-xl text-muted-foreground font-medium">No products found</p>
            <p className="text-muted-foreground mt-2">Try adjusting your search or filters</p>
            <Button 
              variant="outline" 
              onClick={clearAllFilters}
              className="mt-4"
            >
              Clear all filters
            </Button>
          </motion.div>
        ) : showCategorySections ? (
          // Show products grouped by category (Shopee style)
          <div>
            {Object.entries(productsByCategory).map(([category, categoryProducts]) => (
              <CategorySection
                key={category}
                category={category}
                products={categoryProducts}
                onViewAll={handleViewAll}
                bannerImage={categoryData[category]?.image_url}
              />
            ))}
          </div>
        ) : (
          // Show filtered products in a single grid
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6"
          >
            {filteredProducts.map((product, index) => (
              <ProductCard key={product.id} product={product} index={index} />
            ))}
          </motion.div>
        )}
      </div>
    </section>
  );
}
