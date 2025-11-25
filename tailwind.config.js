/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Premium Black, White, Silver Palette
        primary: {
          50: '#f8f9fa',   // Almost white
          100: '#e9ecef',  // Very light silver
          200: '#dee2e6',  // Light silver
          300: '#ced4da',  // Silver
          400: '#adb5bd',  // Medium silver
          500: '#868e96',  // Dark silver
          600: '#495057',  // Very dark silver
          700: '#343a40',  // Almost black
          800: '#212529',  // Very dark
          900: '#1a1d20',  // Deeper black
          950: '#0d0f11',  // Pure black
        },
        accent: {
          DEFAULT: '#e5e7eb', // Silver
          light: '#f3f4f6',   // Light silver
          dark: '#9ca3af',    // Dark silver
        },
        glass: {
          white: 'rgba(255, 255, 255, 0.05)',
          silver: 'rgba(229, 231, 235, 0.05)',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Poppins', 'Inter', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-premium': 'linear-gradient(135deg, #000000 0%, #1a1d20 50%, #0d0f11 100%)',
        'gradient-silver': 'linear-gradient(135deg, #e5e7eb 0%, #9ca3af 100%)',
        'shimmer': 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(255, 255, 255, 0.05)',
        'glass-lg': '0 24px 48px 0 rgba(255, 255, 255, 0.08)',
        'premium': '0 20px 60px rgba(255, 255, 255, 0.1)',
        'inner-glass': 'inset 0 2px 8px rgba(255, 255, 255, 0.05)',
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'shimmer': 'shimmer 3s linear infinite',
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 20px rgba(229, 231, 235, 0.2)' },
          '100%': { boxShadow: '0 0 40px rgba(229, 231, 235, 0.4)' },
        },
      },
    },
  },
  plugins: [],
}