/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/features/**/*.{js,ts,jsx,tsx,mdx}',
    './src/shared/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Color system using CSS custom properties
      colors: {
        // Design System: Gradient Palette
        gradient: {
          1: 'var(--gradient-1-darkest)',  // #0c211a - Deep forest green
          2: 'var(--gradient-2-dark)',     // #48806a - Teal green
          3: 'var(--gradient-3-mid)',      // #477638 - Olive green
          4: 'var(--gradient-4-light)',    // #8a976b - Sage green
          5: 'var(--gradient-5-lightest)', // #f8eee4 - Cream
          darkest: 'var(--gradient-1-darkest)',
          dark: 'var(--gradient-2-dark)',
          mid: 'var(--gradient-3-mid)',
          light: 'var(--gradient-4-light)',
          lightest: 'var(--gradient-5-lightest)',
        },

        // Theme colors
        black: 'var(--color-black)',
        cream: 'var(--color-cream)',
        white: 'var(--color-white)',

        // Brand colors
        primary: {
          50: 'var(--color-primary-light)',
          500: 'var(--color-primary)',
          600: 'var(--color-primary-hover)',
          DEFAULT: 'var(--color-primary)',
          hover: 'var(--color-primary-hover)',
          light: 'var(--color-primary-light)',
        },
        
        // Gray scale
        gray: {
          50: 'var(--gray-50)',
          100: 'var(--gray-100)',
          200: 'var(--gray-200)',
          300: 'var(--gray-300)',
          400: 'var(--gray-400)',
          500: 'var(--gray-500)',
          600: 'var(--gray-600)',
          700: 'var(--gray-700)',
          800: 'var(--gray-800)',
          900: 'var(--gray-900)',
        },
        
        // Status colors
        success: {
          50: 'var(--color-success-light)',
          500: 'var(--color-success)',
          600: 'var(--color-success-hover)',
          DEFAULT: 'var(--color-success)',
        },
        warning: {
          50: 'var(--color-warning-light)',
          500: 'var(--color-warning)',
          600: 'var(--color-warning-hover)',
          DEFAULT: 'var(--color-warning)',
        },
        error: {
          50: 'var(--color-error-light)',
          500: 'var(--color-error)',
          600: 'var(--color-error-hover)',
          DEFAULT: 'var(--color-error)',
        },
        info: {
          50: 'var(--color-info-light)',
          500: 'var(--color-info)',
          600: 'var(--color-info-hover)',
          DEFAULT: 'var(--color-info)',
        },
        
        // Support colors (your brand palette)
        'support-blue': 'var(--support-blue)',
        'support-red': 'var(--support-red)',
        'support-brown': 'var(--support-brown)',
        'support-green': 'var(--support-green)',
        'support-yellow': 'var(--support-yellow)',
        
        // Semantic colors
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        'element-background': 'var(--element-background)',
        border: 'var(--border-color)',
        'border-hover': 'var(--border-color-hover)',
        
        // Background variants
        'bg-primary': 'var(--bg-primary)',
        'bg-secondary': 'var(--bg-secondary)',
        'bg-muted': 'var(--bg-muted)',
        'bg-accent': 'var(--bg-accent)',
        'bg-overlay': 'var(--bg-overlay)',
        
        // Text variants
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted': 'var(--text-muted)',
        'text-placeholder': 'var(--text-placeholder)',
        'text-inverse': 'var(--text-inverse)',
      },
      
      // Spacing system using CSS variables
      spacing: {
        'xs': 'var(--space-xs)',
        'sm': 'var(--space-sm)', 
        'md': 'var(--space-md)',
        'base': 'var(--space-base)',
        'lg': 'var(--space-lg)',
        'xl': 'var(--space-xl)',
        '2xl': 'var(--space-2xl)',
        '3xl': 'var(--space-3xl)',
        '4xl': 'var(--space-4xl)',
        
        // Layout-specific
        'navbar': 'var(--navbar-height)',
        'sidebar': 'var(--sidebar-width)',
        'sidebar-collapsed': 'var(--sidebar-collapsed-width)',
        'right-menu': 'var(--right-menu-width)',
      },
      
      // Border radius using CSS variables
      borderRadius: {
        'none': 'var(--radius-none)',
        'sm': 'var(--radius-sm)',
        'base': 'var(--radius-base)', 
        'md': 'var(--radius-md)',
        'lg': 'var(--radius-lg)',
        'xl': 'var(--radius-xl)',
        'round': 'var(--radius-round)',
        'full': 'var(--radius-full)',
      },
      
      // Shadow system
      boxShadow: {
        'xs': 'var(--shadow-xs)',
        'sm': 'var(--shadow-sm)',
        'base': 'var(--shadow-base)',
        'md': 'var(--shadow-md)', 
        'lg': 'var(--shadow-lg)',
        'xl': 'var(--shadow-xl)',
        '2xl': 'var(--shadow-2xl)',
        'inner': 'var(--shadow-inner)',
      },
      
      // Typography system
      fontSize: {
        'xs': ['var(--text-xs)', { lineHeight: 'var(--line-height-tight)' }],
        'sm': ['var(--text-sm)', { lineHeight: 'var(--line-height-normal)' }],
        'base': ['var(--text-base)', { lineHeight: 'var(--line-height-normal)' }],
        'lg': ['var(--text-lg)', { lineHeight: 'var(--line-height-normal)' }],
        'xl': ['var(--text-xl)', { lineHeight: 'var(--line-height-tight)' }],
        '2xl': ['var(--text-2xl)', { lineHeight: 'var(--line-height-tight)' }],
        '3xl': ['var(--text-3xl)', { lineHeight: 'var(--line-height-tight)' }],
        '4xl': ['var(--text-4xl)', { lineHeight: 'var(--line-height-tight)' }],
      },
      
      // Font weights
      fontWeight: {
        light: 'var(--font-weight-light)',
        normal: 'var(--font-weight-normal)',
        medium: 'var(--font-weight-medium)',
        semibold: 'var(--font-weight-semibold)',
        bold: 'var(--font-weight-bold)',
      },
      
      // Container system
      maxWidth: {
        'xs': 'var(--container-xs)',
        'sm': 'var(--container-sm)', 
        'md': 'var(--container-md)',
        'lg': 'var(--container-lg)',
        'xl': 'var(--container-xl)',
        '2xl': 'var(--container-2xl)',
      },
      
      // Z-index scale
      zIndex: {
        'base': 'var(--z-base)',
        'elevated': 'var(--z-elevated)',
        'sticky': 'var(--z-sticky)',
        'fixed': 'var(--z-fixed)',
        'modal': 'var(--z-modal)',
        'popover': 'var(--z-popover)',
        'tooltip': 'var(--z-tooltip)',
      },
      
      // Transition system
      transitionDuration: {
        'fast': 'var(--duration-fast)',
        'normal': 'var(--duration-normal)', 
        'slow': 'var(--duration-slow)',
      },
      
      transitionTimingFunction: {
        'ease-linear': 'var(--ease-linear)',
        'ease-in': 'var(--ease-in)',
        'ease-out': 'var(--ease-out)',
        'ease-in-out': 'var(--ease-in-out)',
      },
      
      // Height system for components
      height: {
        'button-sm': 'var(--button-height-sm)',
        'button-base': 'var(--button-height-base)',
        'button-lg': 'var(--button-height-lg)',
        'input': 'var(--input-height)',
        'navbar': 'var(--navbar-height)',
      },
      
      // Border widths
      borderWidth: {
        'thin': 'var(--border-width-thin)',
        'normal': 'var(--border-width-normal)',
        'thick': 'var(--border-width-thick)',
        'heavy': 'var(--border-width-heavy)',
      },
      
      // Backdrop blur for glass effects
      backdropBlur: {
        'glass': 'var(--backdrop-blur)',
      },

      // Animation system for modals
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'scale-in': {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
        'scale-in': 'scale-in 0.2s ease-out',
      },
    },
  },
  plugins: [],
};