import { motion } from 'framer-motion';
import { Facebook, Instagram, Banknote, CreditCard, Smartphone } from 'lucide-react';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { WolfLogoIcon } from './WolfLogoIcon';

const footerLinks = {
  'About Us': ['Our Story', 'Careers', 'Sustainability', 'Press'],
  'Shop': ['New Arrivals', 'Best Sellers', 'Sale', 'Gift Cards'],
  'Company': ['FAQ', 'Shipping', 'Returns', 'Size Guide'],
  'Legal': ['Privacy Policy', 'Terms of Service', 'Cookie Policy'],
};

const paymentMethods = [
  { name: 'Cash on Delivery', icon: Banknote, available: true },
  { name: 'bKash', icon: Smartphone, available: false },
  { name: 'Nagad', icon: Smartphone, available: false },
  { name: 'Cards', icon: CreditCard, available: false },
];

// WhatsApp SVG Icon component
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

export function Footer() {
  const { settings } = useSiteSettings();

  // Build social links from settings - these update when admin changes them
  const socialLinks = [
    { 
      name: 'Facebook', 
      icon: Facebook, 
      href: settings.social_facebook || 'https://www.facebook.com/profile.php?id=61584375982557',
      isWhatsApp: false 
    },
    { 
      name: 'Instagram', 
      icon: Instagram, 
      href: settings.social_instagram || 'https://www.instagram.com/almans.bd',
      isWhatsApp: false 
    },
    { 
      name: 'WhatsApp', 
      icon: null,
      href: `https://wa.me/${settings.social_whatsapp || '8801930278877'}`,
      isWhatsApp: true 
    },
  ];

  return (
    <footer className="bg-almans-chocolate text-almans-cream">
      {/* Brand Banner */}
      <div className="border-b border-almans-cream/10 overflow-hidden">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="py-12"
        >
          <h2
            className="font-display text-[12vw] md:text-[10vw] font-bold text-center tracking-widest text-almans-cream/6 whitespace-nowrap"
            style={{ letterSpacing: '0.2em' }}
          >
            ALMANS
          </h2>
        </motion.div>
      </div>

      {/* Main Footer Content */}
      <div className="container px-4 md:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8">
          {/* Logo & Description */}
          <div className="col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <WolfLogoIcon className="h-11 w-11" variant="light" />
              <span className="font-display text-xl font-bold tracking-wider">ALMANS</span>
            </div>
            <p className="text-almans-cream/60 text-sm mb-6">
              Where your vibes meet our vision. Premium fashion essentials for the modern individual.
            </p>
          </div>

          {/* Footer Links */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h3 className="font-semibold mb-4">{title}</h3>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-sm text-almans-cream/60 hover:text-almans-cream transition-colors"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Payment Methods & Follow Us Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12 pt-8 border-t border-almans-cream/10">
          {/* Payment Methods */}
          <div>
            <h3 className="font-semibold mb-4 uppercase tracking-wide text-sm">Payment Methods</h3>
            <div className="flex flex-wrap gap-3">
              {paymentMethods.map((method) => (
                <div
                  key={method.name}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${
                    method.available 
                      ? 'border-almans-cream/30 bg-almans-cream/5' 
                      : 'border-almans-cream/10 bg-almans-cream/5 opacity-50'
                  }`}
                >
                  <method.icon className="h-5 w-5" />
                  <span className="text-sm font-medium">{method.name}</span>
                  {!method.available && (
                    <span className="text-xs text-almans-cream/40">(Coming Soon)</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Follow Us - with names */}
          <div>
            <h3 className="font-semibold mb-4 uppercase tracking-wide text-sm">Follow Us</h3>
            <div className="flex flex-col gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-almans-cream/60 hover:text-almans-cream transition-colors group"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-almans-cream/20 group-hover:border-almans-cream group-hover:bg-almans-cream/10 transition-all">
                    {social.isWhatsApp ? (
                      <WhatsAppIcon className="h-5 w-5" />
                    ) : (
                      <social.icon className="h-5 w-5" />
                    )}
                  </div>
                  <span className="text-sm font-medium">{social.name}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-almans-cream/10">
        <div className="container px-4 md:px-8 py-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-almans-cream/60">
            ©2025 Almans. All rights reserved.
          </p>
          <a href="#" className="text-sm text-almans-cream/60 hover:text-almans-cream transition-colors">
            Privacy policy
          </a>
        </div>
      </div>
    </footer>
  );
}
