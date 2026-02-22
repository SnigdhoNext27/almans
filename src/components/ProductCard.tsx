import { useState, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, ShoppingBag, Heart, GitCompare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Product, useCartStore } from '@/lib/store';
import { useWishlist } from '@/hooks/useWishlist';
import { useProductComparison } from '@/hooks/useProductComparison';
import { useToast } from '@/hooks/use-toast';
import { SaleCountdown } from '@/components/SaleCountdown';
import { useCurrency } from '@/hooks/useCurrency';
import { usePerformance } from '@/hooks/usePerformance';
import { OptimizedImage } from '@/components/OptimizedImage';

interface ProductCardProps {
  product: Product;
  index?: number;
}

export const ProductCard = memo(function ProductCard({ product, index = 0 }: ProductCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [selectedSize, setSelectedSize] = useState(product.sizes?.[1] || product.sizes?.[0] || '');
  const { addItem } = useCartStore();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { addProduct, isInComparison, removeProduct } = useProductComparison();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { format } = useCurrency();
  const { shouldReduceAnimations, animationDuration, enableHoverEffects } = usePerformance();

  const inWishlist = isInWishlist(product.id);
  const inComparison = isInComparison(product.id);

  const handleAddToBag = (e: React.MouseEvent) => {
    e.stopPropagation();
    addItem(product, selectedSize);
  };

  const handleToggleWishlist = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleWishlist(product.id);
  };

  const handleToggleComparison = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (inComparison) {
      removeProduct(product.id);
      toast({
        title: 'Removed from comparison',
        description: `${product.name} has been removed.`,
      });
    } else {
      const comparisonProduct = {
        ...product,
        description: product.description || '',
      };
      const added = addProduct(comparisonProduct as any);
      if (added) {
        toast({
          title: 'Added to comparison',
          description: `${product.name} has been added. Select up to 4 products.`,
        });
      } else {
        toast({
          title: 'Comparison limit reached',
          description: 'You can compare up to 4 products at a time.',
          variant: 'destructive',
        });
      }
    }
  };

  const handleCardClick = () => {
    navigate(`/product/${product.id}`);
  };

  // Optimized animation variants for low-end devices
  const cardAnimation = shouldReduceAnimations
    ? { opacity: 1, y: 0 }
    : { opacity: 1, y: 0 };
  
  const cardInitial = shouldReduceAnimations
    ? { opacity: 0.8, y: 0 }
    : { opacity: 0, y: 30 };

  return (
    <motion.div
      initial={cardInitial}
      animate={cardAnimation}
      transition={{ 
        duration: shouldReduceAnimations ? 0.1 : 0.5, 
        delay: shouldReduceAnimations ? 0 : Math.min(index * 0.05, 0.3) 
      }}
      className="group cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleCardClick}
    >
      {/* Image Container */}
      <div className={`relative mb-3 aspect-[4/5] overflow-hidden rounded-xl bg-card shadow-soft transition-shadow duration-400 ${!shouldReduceAnimations ? 'group-hover:glow-gold' : ''}`}>
        {/* Optimized image with lazy loading and responsive sizing */}
        {shouldReduceAnimations ? (
          <OptimizedImage
            src={product.images?.[0] || '/placeholder.svg'}
            alt={product.name}
            className="h-full w-full"
            preset="productCard"
            priority={index < 4}
          />
        ) : (
          <motion.div
            className="h-full w-full"
            animate={{ scale: isHovered && enableHoverEffects ? 1.05 : 1 }}
            transition={{ duration: animationDuration }}
          >
            <OptimizedImage
              src={product.images?.[0] || '/placeholder.svg'}
              alt={product.name}
              className="h-full w-full"
              preset="productCard"
              priority={index < 4}
            />
          </motion.div>
        )}

        {/* Badge */}
        {product.badge && (
          <div className="absolute left-3 top-3 flex flex-col gap-2">
            <span
              className={`inline-block rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                product.badge === 'new'
                  ? 'bg-primary text-primary-foreground'
                  : product.badge === 'sale'
                  ? 'bg-destructive text-destructive-foreground badge-pulse'
                  : 'bg-almans-gold text-almans-chocolate'
              }`}
            >
              {product.badge === 'limited' ? 'Low Stock' : product.badge}
            </span>
            {product.badge === 'sale' && !shouldReduceAnimations && (
              <SaleCountdown compact className="bg-background/90 backdrop-blur-sm rounded-full px-2 py-1" />
            )}
          </div>
        )}

        {/* Action Buttons - simplified for low-end devices */}
        <div className="absolute right-3 top-3 flex flex-col gap-2">
          {/* Always show wishlist button on mobile/low-end, animate on desktop */}
          <button
            onClick={handleToggleWishlist}
            className={`flex h-10 w-10 items-center justify-center rounded-full shadow-medium backdrop-blur-sm transition-colors ${
              inWishlist 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-background/90 text-foreground hover:bg-primary hover:text-primary-foreground'
            } ${!isHovered && !inWishlist && !shouldReduceAnimations ? 'opacity-0 translate-x-2' : 'opacity-100 translate-x-0'}`}
            style={{ transition: 'opacity 0.2s, transform 0.2s' }}
            aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
          >
            <Heart className={`h-5 w-5 ${inWishlist ? 'fill-current' : ''}`} />
          </button>

          <button
            onClick={handleToggleComparison}
            className={`flex h-10 w-10 items-center justify-center rounded-full shadow-medium backdrop-blur-sm transition-colors ${
              inComparison 
                ? 'bg-almans-gold text-almans-chocolate' 
                : 'bg-background/90 text-foreground hover:bg-almans-gold hover:text-almans-chocolate'
            } ${!isHovered && !inComparison && !shouldReduceAnimations ? 'opacity-0 translate-x-2' : 'opacity-100 translate-x-0'}`}
            style={{ transition: 'opacity 0.2s, transform 0.2s' }}
            aria-label={inComparison ? 'Remove from comparison' : 'Add to comparison'}
          >
            <GitCompare className="h-5 w-5" />
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/product/${product.id}`); }}
            className={`flex h-10 w-10 items-center justify-center rounded-full bg-background/90 text-foreground shadow-medium backdrop-blur-sm transition-colors hover:bg-primary hover:text-primary-foreground ${
              !isHovered && !shouldReduceAnimations ? 'opacity-0 translate-x-2' : 'opacity-100 translate-x-0'
            }`}
            style={{ transition: 'opacity 0.2s, transform 0.2s' }}
            aria-label="Quick view"
          >
            <Eye className="h-5 w-5" />
          </button>
        </div>

        {/* Size Selector on Hover - simplified on low-end */}
        {product.sizes && product.sizes.length > 0 && (isHovered || shouldReduceAnimations) && (
          <div
            className={`absolute bottom-3 left-3 right-3 transition-all ${
              isHovered || shouldReduceAnimations ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
            style={{ transition: 'opacity 0.2s, transform 0.2s' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center gap-2 rounded-lg bg-background/90 p-2 backdrop-blur-sm">
              {product.sizes.map((size) => (
                <button
                  key={size}
                  onClick={(e) => { e.stopPropagation(); setSelectedSize(size); }}
                  className={`flex h-8 w-8 items-center justify-center rounded-md text-xs font-medium transition-colors ${
                    selectedSize === size
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-accent'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="space-y-1.5 px-0.5">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {product.category}
        </p>
        <h3 className="font-display text-base font-semibold text-foreground line-clamp-1">
          {product.name}
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-base font-bold text-foreground">
            {format(product.price)}
          </span>
          {product.originalPrice && (
            <span className="text-xs text-muted-foreground line-through">
              {format(product.originalPrice)}
            </span>
          )}
        </div>

        {/* Action Button */}
        <div className="pt-1.5">
          <Button
            variant="default"
            size="sm"
            className="w-full gap-2 rounded-lg text-xs h-9"
            onClick={handleAddToBag}
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            ADD TO BAG
          </Button>
        </div>
      </div>
    </motion.div>
  );
});
